-- Re-enable RLS on profiles table - this is critical for security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to only view their own profile (read-only access)
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- NO INSERT, UPDATE, DELETE policies for clients
-- All modifications will be done via Edge Functions with service role