-- Super Admin Schema Updates
-- This script adds super admin functionality to the existing database

-- 1. Update users table to support super_admin role
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role = ANY (ARRAY['patient'::text, 'doctor'::text, 'admin'::text, 'center'::text, 'super_admin'::text]));

-- 2. Add admin management fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS admin_permissions JSONB DEFAULT '{"all": true}'::jsonb,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lock_reason TEXT,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES public.users(id);

-- 3. Create admin_activity table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.admin_activity (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'user_created', 'user_updated', 'user_deleted', 'center_created', etc.
    target_type TEXT NOT NULL, -- 'user', 'center', 'appointment', 'system'
    target_id UUID, -- ID of the affected resource
    action_details JSONB DEFAULT '{}'::jsonb, -- Detailed information about the action
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id TEXT
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_id ON public.admin_activity(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action_type ON public.admin_activity(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target_type ON public.admin_activity(target_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON public.admin_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login_at);

-- 5. Create system_settings table for super admin configurations
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type TEXT NOT NULL, -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- Can regular users see this setting?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id)
);

-- 6. Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public)
VALUES 
    ('system_name', '"Vezeeta Clone"', 'string', 'System display name', true),
    ('max_appointment_days_ahead', '30', 'number', 'Maximum days ahead patients can book appointments', true),
    ('require_admin_approval_for_doctors', 'true', 'boolean', 'Whether new doctor registrations require admin approval', false),
    ('maintenance_mode', 'false', 'boolean', 'Put system in maintenance mode', false),
    ('max_login_attempts', '5', 'number', 'Maximum login attempts before account lock', false),
    ('session_timeout_minutes', '480', 'number', 'Session timeout in minutes', false)
ON CONFLICT (setting_key) DO NOTHING;

-- 7. Create admin_notifications table for system notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL, -- 'info', 'warning', 'error', 'success'
    target_role TEXT NOT NULL, -- 'admin', 'super_admin', 'all'
    target_user_id UUID REFERENCES public.users(id), -- Specific user (optional)
    is_read BOOLEAN DEFAULT false,
    is_global BOOLEAN DEFAULT false, -- Show to all users of target_role
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 8. Create indexes for admin notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_target_role ON public.admin_notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_target_user ON public.admin_notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at);

-- 9. Function to log admin activity
CREATE OR REPLACE FUNCTION log_admin_activity(
    p_admin_id UUID,
    p_action_type TEXT,
    p_target_type TEXT,
    p_target_id UUID DEFAULT NULL,
    p_action_details JSONB DEFAULT '{}'::jsonb,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO public.admin_activity (
        admin_id, action_type, target_type, target_id, action_details, 
        ip_address, user_agent, session_id
    )
    VALUES (
        p_admin_id, p_action_type, p_target_type, p_target_id, p_action_details,
        p_ip_address, p_user_agent, p_session_id
    )
    RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Update role dashboard function to include super admin
CREATE OR REPLACE FUNCTION get_role_dashboard(user_role TEXT) 
RETURNS TEXT AS $$
BEGIN
    CASE user_role
        WHEN 'super_admin' THEN RETURN '/super-admin-dashboard';
        WHEN 'admin' THEN RETURN '/admin-dashboard';
        WHEN 'doctor' THEN RETURN '/doctor-dashboard';
        WHEN 'center' THEN RETURN '/center-dashboard';
        ELSE RETURN '/';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 11. Grant appropriate permissions (adjust as needed for your setup)
-- Note: These might need to be adjusted based on your authentication setup

COMMENT ON TABLE public.admin_activity IS 'Tracks all administrative actions performed by admin and super admin users';
COMMENT ON TABLE public.system_settings IS 'System-wide configuration settings managed by super admins';
COMMENT ON TABLE public.admin_notifications IS 'Notifications and alerts for administrative users';

-- 12. Sample super admin user (update credentials as needed)
-- This creates a default super admin account - CHANGE THE PASSWORD!
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'super_admin') THEN
        INSERT INTO public.users (
            uid, email, name, first_name, last_name, role, 
            default_dashboard, is_first_login, admin_permissions
        ) VALUES (
            'super-admin-001',
            'superadmin@vezeeta-clone.com',
            'Super Administrator',
            'Super',
            'Administrator',
            'super_admin',
            '/super-admin-dashboard',
            false,
            '{"user_management": true, "admin_management": true, "system_settings": true, "audit_logs": true, "all": true}'::jsonb
        );
        
        -- Log the creation
        INSERT INTO public.admin_activity (
            admin_id, action_type, target_type, action_details
        ) VALUES (
            (SELECT id FROM public.users WHERE email = 'superadmin@vezeeta-clone.com'),
            'system_initialization',
            'system',
            '{"message": "Super admin account created during schema update"}'::jsonb
        );
    END IF;
END $$;

COMMIT;
