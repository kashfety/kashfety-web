-- Migration: Fix doctor_schedules unique constraint to allow multiple centers per day
-- This migration drops the old constraint and adds a new one that includes center_id

-- Step 1: Drop the existing unique constraint (if it exists)
ALTER TABLE public.doctor_schedules 
DROP CONSTRAINT IF EXISTS doctor_schedules_doctor_id_day_of_week_key;

-- Step 2: Add a new unique constraint that includes center_id
-- This allows doctors to have schedules at multiple centers on the same day
ALTER TABLE public.doctor_schedules 
ADD CONSTRAINT doctor_schedules_doctor_id_day_of_week_center_id_key 
UNIQUE (doctor_id, day_of_week, center_id);

-- Note: After running this migration, doctors will be able to have
-- separate schedules for the same day at different centers.

