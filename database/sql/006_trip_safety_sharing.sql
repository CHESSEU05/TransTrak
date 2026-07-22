-- ============================================================
-- TransTrak Trip Safety Sharing
-- ============================================================
-- Apply this after 001-005. It supports temporary public trip links,
-- trusted-contact safety reports, and audit events for shared trips.

create extension if not exists pgcrypto;

create table if not exists public.trip_share_links (
  id uuid primary key default gen_random_uuid(),
  transport_request_id uuid not null references public.transport_requests(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  access_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.external_trip_reports (
  id uuid primary key default gen_random_uuid(),
  trip_share_link_id uuid not null references public.trip_share_links(id) on delete cascade,
  transport_request_id uuid not null references public.transport_requests(id) on delete cascade,
  reporter_name text not null,
  reporter_phone text not null,
  reporter_relationship text,
  concern_type text not null,
  description text not null,
  report_status_id smallint not null default 1000 references public.report_statuses(id),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_share_events (
  id uuid primary key default gen_random_uuid(),
  trip_share_link_id uuid references public.trip_share_links(id) on delete cascade,
  transport_request_id uuid references public.transport_requests(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_trip_share_links_request_id
on public.trip_share_links(transport_request_id);

create index if not exists idx_trip_share_links_token_hash
on public.trip_share_links(token_hash);

create index if not exists idx_trip_share_links_expires_at
on public.trip_share_links(expires_at);

create index if not exists idx_external_trip_reports_request_id
on public.external_trip_reports(transport_request_id);

create index if not exists idx_external_trip_reports_status_id
on public.external_trip_reports(report_status_id);

create index if not exists idx_external_trip_reports_created_at
on public.external_trip_reports(created_at);

create index if not exists idx_trip_share_events_request_id
on public.trip_share_events(transport_request_id);

create index if not exists idx_trip_share_events_created_at
on public.trip_share_events(created_at);

drop trigger if exists set_trip_share_links_updated_at on public.trip_share_links;
create trigger set_trip_share_links_updated_at
before update on public.trip_share_links
for each row
execute function public.set_updated_at();

drop trigger if exists set_external_trip_reports_updated_at on public.external_trip_reports;
create trigger set_external_trip_reports_updated_at
before update on public.external_trip_reports
for each row
execute function public.set_updated_at();

alter table public.trip_share_links enable row level security;
alter table public.external_trip_reports enable row level security;
alter table public.trip_share_events enable row level security;

drop policy if exists "Passengers drivers and admins can read trip share links"
on public.trip_share_links;
create policy "Passengers drivers and admins can read trip share links"
on public.trip_share_links
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or created_by = auth.uid()
  or exists (
    select 1
    from public.transport_requests tr
    join public.driver_profiles dp
      on dp.id = tr.driver_profile_id
    where tr.id = trip_share_links.transport_request_id
      and dp.profile_id = auth.uid()
  )
);

drop policy if exists "Passengers and admins can revoke trip share links"
on public.trip_share_links;
create policy "Passengers and admins can revoke trip share links"
on public.trip_share_links
for update
to authenticated
using (
  public.is_admin(auth.uid())
  or created_by = auth.uid()
)
with check (
  public.is_admin(auth.uid())
  or created_by = auth.uid()
);

drop policy if exists "Admins can read external trip reports"
on public.external_trip_reports;
create policy "Admins can read external trip reports"
on public.external_trip_reports
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update external trip reports"
on public.external_trip_reports;
create policy "Admins can update external trip reports"
on public.external_trip_reports
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can read trip share events"
on public.trip_share_events;
create policy "Admins can read trip share events"
on public.trip_share_events
for select
to authenticated
using (public.is_admin(auth.uid()));

create or replace function public.hash_trip_share_token(p_token text)
returns text
language sql
immutable
as $$
  select encode(digest(p_token, 'sha256'), 'hex');
$$;

create or replace function public.trip_share_public_token()
returns text
language sql
volatile
as $$
  select replace(replace(rtrim(encode(gen_random_bytes(32), 'base64'), '='), '+', '-'), '/', '_');
$$;

create or replace function public.create_trip_share_link(
  p_request_id uuid,
  p_expires_in_hours integer default 72
)
returns table (
  id uuid,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.transport_requests%rowtype;
  v_link_id uuid;
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz;
  v_hours integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to create a trip safety link.';
  end if;

  select *
  into v_request
  from public.transport_requests tr
  where tr.id = p_request_id;

  if not found then
    raise exception 'Transport request not found.';
  end if;

  if v_request.passenger_id <> auth.uid() then
    raise exception 'Only the passenger can share this trip.';
  end if;

  if v_request.request_status_id <> 2000 then
    raise exception 'Only accepted trips can be shared for safety tracking.';
  end if;

  v_hours := least(greatest(coalesce(p_expires_in_hours, 72), 1), 72);
  v_token := public.trip_share_public_token();
  v_token_hash := public.hash_trip_share_token(v_token);
  v_expires_at := now() + make_interval(hours => v_hours);

  insert into public.trip_share_links (
    transport_request_id,
    created_by,
    token_hash,
    expires_at
  )
  values (
    p_request_id,
    auth.uid(),
    v_token_hash,
    v_expires_at
  )
  returning trip_share_links.id, trip_share_links.expires_at
  into v_link_id, expires_at;

  insert into public.trip_share_events (
    trip_share_link_id,
    transport_request_id,
    event_type,
    metadata
  )
  values (
    v_link_id,
    p_request_id,
    'link_created',
    jsonb_build_object('created_by', auth.uid(), 'expires_at', expires_at)
  );

  id := v_link_id;
  token := v_token;
  return next;
end;
$$;

create or replace function public.revoke_trip_share_links(p_request_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to revoke trip safety links.';
  end if;

  update public.trip_share_links tsl
  set revoked_at = now()
  where tsl.transport_request_id = p_request_id
    and tsl.revoked_at is null
    and (
      tsl.created_by = auth.uid()
      or public.is_admin(auth.uid())
    );

  get diagnostics v_count = row_count;

  if v_count > 0 then
    insert into public.trip_share_events (
      transport_request_id,
      event_type,
      metadata
    )
    values (
      p_request_id,
      'links_revoked',
      jsonb_build_object('revoked_by', auth.uid(), 'count', v_count)
    );
  end if;

  return v_count;
end;
$$;

create or replace function public.get_shared_trip(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_hash text;
  v_trip record;
  v_latest_latitude double precision;
  v_latest_longitude double precision;
  v_latest_recorded_at timestamptz;
  v_show_live_location boolean;
begin
  if length(coalesce(trim(p_token), '')) < 32 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  v_token_hash := public.hash_trip_share_token(trim(p_token));

  select
    tsl.id as share_link_id,
    tsl.expires_at,
    tsl.revoked_at,
    tr.id as transport_request_id,
    tr.pickup_name,
    tr.destination_name,
    tr.pickup_latitude,
    tr.pickup_longitude,
    tr.destination_latitude,
    tr.destination_longitude,
    tr.request_status_id,
    tr.requested_at,
    tr.responded_at,
    tr.completed_at,
    tr.cancelled_at,
    passenger.full_name as passenger_name,
    passenger.phone as passenger_phone,
    dp.id as driver_profile_id,
    dp.current_latitude as driver_current_latitude,
    dp.current_longitude as driver_current_longitude,
    dp.last_location_at as driver_last_location_at,
    driver_user.full_name as driver_name,
    driver_user.phone as driver_phone,
    v.vehicle_type_id,
    v.plate_number,
    v.model as vehicle_model
  into v_trip
  from public.trip_share_links tsl
  join public.transport_requests tr
    on tr.id = tsl.transport_request_id
  join public.profiles passenger
    on passenger.id = tr.passenger_id
  left join public.driver_profiles dp
    on dp.id = tr.driver_profile_id
  left join public.profiles driver_user
    on driver_user.id = dp.profile_id
  left join lateral (
    select *
    from public.vehicles vehicle
    where vehicle.driver_profile_id = dp.id
    order by vehicle.created_at desc
    limit 1
  ) v on true
  where tsl.token_hash = v_token_hash
    and tsl.revoked_at is null
    and tsl.expires_at > now()
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'expired_or_revoked');
  end if;

  update public.trip_share_links
  set
    last_accessed_at = now(),
    access_count = access_count + 1
  where trip_share_links.id = v_trip.share_link_id;

  insert into public.trip_share_events (
    trip_share_link_id,
    transport_request_id,
    event_type,
    metadata
  )
  values (
    v_trip.share_link_id,
    v_trip.transport_request_id,
    'link_viewed',
    jsonb_build_object('viewed_at', now())
  );

  select latitude, longitude, recorded_at
  into v_latest_latitude, v_latest_longitude, v_latest_recorded_at
  from public.location_updates
  where driver_profile_id = v_trip.driver_profile_id
    and transport_request_id = v_trip.transport_request_id
  order by recorded_at desc
  limit 1;

  v_show_live_location :=
    v_trip.request_status_id = 2000
    and coalesce(v_latest_recorded_at, v_trip.driver_last_location_at) >= now() - interval '20 minutes';

  return jsonb_build_object(
    'ok', true,
    'shareLinkId', v_trip.share_link_id,
    'expiresAt', v_trip.expires_at,
    'trip', jsonb_build_object(
      'id', v_trip.transport_request_id,
      'statusId', v_trip.request_status_id,
      'pickupName', coalesce(v_trip.pickup_name, 'Pickup point'),
      'destinationName', coalesce(v_trip.destination_name, 'Destination'),
      'requestedAt', v_trip.requested_at,
      'respondedAt', v_trip.responded_at,
      'completedAt', v_trip.completed_at,
      'cancelledAt', v_trip.cancelled_at,
      'pickup', jsonb_build_object(
        'latitude', v_trip.pickup_latitude,
        'longitude', v_trip.pickup_longitude
      ),
      'destination', jsonb_build_object(
        'latitude', v_trip.destination_latitude,
        'longitude', v_trip.destination_longitude
      )
    ),
    'passenger', jsonb_build_object(
      'displayName', split_part(coalesce(v_trip.passenger_name, 'Passenger'), ' ', 1)
    ),
    'driver', jsonb_build_object(
      'name', coalesce(v_trip.driver_name, 'Assigned driver'),
      'phone', v_trip.driver_phone,
      'vehicleTypeId', v_trip.vehicle_type_id,
      'vehicleLabel',
        case
          when v_trip.vehicle_type_id = 2000 then 'Motorbike'
          else 'Yellow Taxi'
        end,
      'plateNumber', v_trip.plate_number,
      'model', v_trip.vehicle_model,
      'latestLocation',
        case
          when v_show_live_location then jsonb_build_object(
            'latitude', coalesce(v_latest_latitude, v_trip.driver_current_latitude),
            'longitude', coalesce(v_latest_longitude, v_trip.driver_current_longitude),
            'recordedAt', coalesce(v_latest_recorded_at, v_trip.driver_last_location_at)
          )
          else null
        end
    ),
    'privacyNotice', 'This temporary link shows limited trip safety information shared by the passenger. It expires automatically.'
  );
end;
$$;

create or replace function public.submit_shared_trip_report(
  p_token text,
  p_reporter_name text,
  p_reporter_phone text,
  p_reporter_relationship text,
  p_concern_type text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_hash text;
  v_link record;
  v_recent_count integer;
  v_report_id uuid;
  v_name text;
  v_phone text;
  v_relationship text;
  v_concern_type text;
  v_description text;
begin
  v_name := trim(coalesce(p_reporter_name, ''));
  v_phone := trim(coalesce(p_reporter_phone, ''));
  v_relationship := nullif(trim(coalesce(p_reporter_relationship, '')), '');
  v_concern_type := trim(coalesce(p_concern_type, ''));
  v_description := trim(coalesce(p_description, ''));

  if length(coalesce(trim(p_token), '')) < 32 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  if length(v_name) < 2 or length(v_phone) < 6 or length(v_concern_type) < 3 or length(v_description) < 15 then
    return jsonb_build_object('ok', false, 'error', 'missing_required_fields');
  end if;

  v_token_hash := public.hash_trip_share_token(trim(p_token));

  select tsl.id, tsl.transport_request_id
  into v_link
  from public.trip_share_links tsl
  where tsl.token_hash = v_token_hash
    and tsl.revoked_at is null
    and tsl.expires_at > now()
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'expired_or_revoked');
  end if;

  select count(*)
  into v_recent_count
  from public.external_trip_reports
  where external_trip_reports.trip_share_link_id = v_link.id
    and external_trip_reports.created_at >= now() - interval '30 minutes';

  if v_recent_count >= 3 then
    return jsonb_build_object('ok', false, 'error', 'too_many_reports');
  end if;

  insert into public.external_trip_reports (
    trip_share_link_id,
    transport_request_id,
    reporter_name,
    reporter_phone,
    reporter_relationship,
    concern_type,
    description
  )
  values (
    v_link.id,
    v_link.transport_request_id,
    v_name,
    v_phone,
    v_relationship,
    v_concern_type,
    v_description
  )
  returning external_trip_reports.id into v_report_id;

  insert into public.trip_share_events (
    trip_share_link_id,
    transport_request_id,
    event_type,
    metadata
  )
  values (
    v_link.id,
    v_link.transport_request_id,
    'external_report_submitted',
    jsonb_build_object(
      'report_id', v_report_id,
      'concern_type', v_concern_type,
      'reporter_relationship', v_relationship
    )
  );

  insert into public.notifications (
    recipient_id,
    notification_type_id,
    title,
    body,
    related_request_id
  )
  select
    p.id,
    5000,
    'External trip safety report',
    v_concern_type || ': ' || left(v_description, 120),
    v_link.transport_request_id
  from public.profiles p
  where p.role_id = 3000
    and p.account_status_id = 1000;

  return jsonb_build_object('ok', true, 'reportId', v_report_id);
end;
$$;

grant execute on function public.create_trip_share_link(uuid, integer) to authenticated;
grant execute on function public.revoke_trip_share_links(uuid) to authenticated;
grant execute on function public.get_shared_trip(text) to anon, authenticated;
grant execute on function public.submit_shared_trip_report(text, text, text, text, text, text) to anon, authenticated;
