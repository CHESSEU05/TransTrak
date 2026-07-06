-- Creates TransTrak public profile rows when Supabase Auth creates a user.
-- This is useful as a database-side safety net, while the app also creates
-- the same rows after an immediate signed-in registration.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  registration jsonb := coalesce(new.raw_user_meta_data -> 'transtrak_registration', '{}'::jsonb);
  role_id_value smallint := case
    when coalesce(registration ->> 'role_id', '') ~ '^[0-9]+$'
      then (registration ->> 'role_id')::smallint
    else 1000
  end;
  full_name_value text := nullif(trim(coalesce(registration ->> 'full_name', '')), '');
  phone_value text := nullif(trim(coalesce(registration ->> 'phone', '')), '');
  city_value text := nullif(trim(coalesce(registration ->> 'city', '')), '');
  vehicle_value jsonb := registration -> 'vehicle';
  vehicle_type_id_value smallint;
  plate_number_value text;
  colour_value text;
  driver_profile_id_value uuid;
begin
  if role_id_value not in (1000, 2000) then
    role_id_value := 1000;
  end if;

  if full_name_value is null then
    full_name_value := coalesce(nullif(split_part(new.email, '@', 1), ''), 'TransTrak User');
  end if;

  insert into public.profiles (
    id,
    full_name,
    phone,
    city,
    role_id,
    account_status_id
  )
  values (
    new.id,
    full_name_value,
    phone_value,
    city_value,
    role_id_value,
    1000
  )
  on conflict (id) do nothing;

  if role_id_value = 2000 then
    insert into public.driver_profiles (
      profile_id,
      availability_status_id,
      verification_status_id
    )
    values (
      new.id,
      2000,
      1000
    )
    on conflict (profile_id) do update
    set updated_at = now()
    returning id into driver_profile_id_value;

    if driver_profile_id_value is null then
      select id
      into driver_profile_id_value
      from public.driver_profiles
      where profile_id = new.id;
    end if;

    if jsonb_typeof(vehicle_value) = 'object' then
      vehicle_type_id_value := case
        when coalesce(vehicle_value ->> 'vehicle_type_id', '') ~ '^[0-9]+$'
          then (vehicle_value ->> 'vehicle_type_id')::smallint
        else null
      end;

      if vehicle_type_id_value in (1000, 2000) then
        plate_number_value := nullif(trim(coalesce(vehicle_value ->> 'plate_number', '')), '');
        colour_value := nullif(trim(coalesce(vehicle_value ->> 'colour', '')), '');

        insert into public.vehicles (
          driver_profile_id,
          vehicle_type_id,
          vehicle_status_id,
          plate_number,
          model
        )
        values (
          driver_profile_id_value,
          vehicle_type_id_value,
          1000,
          plate_number_value,
          case
            when vehicle_type_id_value = 1000 then 'Yellow Taxi'
            when colour_value is not null then 'Bike colour: ' || colour_value
            else null
          end
        );
      end if;
    end if;

    insert into public.driver_verifications (
      driver_profile_id,
      verification_status_id
    )
    values (
      driver_profile_id_value,
      1000
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_transtrak_profile on auth.users;

create trigger on_auth_user_created_create_transtrak_profile
after insert on auth.users
for each row
execute function public.handle_new_auth_user();
