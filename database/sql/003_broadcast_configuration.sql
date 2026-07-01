-- ============================================================
-- TransTrak Broadcast Configuration
-- Supabase Realtime Broadcast Model
-- ============================================================

-- This script uses Supabase Broadcast instead of Postgres Changes.
-- Application tables are NOT added to the supabase_realtime publication.
-- Database triggers send clean app-specific events using realtime.send().

-- Topic examples:
-- user:<user_id>
-- request:<request_id>
-- driver:<driver_profile_id>
-- report:<report_id>
-- drivers:available
-- admin:drivers
-- admin:reports

-- ============================================================
-- REALTIME CHANNEL MEMBERSHIP TABLE
-- ============================================================

create table if not exists public.realtime_channel_members (
  topic text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  can_read boolean not null default true,
  can_write boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (topic, user_id)
);

alter table public.realtime_channel_members enable row level security;

grant select on public.realtime_channel_members to authenticated;

drop policy if exists "Users can read their own realtime channel memberships"
on public.realtime_channel_members;

create policy "Users can read their own realtime channel memberships"
on public.realtime_channel_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin(auth.uid())
);

-- ============================================================
-- HELPER: ADD CHANNEL MEMBER
-- ============================================================

create or replace function public.add_realtime_channel_member(
  p_topic text,
  p_user_id uuid,
  p_can_write boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_topic is null or p_user_id is null then
    return;
  end if;

  insert into public.realtime_channel_members (
    topic,
    user_id,
    can_read,
    can_write
  )
  values (
    p_topic,
    p_user_id,
    true,
    p_can_write
  )
  on conflict (topic, user_id)
  do update set
    can_read = true,
    can_write = public.realtime_channel_members.can_write or excluded.can_write;
end;
$$;

-- ============================================================
-- REALTIME MESSAGES AUTHORIZATION
-- ============================================================

alter table realtime.messages enable row level security;

drop policy if exists "TransTrak users can receive allowed broadcast messages"
on realtime.messages;

create policy "TransTrak users can receive allowed broadcast messages"
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and (
    -- Public-to-authenticated app topic for available driver updates.
    (select realtime.topic()) = 'drivers:available'

    -- Admin-only channels.
    or (
      (select realtime.topic()) like 'admin:%'
      and public.is_admin(auth.uid())
    )

    -- Membership-based private channels.
    or exists (
      select 1
      from public.realtime_channel_members rcm
      where rcm.topic = (select realtime.topic())
        and rcm.user_id = auth.uid()
        and rcm.can_read = true
    )
  )
);

drop policy if exists "TransTrak users can send writable broadcast messages"
on realtime.messages;

create policy "TransTrak users can send writable broadcast messages"
on realtime.messages
for insert
to authenticated
with check (
  extension = 'broadcast'
  and exists (
    select 1
    from public.realtime_channel_members rcm
    where rcm.topic = (select realtime.topic())
      and rcm.user_id = auth.uid()
      and rcm.can_write = true
  )
);

-- ============================================================
-- PROFILE BROADCAST SETUP
-- Adds each user to their private user channel.
-- ============================================================

create or replace function public.handle_profile_broadcast_membership()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
begin
  perform public.add_realtime_channel_member(
    'user:' || new.id::text,
    new.id,
    false
  );

  return null;
end;
$$;

drop trigger if exists handle_profile_broadcast_membership_trigger
on public.profiles;

create trigger handle_profile_broadcast_membership_trigger
after insert
on public.profiles
for each row
execute function public.handle_profile_broadcast_membership();

-- ============================================================
-- DRIVER PROFILE BROADCAST
-- Broadcasts driver availability/location changes.
-- ============================================================

create or replace function public.broadcast_driver_profile_event()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  v_driver_topic text;
  v_event text;
  v_payload jsonb;
begin
  v_driver_topic := 'driver:' || new.id::text;

  perform public.add_realtime_channel_member(
    v_driver_topic,
    new.profile_id,
    false
  );

  v_event := case
    when TG_OP = 'INSERT' then 'driver.created'
    else 'driver.updated'
  end;

  v_payload := jsonb_build_object(
    'driver_profile_id', new.id,
    'profile_id', new.profile_id,
    'availability_status_id', new.availability_status_id,
    'verification_status_id', new.verification_status_id,
    'current_latitude', new.current_latitude,
    'current_longitude', new.current_longitude,
    'last_location_at', new.last_location_at,
    'updated_at', new.updated_at
  );

  -- Private driver channel.
  perform realtime.send(
    v_payload,
    v_event,
    v_driver_topic,
    true
  );

  -- Authenticated passengers can listen to available driver updates.
  -- Keep this payload minimal.
  if new.verification_status_id = 2000 then
    perform realtime.send(
      v_payload,
      'driver.available.updated',
      'drivers:available',
      true
    );
  end if;

  -- Admin monitoring channel.
  perform realtime.send(
    v_payload,
    v_event,
    'admin:drivers',
    true
  );

  return null;
end;
$$;

drop trigger if exists broadcast_driver_profile_event_trigger
on public.driver_profiles;

create trigger broadcast_driver_profile_event_trigger
after insert or update
on public.driver_profiles
for each row
execute function public.broadcast_driver_profile_event();

-- ============================================================
-- DRIVER ROUTE BROADCAST
-- ============================================================

create or replace function public.broadcast_driver_route_event()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  v_driver_user_id uuid;
  v_driver_topic text;
  v_event text;
  v_payload jsonb;
begin
  select dp.profile_id
  into v_driver_user_id
  from public.driver_profiles dp
  where dp.id = new.driver_profile_id;

  v_driver_topic := 'driver:' || new.driver_profile_id::text;

  perform public.add_realtime_channel_member(
    v_driver_topic,
    v_driver_user_id,
    false
  );

  v_event := case
    when TG_OP = 'INSERT' then 'route.created'
    else 'route.updated'
  end;

  v_payload := jsonb_build_object(
    'driver_route_id', new.id,
    'driver_profile_id', new.driver_profile_id,
    'start_name', new.start_name,
    'destination_name', new.destination_name,
    'start_latitude', new.start_latitude,
    'start_longitude', new.start_longitude,
    'destination_latitude', new.destination_latitude,
    'destination_longitude', new.destination_longitude,
    'route_status_id', new.route_status_id,
    'started_at', new.started_at,
    'ended_at', new.ended_at
  );

  perform realtime.send(
    v_payload,
    v_event,
    v_driver_topic,
    true
  );

  perform realtime.send(
    v_payload,
    v_event,
    'drivers:available',
    true
  );

  perform realtime.send(
    v_payload,
    v_event,
    'admin:drivers',
    true
  );

  return null;
end;
$$;

drop trigger if exists broadcast_driver_route_event_trigger
on public.driver_routes;

create trigger broadcast_driver_route_event_trigger
after insert or update
on public.driver_routes
for each row
execute function public.broadcast_driver_route_event();

-- ============================================================
-- TRANSPORT REQUEST BROADCAST
-- ============================================================

create or replace function public.broadcast_transport_request_event()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  v_request_topic text;
  v_driver_user_id uuid;
  v_event text;
  v_payload jsonb;
begin
  v_request_topic := 'request:' || new.id::text;

  perform public.add_realtime_channel_member(
    v_request_topic,
    new.passenger_id,
    false
  );

  perform public.add_realtime_channel_member(
    'user:' || new.passenger_id::text,
    new.passenger_id,
    false
  );

  if new.driver_profile_id is not null then
    select dp.profile_id
    into v_driver_user_id
    from public.driver_profiles dp
    where dp.id = new.driver_profile_id;

    perform public.add_realtime_channel_member(
      v_request_topic,
      v_driver_user_id,
      false
    );

    perform public.add_realtime_channel_member(
      'user:' || v_driver_user_id::text,
      v_driver_user_id,
      false
    );
  end if;

  v_event := case
    when TG_OP = 'INSERT' then 'request.created'
    else 'request.updated'
  end;

  v_payload := jsonb_build_object(
    'transport_request_id', new.id,
    'passenger_id', new.passenger_id,
    'driver_profile_id', new.driver_profile_id,
    'pickup_name', new.pickup_name,
    'destination_name', new.destination_name,
    'request_status_id', new.request_status_id,
    'requested_at', new.requested_at,
    'responded_at', new.responded_at,
    'completed_at', new.completed_at,
    'cancelled_at', new.cancelled_at
  );

  -- Request-specific channel for passenger and assigned driver.
  perform realtime.send(
    v_payload,
    v_event,
    v_request_topic,
    true
  );

  -- Personal passenger channel.
  perform realtime.send(
    v_payload,
    v_event,
    'user:' || new.passenger_id::text,
    true
  );

  -- Personal driver channel, if assigned.
  if v_driver_user_id is not null then
    perform realtime.send(
      v_payload,
      v_event,
      'user:' || v_driver_user_id::text,
      true
    );
  end if;

  return null;
end;
$$;

drop trigger if exists broadcast_transport_request_event_trigger
on public.transport_requests;

create trigger broadcast_transport_request_event_trigger
after insert or update
on public.transport_requests
for each row
execute function public.broadcast_transport_request_event();

-- ============================================================
-- ROUTE MATCH BROADCAST
-- ============================================================

create or replace function public.broadcast_route_match_event()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  v_request_topic text;
  v_event text;
  v_payload jsonb;
begin
  v_request_topic := 'request:' || new.request_id::text;

  v_event := case
    when TG_OP = 'INSERT' then 'route_match.created'
    else 'route_match.updated'
  end;

  v_payload := jsonb_build_object(
    'route_match_id', new.id,
    'request_id', new.request_id,
    'driver_profile_id', new.driver_profile_id,
    'driver_route_id', new.driver_route_id,
    'distance_to_pickup_m', new.distance_to_pickup_m,
    'route_alignment_score', new.route_alignment_score,
    'is_selected', new.is_selected
  );

  perform realtime.send(
    v_payload,
    v_event,
    v_request_topic,
    true
  );

  return null;
end;
$$;

drop trigger if exists broadcast_route_match_event_trigger
on public.route_matches;

create trigger broadcast_route_match_event_trigger
after insert or update
on public.route_matches
for each row
execute function public.broadcast_route_match_event();

-- ============================================================
-- LOCATION UPDATE BROADCAST
-- Broadcasts live driver movement to the active request channel.
-- ============================================================

create or replace function public.broadcast_location_update_event()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  v_request_topic text;
  v_driver_topic text;
  v_payload jsonb;
begin
  v_payload := jsonb_build_object(
    'location_update_id', new.id,
    'driver_profile_id', new.driver_profile_id,
    'transport_request_id', new.transport_request_id,
    'latitude', new.latitude,
    'longitude', new.longitude,
    'speed', new.speed,
    'heading', new.heading,
    'recorded_at', new.recorded_at
  );

  v_driver_topic := 'driver:' || new.driver_profile_id::text;

  perform realtime.send(
    v_payload,
    'location.updated',
    v_driver_topic,
    true
  );

  if new.transport_request_id is not null then
    v_request_topic := 'request:' || new.transport_request_id::text;

    perform realtime.send(
      v_payload,
      'location.updated',
      v_request_topic,
      true
    );
  end if;

  return null;
end;
$$;

drop trigger if exists broadcast_location_update_event_trigger
on public.location_updates;

create trigger broadcast_location_update_event_trigger
after insert
on public.location_updates
for each row
execute function public.broadcast_location_update_event();

-- ============================================================
-- REPORT BROADCAST
-- ============================================================

create or replace function public.broadcast_report_event()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  v_report_topic text;
  v_event text;
  v_payload jsonb;
begin
  v_report_topic := 'report:' || new.id::text;

  perform public.add_realtime_channel_member(
    v_report_topic,
    new.reporter_id,
    false
  );

  if new.reported_user_id is not null then
    perform public.add_realtime_channel_member(
      v_report_topic,
      new.reported_user_id,
      false
    );
  end if;

  v_event := case
    when TG_OP = 'INSERT' then 'report.created'
    else 'report.updated'
  end;

  v_payload := jsonb_build_object(
    'report_id', new.id,
    'reporter_id', new.reporter_id,
    'reported_user_id', new.reported_user_id,
    'transport_request_id', new.transport_request_id,
    'report_type_id', new.report_type_id,
    'report_status_id', new.report_status_id,
    'title', new.title,
    'resolved_by', new.resolved_by,
    'resolved_at', new.resolved_at
  );

  perform realtime.send(
    v_payload,
    v_event,
    v_report_topic,
    true
  );

  perform realtime.send(
    v_payload,
    v_event,
    'admin:reports',
    true
  );

  return null;
end;
$$;

drop trigger if exists broadcast_report_event_trigger
on public.reports;

create trigger broadcast_report_event_trigger
after insert or update
on public.reports
for each row
execute function public.broadcast_report_event();

-- ============================================================
-- NOTIFICATION BROADCAST
-- ============================================================

create or replace function public.broadcast_notification_event()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  v_user_topic text;
  v_event text;
  v_payload jsonb;
begin
  v_user_topic := 'user:' || new.recipient_id::text;

  perform public.add_realtime_channel_member(
    v_user_topic,
    new.recipient_id,
    false
  );

  v_event := case
    when TG_OP = 'INSERT' then 'notification.created'
    else 'notification.updated'
  end;

  v_payload := jsonb_build_object(
    'notification_id', new.id,
    'recipient_id', new.recipient_id,
    'notification_type_id', new.notification_type_id,
    'title', new.title,
    'body', new.body,
    'related_request_id', new.related_request_id,
    'is_read', new.is_read,
    'read_at', new.read_at,
    'created_at', new.created_at
  );

  perform realtime.send(
    v_payload,
    v_event,
    v_user_topic,
    true
  );

  return null;
end;
$$;

drop trigger if exists broadcast_notification_event_trigger
on public.notifications;

create trigger broadcast_notification_event_trigger
after insert or update
on public.notifications
for each row
execute function public.broadcast_notification_event();

-- ============================================================
-- END OF BROADCAST CONFIGURATION
-- ============================================================