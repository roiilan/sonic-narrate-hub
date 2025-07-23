import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogOut, User, Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png';

const AuthSection = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
    } catch (error) {
      setError(error.message);
      toast({
        title: "Sign-in Error",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Logout error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logged out successfully",
        description: "Goodbye!",
      });
    }
  };

  if (user) {
    return (
      <Card className="p-6 mb-8 bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Welcome back</p>
              <p className="font-semibold text-foreground">{user.email}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-2 hover:bg-destructive/10 hover:border-destructive/30"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-10 mb-8 text-center bg-gradient-to-br from-card via-card to-primary/5 border border-primary/20 shadow-lg">
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-purple-500 rounded-2xl flex items-center justify-center p-4 shadow-lg">
            <img src={logo} alt="Open AudioAI" className="w-full h-full object-contain" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Open AudioAI
            </h1>
            <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Transform your audio files into text with our powerful AI transcription service
            </p>
          </div>
        </div>

        <div className="max-w-xs mx-auto">
          <Button 
            onClick={signInWithGoogle}
            disabled={isLoading}
            size="lg"
            className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm h-12"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </div>
            )}
          </Button>

          {error && (
            <div className="text-sm text-destructive mt-4 p-3 bg-destructive/10 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AuthSection;