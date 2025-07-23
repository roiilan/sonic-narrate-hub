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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-6 py-8 max-w-lg">
        <AuthSection />
        
        {user && <AudioUploader />}
      </div>
    </div>
  );
};

export default Index;
