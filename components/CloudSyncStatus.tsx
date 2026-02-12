import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { migrateLocalDataToCloud, MigrationProgress } from '../services/migrationService';
import { AuthModal } from './auth/AuthModal';
import { UserMenu } from './auth/UserMenu';
import { Cloud, CloudOff, Upload } from 'lucide-react';

interface CloudSyncStatusProps {
  onMigrationComplete?: () => void;
}

export const CloudSyncStatus: React.FC<CloudSyncStatusProps> = ({ onMigrationComplete }) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
    
    if (isSupabaseConfigured()) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setIsAuthenticated(!!user);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAuthenticated(!!session?.user);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const handleMigration = async () => {
    setShowMigrationModal(true);
    setMigrationResult(null);
    
    const result = await migrateLocalDataToCloud((progress) => {
      setMigrationProgress(progress);
    });
    
    setMigrationResult(result);
    
    if (result.success) {
      onMigrationComplete?.();
    }
  };

  if (!isConfigured) {
    return (
      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
        <CloudOff size={18} />
        <span className="text-sm">Cloud not configured</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Cloud size={18} />
          <span className="text-sm font-medium">Enable Cloud Sync</span>
        </button>
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            setIsAuthenticated(true);
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          <Cloud size={18} />
          <span className="text-sm font-medium">Cloud Sync Active</span>
        </div>
        
        <button
          onClick={handleMigration}
          className="flex items-center gap-2 text-purple-600 bg-purple-50 px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors"
          title="Migrate local data to cloud"
        >
          <Upload size={18} />
          <span className="text-sm">Migrate Data</span>
        </button>
        
        <UserMenu />
      </div>

      {/* Migration Modal */}
      {showMigrationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Migrating Data to Cloud</h2>
            
            {migrationProgress && !migrationResult && (
              <div className="space-y-3">
                <div className="text-sm text-gray-600">{migrationProgress.message}</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(migrationProgress.current / migrationProgress.total) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}

            {migrationResult && (
              <div className={`p-4 rounded-lg ${migrationResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {migrationResult.message}
              </div>
            )}

            <button
              onClick={() => {
                setShowMigrationModal(false);
                setMigrationProgress(null);
                setMigrationResult(null);
              }}
              className="mt-4 w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
