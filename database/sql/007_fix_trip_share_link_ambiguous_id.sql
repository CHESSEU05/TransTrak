-- ============================================================
-- TransTrak Trip Safety Sharing Hotfix
-- ============================================================
-- Fixes "column reference id is ambiguous" when creating a
-- passenger trip safety share link.

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

grant execute on function public.create_trip_share_link(uuid, integer) to authenticated;
