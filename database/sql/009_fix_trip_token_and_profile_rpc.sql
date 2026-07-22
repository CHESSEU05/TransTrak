-- ============================================================
-- TransTrak Trip Token + Profile RPC Hotfix
-- ============================================================
-- Fixes:
-- 1. "function gen_random_bytes(integer) does not exist" by using
--    Supabase's extensions schema for pgcrypto functions.
-- 2. Profile update false rejection by accepting the current profile id
--    from the app while still updating only editable profile fields.

create extension if not exists pgcrypto with schema extensions;

drop function if exists public.update_own_profile(text, text, text);

create or replace function public.hash_trip_share_token(p_token text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

create or replace function public.trip_share_public_token()
returns text
language sql
volatile
as $$
  select replace(replace(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+', '-'), '/', '_');
$$;

create or replace function public.update_own_profile(
  p_profile_id uuid,
  p_full_name text,
  p_phone text default null,
  p_city text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_full_name text;
  v_phone text;
  v_city text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to update a profile.';
  end if;

  v_full_name := trim(coalesce(p_full_name, ''));
  v_phone := nullif(trim(coalesce(p_phone, '')), '');
  v_city := nullif(trim(coalesce(p_city, '')), '');

  if length(v_full_name) < 3 then
    raise exception 'Enter at least 3 characters for your full name.';
  end if;

  update public.profiles p
  set
    full_name = v_full_name,
    phone = v_phone,
    city = v_city,
    updated_at = now()
  where p.id = p_profile_id
    and (
      p.id = auth.uid()
      or public.is_admin(auth.uid())
    )
  returning p.*
  into v_profile;

  if not found then
    raise exception 'Profile not found or profile update is not allowed.';
  end if;

  return v_profile;
end;
$$;

grant execute on function public.update_own_profile(uuid, text, text, text) to authenticated;
grant execute on function public.hash_trip_share_token(text) to anon, authenticated;
grant execute on function public.trip_share_public_token() to authenticated;
