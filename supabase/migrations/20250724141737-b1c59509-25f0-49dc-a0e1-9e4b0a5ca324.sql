-- Remove all RLS policies from profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Disable RLS completely on profiles table - only server will access it
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;