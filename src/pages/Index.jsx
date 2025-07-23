import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AuthSection from '@/components/AuthSection';
import AudioUploader from '@/components/AudioUploader';

const Index = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Smart Audio Transcription</h1>
          <p className="text-muted-foreground">Upload an audio file and get accurate transcription</p>
        </div>

        <AuthSection />
        
        {user && <AudioUploader />}
        
        {!user && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Login to start uploading audio files
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
