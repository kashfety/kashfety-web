-- Fix users table constraint to allow super_admin role
-- Safe to run multiple times

-- Drop the existing constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add updated constraint that includes super_admin
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role = ANY (ARRAY['patient'::text, 'doctor'::text, 'admin'::text, 'center'::text, 'super_admin'::text]));

-- Verify constraint is updated
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'users_role_check';
