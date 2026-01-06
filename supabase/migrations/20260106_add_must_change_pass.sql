-- Migration: Add must_change_password flag to profiles
-- Purpose: Allow admins to force password change for new users
-- Date: 2026-01-06

-- Add must_change_password column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.must_change_password IS 
'When TRUE, user must change password before accessing the system. Set by admin when creating users with temporary passwords.';

-- Create index for efficient filtering (optional, for admin dashboards)
CREATE INDEX IF NOT EXISTS idx_profiles_must_change_password 
ON public.profiles(must_change_password) 
WHERE must_change_password = TRUE;
