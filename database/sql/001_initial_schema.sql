-- ============================================================
-- TransTrak Initial Database Schema
-- PostgreSQL + PostGIS
-- ============================================================

-- Enable required extensions
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ============================================================
-- Helper function: automatically update updated_at columns
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- LOOKUP TABLES
-- ============================================================

create table if not exists public.user_roles (
  id smallint primary key,
  code text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.account_statuses (
  id smallint primary key,
  code text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.availability_statuses (
  id smallint primary key,
  code text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_statuses (
  id smallint primary key,
  code text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_types (
  id smallint primary key,
  code text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_statuses (
  id smallint primary key,
  code text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.request_statuses (
  id smallint primary key,
  code text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.route_statuses (
  id smallint primary key,
  code text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.report_types (
  id smallint primary key,
  code text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.report_statuses (
  id smallint primary key,
  code text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_types (
  id smallint primary key,
  code text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SEED LOOKUP DATA
-- ============================================================

insert into public.user_roles (id, code, name, description) values
(1000, 'PASSENGER', 'Passenger', 'Regular passenger user'),
(2000, 'DRIVER', 'Driver', 'Taxi or bike driver'),
(3000, 'ADMIN', 'Administrator', 'System administrator')
on conflict (id) do nothing;

insert into public.account_statuses (id, code, name, description) values
(1000, 'ACTIVE', 'Active', 'Account is active'),
(2000, 'INACTIVE', 'Inactive', 'Account is inactive'),
(3000, 'SUSPENDED', 'Suspended', 'Account has been suspended'),
(4000, 'BLOCKED', 'Blocked', 'Account has been blocked')
on conflict (id) do nothing;

insert into public.availability_statuses (id, code, name, description) values
(1000, 'ONLINE', 'Online', 'Driver is available'),
(2000, 'OFFLINE', 'Offline', 'Driver is not available'),
(3000, 'BUSY', 'Busy', 'Driver is currently handling a request')
on conflict (id) do nothing;

insert into public.verification_statuses (id, code, name, description) values
(1000, 'PENDING', 'Pending', 'Verification is pending'),
(2000, 'APPROVED', 'Approved', 'Verification has been approved'),
(3000, 'REJECTED', 'Rejected', 'Verification has been rejected')
on conflict (id) do nothing;

insert into public.vehicle_types (id, code, name, description) values
(1000, 'TAXI', 'Taxi', 'Local taxi transport'),
(2000, 'BIKE', 'Bike', 'Bike or okada transport')
on conflict (id) do nothing;

insert into public.vehicle_statuses (id, code, name, description) values
(1000, 'ACTIVE', 'Active', 'Vehicle is active'),
(2000, 'INACTIVE', 'Inactive', 'Vehicle is inactive')
on conflict (id) do nothing;

insert into public.request_statuses (id, code, name, description) values
(1000, 'PENDING', 'Pending', 'Request is waiting for driver response'),
(2000, 'ACCEPTED', 'Accepted', 'Request has been accepted by driver'),
(3000, 'REJECTED', 'Rejected', 'Request has been rejected by driver'),
(4000, 'CANCELLED', 'Cancelled', 'Request has been cancelled'),
(5000, 'COMPLETED', 'Completed', 'Request has been completed')
on conflict (id) do nothing;

insert into public.route_statuses (id, code, name, description) values
(1000, 'ACTIVE', 'Active', 'Route is currently active'),
(2000, 'CLOSED', 'Closed', 'Route has been closed'),
(3000, 'CANCELLED', 'Cancelled', 'Route has been cancelled')
on conflict (id) do nothing;

insert into public.report_types (id, code, name, description) values
(1000, 'SAFETY', 'Safety', 'Safety-related report'),
(2000, 'BEHAVIOUR', 'Behaviour', 'Behaviour-related report'),
(3000, 'WRONG_INFORMATION', 'Wrong Information', 'Incorrect driver or transport information'),
(4000, 'OTHER', 'Other', 'Other type of report')
on conflict (id) do nothing;

insert into public.report_statuses (id, code, name, description) values
(1000, 'PENDING', 'Pending', 'Report is pending review'),
(2000, 'IN_REVIEW', 'In Review', 'Report is currently under review'),
(3000, 'RESOLVED', 'Resolved', 'Report has been resolved'),
(4000, 'DISMISSED', 'Dismissed', 'Report has been dismissed')
on conflict (id) do nothing;

insert into public.notification_types (id, code, name, description) values
(1000, 'REQUEST_RECEIVED', 'Request Received', 'Driver received a passenger request'),
(2000, 'REQUEST_ACCEPTED', 'Request Accepted', 'Passenger request was accepted'),
(3000, 'REQUEST_REJECTED', 'Request Rejected', 'Passenger request was rejected'),
(4000, 'LOCATION_UPDATE', 'Location Update', 'Location update notification'),
(5000, 'REPORT_UPDATE', 'Report Update', 'Report status update')
on conflict (id) do nothing;

-- ============================================================
-- MAIN TABLES
-- ============================================================

-- Supabase already has auth.users.
-- Therefore, application user details are stored in public.profiles.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  city text,
  avatar_url text,
  role_id smallint not null references public.user_roles(id),
  account_status_id smallint not null default 1000 references public.account_statuses(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.driver_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  availability_status_id smallint not null default 2000 references public.availability_statuses(id),
  verification_status_id smallint not null default 1000 references public.verification_statuses(id),
  current_latitude double precision,
  current_longitude double precision,
  current_location geography(Point, 4326),
  last_location_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_profile_id uuid not null references public.driver_profiles(id) on delete cascade,
  vehicle_type_id smallint not null references public.vehicle_types(id),
  vehicle_status_id smallint not null default 1000 references public.vehicle_statuses(id),
  plate_number text,
  model text,
  capacity integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.driver_verifications (
  id uuid primary key default gen_random_uuid(),
  driver_profile_id uuid not null references public.driver_profiles(id) on delete cascade,
  verification_status_id smallint not null default 1000 references public.verification_statuses(id),
  document_url text,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.driver_routes (
  id uuid primary key default gen_random_uuid(),
  driver_profile_id uuid not null references public.driver_profiles(id) on delete cascade,
  start_name text,
  destination_name text,
  start_latitude double precision not null,
  start_longitude double precision not null,
  destination_latitude double precision not null,
  destination_longitude double precision not null,
  start_location geography(Point, 4326),
  destination_location geography(Point, 4326),
  route_polyline text,
  route_status_id smallint not null default 1000 references public.route_statuses(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transport_requests (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  driver_profile_id uuid references public.driver_profiles(id) on delete set null,
  pickup_name text,
  destination_name text,
  pickup_latitude double precision not null,
  pickup_longitude double precision not null,
  destination_latitude double precision not null,
  destination_longitude double precision not null,
  pickup_location geography(Point, 4326),
  destination_location geography(Point, 4326),
  request_status_id smallint not null default 1000 references public.request_statuses(id),
  passenger_note text,
  driver_response_note text,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.route_matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.transport_requests(id) on delete cascade,
  driver_profile_id uuid not null references public.driver_profiles(id) on delete cascade,
  driver_route_id uuid references public.driver_routes(id) on delete set null,
  distance_to_pickup_m double precision,
  route_alignment_score numeric(5,2),
  is_selected boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.location_updates (
  id uuid primary key default gen_random_uuid(),
  driver_profile_id uuid not null references public.driver_profiles(id) on delete cascade,
  transport_request_id uuid references public.transport_requests(id) on delete set null,
  latitude double precision not null,
  longitude double precision not null,
  location geography(Point, 4326),
  speed double precision,
  heading double precision,
  recorded_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  transport_request_id uuid references public.transport_requests(id) on delete set null,
  report_type_id smallint not null references public.report_types(id),
  report_status_id smallint not null default 1000 references public.report_statuses(id),
  title text not null,
  description text not null,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  notification_type_id smallint not null references public.notification_types(id),
  title text not null,
  body text not null,
  related_request_id uuid references public.transport_requests(id) on delete set null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- LOCATION TRIGGERS
-- These convert latitude/longitude into PostGIS geography points.
-- ============================================================

create or replace function public.set_driver_current_location()
returns trigger
language plpgsql
as $$
begin
  if new.current_latitude is not null and new.current_longitude is not null then
    new.current_location = ST_SetSRID(ST_MakePoint(new.current_longitude, new.current_latitude), 4326)::geography;
    new.last_location_at = coalesce(new.last_location_at, now());
  end if;

  return new;
end;
$$;

create or replace function public.set_driver_route_locations()
returns trigger
language plpgsql
as $$
begin
  new.start_location = ST_SetSRID(ST_MakePoint(new.start_longitude, new.start_latitude), 4326)::geography;
  new.destination_location = ST_SetSRID(ST_MakePoint(new.destination_longitude, new.destination_latitude), 4326)::geography;

  return new;
end;
$$;

create or replace function public.set_transport_request_locations()
returns trigger
language plpgsql
as $$
begin
  new.pickup_location = ST_SetSRID(ST_MakePoint(new.pickup_longitude, new.pickup_latitude), 4326)::geography;
  new.destination_location = ST_SetSRID(ST_MakePoint(new.destination_longitude, new.destination_latitude), 4326)::geography;

  return new;
end;
$$;

create or replace function public.set_location_update_point()
returns trigger
language plpgsql
as $$
begin
  new.location = ST_SetSRID(ST_MakePoint(new.longitude, new.latitude), 4326)::geography;

  return new;
end;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_driver_profiles_updated_at on public.driver_profiles;
create trigger set_driver_profiles_updated_at
before update on public.driver_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_vehicles_updated_at on public.vehicles;
create trigger set_vehicles_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

drop trigger if exists set_driver_verifications_updated_at on public.driver_verifications;
create trigger set_driver_verifications_updated_at
before update on public.driver_verifications
for each row execute function public.set_updated_at();

drop trigger if exists set_driver_routes_updated_at on public.driver_routes;
create trigger set_driver_routes_updated_at
before update on public.driver_routes
for each row execute function public.set_updated_at();

drop trigger if exists set_transport_requests_updated_at on public.transport_requests;
create trigger set_transport_requests_updated_at
before update on public.transport_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

drop trigger if exists set_driver_current_location_trigger on public.driver_profiles;
create trigger set_driver_current_location_trigger
before insert or update of current_latitude, current_longitude on public.driver_profiles
for each row execute function public.set_driver_current_location();

drop trigger if exists set_driver_route_locations_trigger on public.driver_routes;
create trigger set_driver_route_locations_trigger
before insert or update of start_latitude, start_longitude, destination_latitude, destination_longitude on public.driver_routes
for each row execute function public.set_driver_route_locations();

drop trigger if exists set_transport_request_locations_trigger on public.transport_requests;
create trigger set_transport_request_locations_trigger
before insert or update of pickup_latitude, pickup_longitude, destination_latitude, destination_longitude on public.transport_requests
for each row execute function public.set_transport_request_locations();

drop trigger if exists set_location_update_point_trigger on public.location_updates;
create trigger set_location_update_point_trigger
before insert or update of latitude, longitude on public.location_updates
for each row execute function public.set_location_update_point();

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_profiles_role_id on public.profiles(role_id);
create index if not exists idx_profiles_account_status_id on public.profiles(account_status_id);

create index if not exists idx_driver_profiles_profile_id on public.driver_profiles(profile_id);
create index if not exists idx_driver_profiles_availability_status_id on public.driver_profiles(availability_status_id);
create index if not exists idx_driver_profiles_verification_status_id on public.driver_profiles(verification_status_id);
create index if not exists idx_driver_profiles_current_location on public.driver_profiles using gist(current_location);

create index if not exists idx_vehicles_driver_profile_id on public.vehicles(driver_profile_id);
create index if not exists idx_vehicles_vehicle_type_id on public.vehicles(vehicle_type_id);

create index if not exists idx_driver_routes_driver_profile_id on public.driver_routes(driver_profile_id);
create index if not exists idx_driver_routes_route_status_id on public.driver_routes(route_status_id);
create index if not exists idx_driver_routes_start_location on public.driver_routes using gist(start_location);
create index if not exists idx_driver_routes_destination_location on public.driver_routes using gist(destination_location);

create index if not exists idx_transport_requests_passenger_id on public.transport_requests(passenger_id);
create index if not exists idx_transport_requests_driver_profile_id on public.transport_requests(driver_profile_id);
create index if not exists idx_transport_requests_status_id on public.transport_requests(request_status_id);
create index if not exists idx_transport_requests_pickup_location on public.transport_requests using gist(pickup_location);
create index if not exists idx_transport_requests_destination_location on public.transport_requests using gist(destination_location);

create index if not exists idx_route_matches_request_id on public.route_matches(request_id);
create index if not exists idx_route_matches_driver_profile_id on public.route_matches(driver_profile_id);

create index if not exists idx_location_updates_driver_profile_id on public.location_updates(driver_profile_id);
create index if not exists idx_location_updates_transport_request_id on public.location_updates(transport_request_id);
create index if not exists idx_location_updates_recorded_at on public.location_updates(recorded_at);
create index if not exists idx_location_updates_location on public.location_updates using gist(location);

create index if not exists idx_reports_reporter_id on public.reports(reporter_id);
create index if not exists idx_reports_reported_user_id on public.reports(reported_user_id);
create index if not exists idx_reports_status_id on public.reports(report_status_id);

create index if not exists idx_notifications_recipient_id on public.notifications(recipient_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);

-- ============================================================
-- END OF INITIAL SCHEMA
-- ============================================================