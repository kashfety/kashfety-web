-- Add Arabic name columns to users, centers, and specialties tables
-- Run this script in your SQL editor

-- 1. Add Arabic name columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS name_ar TEXT,
ADD COLUMN IF NOT EXISTS first_name_ar TEXT,
ADD COLUMN IF NOT EXISTS last_name_ar TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN public.users.name_ar IS 'User full name in Arabic';
COMMENT ON COLUMN public.users.first_name_ar IS 'User first name in Arabic';
COMMENT ON COLUMN public.users.last_name_ar IS 'User last name in Arabic';

-- 2. Add Arabic name column to centers table
ALTER TABLE public.centers 
ADD COLUMN IF NOT EXISTS name_ar TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.centers.name_ar IS 'Center name in Arabic';

-- 3. Specialties table already has name_ar column based on schema
-- But let's ensure it exists and add a comment
ALTER TABLE public.specialties 
ADD COLUMN IF NOT EXISTS name_ar VARCHAR DEFAULT 'عام';

-- Add comment to explain the column
COMMENT ON COLUMN public.specialties.name_ar IS 'Specialty name in Arabic';

-- Verify the changes
SELECT 
    'users' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name IN ('name_ar', 'first_name_ar', 'last_name_ar')

UNION ALL

SELECT 
    'centers' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'centers' 
    AND column_name = 'name_ar'

UNION ALL

SELECT 
    'specialties' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'specialties' 
    AND column_name = 'name_ar';
