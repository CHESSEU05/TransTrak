import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '../services/supabase/client';
import {
  clearLocalAuthSession,
  ensureProfileForAuthenticatedUser,
  getCurrentSession,
  loginUser,
  logoutUser,
  registerUser,
} from '../services/auth/authService';
import { authDebug, authDebugError } from '../services/auth/authDebug';
import type { LoginInput, Profile, RegisterInput, RegisterResult } from '../types/auth';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  shouldShowRegistrationSuccess: boolean;
  register: (input: RegisterInput) => Promise<RegisterResult>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  completeRegistrationCelebration: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowRegistrationSuccess, setShouldShowRegistrationSuccess] = useState(false);

  const user = session?.user ?? null;

  const loadProfile = useCallback(async (currentUser: User) => {
    const currentProfile = await ensureProfileForAuthenticatedUser(currentUser);
    setProfile(currentProfile);
    return currentProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }

    await loadProfile(session.user);
  }, [loadProfile, session?.user]);

  const register = useCallback(async (input: RegisterInput): Promise<RegisterResult> => {
    setIsLoading(true);

    try {
      const result = await registerUser(input);

      setSession(result.session);

      const savedProfile = await loadProfile(result.user);

      if (!savedProfile) {
        throw new Error('Your account was created, but your TransTrak profile could not be loaded.');
      }

      setShouldShowRegistrationSuccess(true);

      return {
        status: 'signed_in',
        email: result.email,
        userId: result.userId,
      };
    } finally {
      setIsLoading(false);
    }
  }, [loadProfile]);

  const login = useCallback(async (input: LoginInput) => {
    setIsLoading(true);

    try {
      const result = await loginUser(input);

      if (!result.session || !result.user) {
        throw new Error('Login failed. No active session was returned.');
      }

      setSession(result.session);
      const savedProfile = await loadProfile(result.user);

      if (!savedProfile) {
        throw new Error('Your login worked, but your TransTrak profile is missing.');
      }

      setShouldShowRegistrationSuccess(false);
    } finally {
      setIsLoading(false);
    }
  }, [loadProfile]);

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await logoutUser();
      setSession(null);
      setProfile(null);
      setShouldShowRegistrationSuccess(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeRegistrationCelebration = useCallback(() => {
    setShouldShowRegistrationSuccess(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        authDebug('context:init:start');
        const currentSession = await getCurrentSession();

        if (!isMounted) {
          return;
        }

        setSession(currentSession);

        if (currentSession?.user?.id) {
          const savedProfile = await loadProfile(currentSession.user);

          if (!savedProfile) {
            await clearLocalAuthSession('missing_profile_on_init');
            setSession(null);
            setProfile(null);
          }
        }
      } catch (error) {
        authDebugError('context:init:error', error);
        if (isMounted) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      authDebug('context:auth_state_change', {
        event,
        hasSession: Boolean(newSession),
        userId: newSession?.user?.id ?? null,
        email: newSession?.user?.email ?? null,
      });

      setSession(newSession);
      setShouldShowRegistrationSuccess(false);

      if (newSession?.user?.id) {
        try {
          const savedProfile = await loadProfile(newSession.user);

          if (!savedProfile) {
            await clearLocalAuthSession('missing_profile_on_auth_state');
            setSession(null);
            setProfile(null);
          }
        } catch (error) {
          authDebugError('context:auth_state_profile_error', error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      isLoading,
      shouldShowRegistrationSuccess,
      register,
      login,
      logout,
      refreshProfile,
      completeRegistrationCelebration,
    }),
    [
      session,
      user,
      profile,
      isLoading,
      shouldShowRegistrationSuccess,
      register,
      login,
      logout,
      refreshProfile,
      completeRegistrationCelebration,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
