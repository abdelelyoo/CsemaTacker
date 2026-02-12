import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        onSuccess();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {isLogin ? 'Sign In' : 'Create Account'}
        </h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}
        
        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:underline"
          >
            {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
