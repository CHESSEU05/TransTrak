-- ============================================================
-- TransTrak Row Level Security Policies
-- ============================================================

-- This file assumes that the initial schema has already been created.
-- Lookup IDs used:
-- PASSENGER = 1000
-- DRIVER = 2000
-- ADMIN = 3000

-- ACTIVE account = 1000

-- ONLINE availability = 1000
-- OFFLINE availability = 2000
-- BUSY availability = 3000

-- PENDING request/report/verification = 1000

-- APPROVED verification = 2000

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and p.role_id = 3000
      and p.account_status_id = 1000
  );
$$;

create or replace function public.is_driver_profile_owner(target_driver_profile_id uuid, user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.driver_profiles dp
    where dp.id = target_driver_profile_id
      and dp.profile_id = user_id
  );
$$;

create or replace function public.can_access_transport_request(target_request_id uuid, user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.transport_requests tr
    left join public.driver_profiles dp
      on dp.id = tr.driver_profile_id
    where tr.id = target_request_id
      and (
        tr.passenger_id = user_id
        or dp.profile_id = user_id
        or public.is_admin(user_id)
      )
  );
$$;

-- ============================================================
-- ENABLE RLS
-- ============================================================

alter table public.user_roles enable row level security;
alter table public.account_statuses enable row level security;
alter table public.availability_statuses enable row level security;
alter table public.verification_statuses enable row level security;
alter table public.vehicle_types enable row level security;
alter table public.vehicle_statuses enable row level security;
alter table public.request_statuses enable row level security;
alter table public.route_statuses enable row level security;
alter table public.report_types enable row level security;
alter table public.report_statuses enable row level security;
alter table public.notification_types enable row level security;

alter table public.profiles enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.driver_verifications enable row level security;
alter table public.driver_routes enable row level security;
alter table public.transport_requests enable row level security;
alter table public.route_matches enable row level security;
alter table public.location_updates enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

-- ============================================================
-- LOOKUP TABLE POLICIES
-- Public reference data can be read by the app.
-- Clients cannot insert, update, or delete lookup values.
-- ============================================================

drop policy if exists "Lookup data is readable" on public.user_roles;
create policy "Lookup data is readable"
on public.user_roles
for select
to anon, authenticated
using (true);

drop policy if exists "Lookup data is readable" on public.account_statuses;
create policy "Lookup data is readable"
on public.account_statuses
for select
to anon, authenticated
using (true);

drop policy if exists "Lookup data is readable" on public.availability_statuses;
create policy "Lookup data is readable"
on public.availability_statuses
for select
to anon, authenticated
using (true);

drop policy if exists "Lookup data is readable" on public.verification_statuses;
create policy "Lookup data is readable"
on public.verification_statuses
for select
to anon, authenticated
using (true);

drop policy if exists "Lookup data is readable" on public.vehicle_types;
create policy "Lookup data is readable"
on public.vehicle_types
for select
to anon, authenticated
using (true);

drop policy if exists "Lookup data is readable" on public.vehicle_statuses;
create policy "Lookup data is readable"
on public.vehicle_statuses
for select
to anon, authenticated
using (true);

drop policy if exists "Lookup data is readable" on public.request_statuses;
create policy "Lookup data is readable"
on public.request_statuses
for select
to anon, authenticated
using (true);

drop policy if exists "Lookup data is readable" on public.route_statuses;
create policy "Lookup data is readable"
on public.route_statuses
for select
to anon, authenticated
using (true);

drop policy if exists "Lookup data is readable" on public.report_types;
create policy "Lookup data is readable"
on public.report_types
for select
to anon, authenticated
using (true);

drop policy if exists "Lookup data is readable" on public.report_statuses;
create policy "Lookup data is readable"
on public.report_statuses
for select
to anon, authenticated
using (true);

drop policy if exists "Lookup data is readable" on public.notification_types;
create policy "Lookup data is readable"
on public.notification_types
for select
to anon, authenticated
using (true);

-- ============================================================
-- PROFILES
-- ============================================================

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and role_id in (1000, 2000)
  and account_status_id = 1000
);

drop policy if exists "Users can read allowed profiles" on public.profiles;
create policy "Users can read allowed profiles"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin(auth.uid())
  or exists (
    select 1
    from public.driver_profiles dp
    where dp.profile_id = profiles.id
      and dp.verification_status_id = 2000
  )
  or exists (
    select 1
    from public.transport_requests tr
    left join public.driver_profiles dp
      on dp.id = tr.driver_profile_id
    where (
      tr.passenger_id = auth.uid()
      and dp.profile_id = profiles.id
    )
    or (
      dp.profile_id = auth.uid()
      and tr.passenger_id = profiles.id
    )
  )
);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or public.is_admin(auth.uid())
)
with check (
  public.is_admin(auth.uid())
  or (
    id = auth.uid()
    and role_id in (1000, 2000)
    and account_status_id = 1000
  )
);

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
on public.profiles
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- ============================================================
-- DRIVER PROFILES
-- ============================================================

drop policy if exists "Drivers can insert their own driver profile" on public.driver_profiles;
create policy "Drivers can insert their own driver profile"
on public.driver_profiles
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role_id = 2000
      and p.account_status_id = 1000
  )
);

drop policy if exists "Users can read allowed driver profiles" on public.driver_profiles;
create policy "Users can read allowed driver profiles"
on public.driver_profiles
for select
to authenticated
using (
  profile_id = auth.uid()
  or public.is_admin(auth.uid())
  or verification_status_id = 2000
);

drop policy if exists "Drivers can update their own driver profile" on public.driver_profiles;
create policy "Drivers can update their own driver profile"
on public.driver_profiles
for update
to authenticated
using (
  profile_id = auth.uid()
  or public.is_admin(auth.uid())
)
with check (
  profile_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "Admins can delete driver profiles" on public.driver_profiles;
create policy "Admins can delete driver profiles"
on public.driver_profiles
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- ============================================================
-- VEHICLES
-- ============================================================

drop policy if exists "Drivers can insert their own vehicles" on public.vehicles;
create policy "Drivers can insert their own vehicles"
on public.vehicles
for insert
to authenticated
with check (
  public.is_driver_profile_owner(driver_profile_id, auth.uid())
  or public.is_admin(auth.uid())
);

drop policy if exists "Users can read allowed vehicles" on public.vehicles;
create policy "Users can read allowed vehicles"
on public.vehicles
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_driver_profile_owner(driver_profile_id, auth.uid())
  or exists (
    select 1
    from public.driver_profiles dp
    where dp.id = vehicles.driver_profile_id
      and dp.verification_status_id = 2000
  )
);

drop policy if exists "Drivers can update their own vehicles" on public.vehicles;
create policy "Drivers can update their own vehicles"
on public.vehicles
for update
to authenticated
using (
  public.is_driver_profile_owner(driver_profile_id, auth.uid())
  or public.is_admin(auth.uid())
)
with check (
  public.is_driver_profile_owner(driver_profile_id, auth.uid())
  or public.is_admin(auth.uid())
);

drop policy if exists "Drivers can delete their own vehicles" on public.vehicles;
create policy "Drivers can delete their own vehicles"
on public.vehicles
for delete
to authenticated
using (
  public.is_driver_profile_owner(driver_profile_id, auth.uid())
  or public.is_admin(auth.uid())
);

-- ============================================================
-- DRIVER VERIFICATIONS
-- ============================================================

drop policy if exists "Drivers can insert their own verification documents" on public.driver_verifications;
create policy "Drivers can insert their own verification documents"
on public.driver_verifications
for insert
to authenticated
with check (
  public.is_driver_profile_owner(driver_profile_id, auth.uid())
  or public.is_admin(auth.uid())
);

drop policy if exists "Drivers and admins can read verification records" on public.driver_verifications;
create policy "Drivers and admins can read verification records"
on public.driver_verifications
for select
to authenticated
using (
  public.is_driver_profile_owner(driver_profile_id, auth.uid())
  or public.is_admin(auth.uid())
);

drop policy if exists "Admins can update verification records" on public.driver_verifications;
create policy "Admins can update verification records"
on public.driver_verifications
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete verification records" on public.driver_verifications;
create policy "Admins can delete verification records"
on public.driver_verifications
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- ============================================================
-- DRIVER ROUTES
-- ============================================================

drop policy if exists "Drivers can insert their own routes" on public.driver_routes;
create policy "Drivers can insert their own routes"
on public.driver_routes
for insert
to authenticated
with check (
  public.is_driver_profile_owner(driver_profile_id, auth.uid())
  or public.is_admin(auth.uid())
);

drop policy if exists "Users can read allowed driver routes" on public.driver_routes;
create policy "Users can read allowed driver routes"
on public.driver_routes
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_driver_profile_owner(driver_profile_id, auth.uid())
  or (
    route_status_id = 1000
    and exists (
      select 1
      from public.driver_profiles dp
      where dp.id = driver_routes.driver_profile_id
        and dp.verification_status_id = 2000
    )
  )
);

drop policy if exists "Drivers can update their own routes" on public.driver_routes;
create policy "Drivers can update their own routes"
on public.driver_routes
for update
to authenticated
using (
  public.is_driver_profile_owner(driver_profile_id, auth.uid())
  or public.is_admin(auth.uid())
)
with check (
  public.is_driver_profile_owner(driver_profile_id, auth.uid())
  or public.is_admin(auth.uid())
);

drop policy if exists "Drivers can delete their own routes" on public.driver_routes;
create policy "Drivers can delete their own routes"
on public.driver_routes
for delete
to authenticated
using (
  public.is_driver_profile_owner(driver_profile_id, auth.uid())
  or public.is_admin(auth.uid())
);

-- ============================================================
-- TRANSPORT REQUESTS
-- ============================================================

drop policy if exists "Passengers can insert their own transport requests" on public.transport_requests;
create policy "Passengers can insert their own transport requests"
on public.transport_requests
for insert
to authenticated
with check (
  passenger_id = auth.uid()
  and request_status_id = 1000
);

drop policy if exists "Passengers drivers and admins can read transport requests" on public.transport_requests;
create policy "Passengers drivers and admins can read transport requests"
on public.transport_requests
for select
to authenticated
using (
  passenger_id = auth.uid()
  or public.is_admin(auth.uid())
  or public.is_driver_profile_owner(driver_profile_id, auth.uid())
);

drop policy if exists "Passengers drivers and admins can update transport requests" on public.transport_requests;
create policy "Passengers drivers and admins can update transport requests"
on public.transport_requests
for update
to authenticated
using (
  passenger_id = auth.uid()
  or public.is_admin(auth.uid())
  or public.is_driver_profile_owner(driver_profile_id, auth.uid())
)
with check (
  passenger_id = auth.uid()
  or public.is_admin(auth.uid())
  or public.is_driver_profile_owner(driver_profile_id, auth.uid())
);

drop policy if exists "Admins can delete transport requests" on public.transport_requests;
create policy "Admins can delete transport requests"
on public.transport_requests
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- ============================================================
-- ROUTE MATCHES
-- ============================================================

drop policy if exists "Passengers can insert route matches for their requests" on public.route_matches;
create policy "Passengers can insert route matches for their requests"
on public.route_matches
for insert
to authenticated
with check (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.transport_requests tr
    where tr.id = route_matches.request_id
      and tr.passenger_id = auth.uid()
  )
);

drop policy if exists "Users can read route matches they are part of" on public.route_matches;
create policy "Users can read route matches they are part of"
on public.route_matches
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_driver_profile_owner(driver_profile_id, auth.uid())
  or exists (
    select 1
    from public.transport_requests tr
    where tr.id = route_matches.request_id
      and tr.passenger_id = auth.uid()
  )
);

drop policy if exists "Passengers can update route matches for their requests" on public.route_matches;
create policy "Passengers can update route matches for their requests"
on public.route_matches
for update
to authenticated
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.transport_requests tr
    where tr.id = route_matches.request_id
      and tr.passenger_id = auth.uid()
  )
)
with check (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.transport_requests tr
    where tr.id = route_matches.request_id
      and tr.passenger_id = auth.uid()
  )
);

drop policy if exists "Admins can delete route matches" on public.route_matches;
create policy "Admins can delete route matches"
on public.route_matches
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- ============================================================
-- LOCATION UPDATES
-- ============================================================

drop policy if exists "Drivers can insert their own location updates" on public.location_updates;
create policy "Drivers can insert their own location updates"
on public.location_updates
for insert
to authenticated
with check (
  public.is_driver_profile_owner(driver_profile_id, auth.uid())
);

drop policy if exists "Users can read allowed location updates" on public.location_updates;
create policy "Users can read allowed location updates"
on public.location_updates
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_driver_profile_owner(driver_profile_id, auth.uid())
  or (
    transport_request_id is not null
    and public.can_access_transport_request(transport_request_id, auth.uid())
  )
);

drop policy if exists "Admins can update location updates" on public.location_updates;
create policy "Admins can update location updates"
on public.location_updates
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete location updates" on public.location_updates;
create policy "Admins can delete location updates"
on public.location_updates
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- ============================================================
-- REPORTS
-- ============================================================

drop policy if exists "Users can insert their own reports" on public.reports;
create policy "Users can insert their own reports"
on public.reports
for insert
to authenticated
with check (
  reporter_id = auth.uid()
);

drop policy if exists "Users can read reports they are involved in" on public.reports;
create policy "Users can read reports they are involved in"
on public.reports
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or reporter_id = auth.uid()
  or reported_user_id = auth.uid()
);

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
on public.reports
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete reports" on public.reports;
create policy "Admins can delete reports"
on public.reports
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

drop policy if exists "Users can insert notifications" on public.notifications;
create policy "Users can insert notifications"
on public.notifications
for insert
to authenticated
with check (
  auth.uid() is not null
);

drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications"
on public.notifications
for select
to authenticated
using (
  recipient_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
on public.notifications
for update
to authenticated
using (
  recipient_id = auth.uid()
  or public.is_admin(auth.uid())
)
with check (
  recipient_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "Users can delete their own notifications" on public.notifications;
create policy "Users can delete their own notifications"
on public.notifications
for delete
to authenticated
using (
  recipient_id = auth.uid()
  or public.is_admin(auth.uid())
);

-- ============================================================
-- END OF RLS POLICIES
-- ============================================================