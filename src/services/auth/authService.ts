import type { Session, User } from '@supabase/supabase-js';

import { authDebug, authDebugError, maskEmail } from './authDebug';
import { supabase } from '../supabase/client';
import type {
  DriverVehicleInput,
  LoginInput,
  Profile,
  RegisterInput,
  RegisterResult,
  UserRoleId,
} from '../../types/auth';

const REGISTRATION_METADATA_KEY = 'transtrak_registration';

type RegistrationRowsInput = Omit<RegisterInput, 'password'>;

type RegisterUserResult = RegisterResult & {
  session: Session;
  user: User;
};

function isUserRoleId(value: number): value is UserRoleId {
  return value === 1000 || value === 2000;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function buildRegistrationMetadata(input: RegisterInput) {
  return {
    [REGISTRATION_METADATA_KEY]: {
      full_name: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      city: input.city?.trim() || null,
      role_id: input.roleId,
      vehicle: input.vehicle
        ? {
            vehicle_type_id: input.vehicle.vehicleTypeId,
            plate_number: input.vehicle.plateNumber?.trim() || null,
            colour: input.vehicle.vehicleTypeId === 2000 ? input.vehicle.colour?.trim() || null : null,
          }
        : null,
    },
  };
}

function vehicleModel(vehicle?: DriverVehicleInput) {
  if (!vehicle) {
    return null;
  }

  return vehicle.vehicleTypeId === 1000
    ? 'Yellow Taxi'
    : vehicle.colour
      ? `Bike colour: ${vehicle.colour}`
      : null;
}

function readRegistrationMetadata(user: User): RegistrationRowsInput | null {
  const root = user.user_metadata?.[REGISTRATION_METADATA_KEY];

  if (!isRecord(root)) {
    return null;
  }

  const rawRoleId = Number(root.role_id);
  const fullName = typeof root.full_name === 'string' ? root.full_name.trim() : '';
  const email = user.email?.trim() || '';

  if (!fullName || !email || !isUserRoleId(rawRoleId)) {
    return null;
  }

  let vehicle: DriverVehicleInput | undefined;

  if (isRecord(root.vehicle)) {
    const vehicleTypeId = Number(root.vehicle.vehicle_type_id);

    if (vehicleTypeId === 1000 || vehicleTypeId === 2000) {
      vehicle = {
        vehicleTypeId,
        plateNumber:
          typeof root.vehicle.plate_number === 'string'
            ? root.vehicle.plate_number
            : undefined,
        colour:
          typeof root.vehicle.colour === 'string' ? root.vehicle.colour : undefined,
      };
    }
  }

  return {
    fullName,
    phone: typeof root.phone === 'string' ? root.phone : undefined,
    city: typeof root.city === 'string' ? root.city : undefined,
    email,
    roleId: rawRoleId,
    vehicle,
  };
}

async function ensureRegistrationRows(input: RegistrationRowsInput, userId: string) {
  authDebug('profile:ensure:start', {
    userId,
    email: input.email,
    roleId: input.roleId,
    hasVehicle: Boolean(input.vehicle),
  });

  const existingProfile = await getProfile(userId);

  if (!existingProfile) {
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        full_name: input.fullName.trim(),
        phone: input.phone?.trim() || null,
        city: input.city?.trim() || null,
        role_id: input.roleId,
        account_status_id: 1000,
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      authDebugError('profile:ensure:profile_error', profileError, {
        userId,
        roleId: input.roleId,
      });
      throw new Error(profileError.message);
    }
  }

  if (input.roleId === 2000) {
    const { data: driverProfile, error: driverProfileError } = await supabase
      .from('driver_profiles')
      .upsert(
        {
          profile_id: userId,
          availability_status_id: 2000,
          verification_status_id: 1000,
        },
        { onConflict: 'profile_id' }
      )
      .select('id')
      .single();

    if (driverProfileError) {
      authDebugError('profile:ensure:driver_profile_error', driverProfileError, {
        userId,
      });
      throw new Error(driverProfileError.message);
    }

    if (input.vehicle) {
      const { data: existingVehicles, error: existingVehicleError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('driver_profile_id', driverProfile.id)
        .limit(1);

      if (existingVehicleError) {
        authDebugError('profile:ensure:vehicle_lookup_error', existingVehicleError, {
          userId,
        });
        throw new Error(existingVehicleError.message);
      }

      if (!existingVehicles?.length) {
        const { error: vehicleError } = await supabase.from('vehicles').insert({
          driver_profile_id: driverProfile.id,
          vehicle_type_id: input.vehicle.vehicleTypeId,
          plate_number: input.vehicle.plateNumber?.trim() || null,
          model: vehicleModel(input.vehicle),
        });

        if (vehicleError) {
          authDebugError('profile:ensure:vehicle_error', vehicleError, { userId });
          throw new Error(vehicleError.message);
        }
      }
    }

    const { data: existingVerification, error: verificationLookupError } = await supabase
      .from('driver_verifications')
      .select('id')
      .eq('driver_profile_id', driverProfile.id)
      .limit(1);

    if (verificationLookupError) {
      authDebugError('profile:ensure:verification_lookup_error', verificationLookupError, {
        userId,
      });
      throw new Error(verificationLookupError.message);
    }

    if (!existingVerification?.length) {
      const { error: verificationError } = await supabase
        .from('driver_verifications')
        .insert({
          driver_profile_id: driverProfile.id,
          verification_status_id: 1000,
        });

      if (verificationError) {
        authDebugError('profile:ensure:verification_error', verificationError, {
          userId,
        });
        throw new Error(verificationError.message);
      }
    }
  }

  const profile = await getProfile(userId);

  authDebug('profile:ensure:done', {
    userId,
    hasProfile: Boolean(profile),
    roleId: profile?.role_id ?? null,
  });

  return profile;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    authDebugError('session:get:error', error);
    throw new Error(error.message);
  }

  authDebug('session:get:done', {
    hasSession: Boolean(data.session),
    userId: data.session?.user?.id ?? null,
    email: data.session?.user?.email ?? null,
  });

  return data.session;
}

export async function clearLocalAuthSession(reason: string) {
  authDebug('session:clear_local:start', { reason });

  const { error } = await supabase.auth.signOut({ scope: 'local' });

  if (error) {
    authDebugError('session:clear_local:error', error, { reason });
    throw new Error(error.message);
  }

  authDebug('session:clear_local:done', { reason });
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    authDebugError('profile:get:error', error, { userId });
    throw new Error(error.message);
  }

  authDebug('profile:get:done', {
    userId,
    hasProfile: Boolean(data),
    roleId: data?.role_id ?? null,
  });

  return data;
}

export async function registerUser(input: RegisterInput): Promise<RegisterUserResult> {
  const { fullName, phone, city, email, password, roleId, vehicle } = input;
  const normalizedEmail = email.trim();
  const existingSession = await getCurrentSession();

  if (existingSession) {
    await clearLocalAuthSession('before_signup');
  }

  authDebug('signup:start', {
    email: normalizedEmail,
    roleId,
    hasVehicle: Boolean(vehicle),
  });

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: buildRegistrationMetadata({
        fullName,
        phone,
        city,
        email: normalizedEmail,
        password,
        roleId,
        vehicle,
      }),
    },
  });

  if (error) {
    authDebugError('signup:error', error, { email: normalizedEmail, roleId });
    throw new Error(error.message);
  }

  const user = data.user;

  if (!user) {
    authDebug('signup:no_user', { email: normalizedEmail, roleId });
    throw new Error('Registration failed. No user was returned.');
  }

  authDebug('signup:result', {
    email: normalizedEmail,
    userId: user.id,
    hasSession: Boolean(data.session),
    emailConfirmedAt: user.email_confirmed_at ?? null,
    confirmationSentAt: user.confirmation_sent_at ?? null,
  });

  if (!data.session) {
    throw new Error(
      'Supabase did not return a session after signup. Disable email confirmation in Supabase Authentication > Sign In / Providers > Email, then delete this test user and try again.'
    );
  }

  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  await ensureRegistrationRows(
    {
      fullName,
      phone,
      city,
      email: normalizedEmail,
      roleId,
      vehicle,
    },
    user.id
  );

  return {
    status: 'signed_in',
    email: normalizedEmail,
    userId: user.id,
    user,
    session: data.session,
  };
}

export async function loginUser(input: LoginInput) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  });

  if (error) {
    authDebugError('login:error', error, { email: input.email });

    if (error.message.toLowerCase().includes('email not confirmed')) {
      throw new Error(
        'This account still requires email confirmation. Disable email confirmation in Supabase, delete this test user, and register again.'
      );
    }

    throw new Error(error.message);
  }

  authDebug('login:done', {
    email: input.email,
    userId: data.user?.id ?? null,
    hasSession: Boolean(data.session),
  });

  return data;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    authDebugError('logout:error', error);
    throw new Error(error.message);
  }

  authDebug('logout:done');
}

export async function ensureProfileForAuthenticatedUser(user: User) {
  const existingProfile = await getProfile(user.id);

  if (existingProfile) {
    return existingProfile;
  }

  const registrationMetadata = readRegistrationMetadata(user);

  if (!registrationMetadata) {
    authDebug('profile:repair:no_registration_metadata', {
      userId: user.id,
      email: maskEmail(user.email),
      metadataKeys: Object.keys(user.user_metadata ?? {}),
    });
    return null;
  }

  return ensureRegistrationRows(registrationMetadata, user.id);
}
