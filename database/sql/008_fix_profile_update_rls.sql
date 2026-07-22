-- ============================================================
-- TransTrak Profile Update Hotfix
-- ============================================================
-- Provides a narrow RPC for users to update only their editable
-- profile fields without touching role or account status columns.

create or replace function public.update_own_profile(
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
  where p.id = auth.uid()
    and p.account_status_id = 1000
  returning p.*
  into v_profile;

  if not found then
    raise exception 'Active profile not found or profile update is not allowed.';
  end if;

  return v_profile;
end;
$$;

grant execute on function public.update_own_profile(text, text, text) to authenticated;
