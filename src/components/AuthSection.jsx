import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, LogOut, User } from 'lucide-react';

const AuthSection = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session) {
          setShowAuthForm(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: "Login successful!",
          description: "Welcome back",
        });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });
        if (error) throw error;
        toast({
          title: "Registration successful!",
          description: "Check your email to confirm registration",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Logged in as:</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </Card>
    );
  }

  if (showAuthForm) {
    return (
      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">
              {isLogin ? 'Login' : 'Sign Up'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin ? 'Login to your account' : 'Create a new account'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-primary hover:underline"
                >
                  {isLogin ? "Don't have an account? Sign up here" : 'Have an account? Login here'}
                </button>
              </div>
            </div>
          </form>

          <Button 
            variant="ghost" 
            onClick={() => setShowAuthForm(false)}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 mb-6">
      <div className="text-center">
        <Button 
          onClick={() => setShowAuthForm(true)}
          className="flex items-center gap-2"
        >
          <User className="h-4 w-4" />
          Login / Sign Up
        </Button>
      </div>
    </Card>
  );
};

export default AuthSection;