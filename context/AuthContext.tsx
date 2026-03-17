import React, { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { logger, logContext } from '../utils/logger';
import type { User, Session, AuthError } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  avatar_url?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert Supabase User to UserProfile
  const mapUser = (authUser: User | null): UserProfile | null => {
    if (!authUser) return null;
    
    return {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      role: authUser.user_metadata?.role || 'user',
      avatar_url: authUser.user_metadata?.avatar_url,
    };
  };

  // Initialize auth state and listen to changes
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      logger.info(logContext.AUTH, 'Supabase not configured, running in offline mode');
      setIsLoading(false);
      return;
    }

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase!.auth.getSession();
        
        if (sessionError) {
          logger.error(logContext.AUTH, 'Error getting session:', sessionError);
          setError(sessionError.message);
        } else if (currentSession) {
          setSession(currentSession);
          setUser(mapUser(currentSession.user));
          logger.debug(logContext.AUTH, 'Session restored', { userId: currentSession.user.id });
        }
      } catch (err) {
        logger.error(logContext.AUTH, 'Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        logger.debug(logContext.AUTH, 'Auth state changed', { event });
        
        if (event === 'SIGNED_IN' && newSession) {
          setSession(newSession);
          setUser(mapUser(newSession.user));
          setError(null);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession);
        } else if (event === 'USER_UPDATED' && newSession) {
          setUser(mapUser(newSession.user));
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login with email/password
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    if (!isSupabaseConfigured() || !supabase) {
      // Offline mode - mock login for development
      logger.warn(logContext.AUTH, 'Offline mode - mock login');
      const mockUser: UserProfile = {
        id: 'offline-user',
        email,
        name: email.split('@')[0],
        role: 'user',
      };
      setUser(mockUser);
      setIsLoading(false);
      return { success: true };
    }

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        logger.error(logContext.AUTH, 'Login error:', loginError);
        setError(loginError.message);
        setIsLoading(false);
        return { success: false, error: loginError.message };
      }

      if (data.session) {
        setSession(data.session);
        setUser(mapUser(data.session.user));
        logger.info(logContext.AUTH, 'Login successful', { userId: data.session.user.id });
      }

      setIsLoading(false);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown login error';
      logger.error(logContext.AUTH, 'Login exception:', err);
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) {
      setUser(null);
      setSession(null);
      logger.info(logContext.AUTH, 'Offline mode - mock logout');
      return;
    }

    try {
      const { error: logoutError } = await supabase.auth.signOut();
      
      if (logoutError) {
        logger.error(logContext.AUTH, 'Logout error:', logoutError);
        setError(logoutError.message);
        return;
      }

      setUser(null);
      setSession(null);
      logger.info(logContext.AUTH, 'Logout successful');
    } catch (err) {
      logger.error(logContext.AUTH, 'Logout exception:', err);
    }
  }, []);

  // Register new user
  const register = useCallback(async (
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    if (!isSupabaseConfigured() || !supabase) {
      // Offline mode - mock registration
      logger.warn(logContext.AUTH, 'Offline mode - mock registration');
      const mockUser: UserProfile = {
        id: 'offline-user',
        email,
        name,
        role: 'user',
      };
      setUser(mockUser);
      setIsLoading(false);
      return { success: true };
    }

    try {
      const { data, error: registerError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'user',
          },
        },
      });

      if (registerError) {
        logger.error(logContext.AUTH, 'Registration error:', registerError);
        setError(registerError.message);
        setIsLoading(false);
        return { success: false, error: registerError.message };
      }

      if (data.session) {
        setSession(data.session);
        setUser(mapUser(data.session.user));
        logger.info(logContext.AUTH, 'Registration successful', { userId: data.session.user.id });
      } else if (data.user) {
        // Email confirmation required
        logger.info(logContext.AUTH, 'Registration successful - email confirmation required', { userId: data.user.id });
      }

      setIsLoading(false);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown registration error';
      logger.error(logContext.AUTH, 'Registration exception:', err);
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Password reset request
  const resetPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Password reset not available in offline mode' };
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        logger.error(logContext.AUTH, 'Password reset error:', resetError);
        return { success: false, error: resetError.message };
      }

      logger.info(logContext.AUTH, 'Password reset email sent');
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown reset error';
      logger.error(logContext.AUTH, 'Password reset exception:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Update password
  const updatePassword = useCallback(async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Password update not available in offline mode' };
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        logger.error(logContext.AUTH, 'Password update error:', updateError);
        return { success: false, error: updateError.message };
      }

      logger.info(logContext.AUTH, 'Password updated successfully');
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown update error';
      logger.error(logContext.AUTH, 'Password update exception:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        register,
        resetPassword,
        updatePassword,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;