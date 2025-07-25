import { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import AuthSection from '@/components/AuthSection';
import AudioUploader from '@/components/AudioUploader';
import UserProfile from '@/components/UserProfile';

const AppPopover = () => {
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 right-4 z-50 rounded-full shadow-lg bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/10"
        >
          <Mic className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0 border-primary/20 shadow-xl"
        align="end"
        sideOffset={8}
      >
        <div className="bg-gradient-to-br from-background via-background to-primary/5 p-6 space-y-6">
          <AuthSection />
          
          {user && (
            <>
              <UserProfile />
              <AudioUploader />
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AppPopover;