import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';

export const UserMenu: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-sm font-medium">{user.email}</div>
        <div className="text-xs text-green-600">Cloud Sync Active</div>
      </div>
      <button
        onClick={handleSignOut}
        className="text-sm text-red-600 hover:text-red-800 px-3 py-1 border border-red-300 rounded hover:bg-red-50"
      >
        Sign Out
      </button>
    </div>
  );
};
