-- Fix function search path security issue
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, tokens, is_active_subscription)
  VALUES (NEW.id, 50, false);
  RETURN NEW;
END;
$$;