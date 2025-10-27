-- Create admin_activity table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(255),
    action_details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_settings table for application configuration
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_editable BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_id ON admin_activity(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON admin_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action_type ON admin_activity(action_type);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Insert some default system settings
INSERT INTO system_settings (setting_key, setting_value, description, category) VALUES
    ('app_name', '"Doctor Appointment System"', 'Application name displayed in the UI', 'general'),
    ('maintenance_mode', 'false', 'Enable/disable maintenance mode', 'system'),
    ('max_file_size', '10485760', 'Maximum file upload size in bytes (10MB)', 'uploads'),
    ('session_timeout', '3600', 'Session timeout in seconds', 'security'),
    ('password_min_length', '8', 'Minimum password length', 'security'),
    ('email_notifications', 'true', 'Enable email notifications', 'notifications'),
    ('sms_notifications', 'true', 'Enable SMS notifications', 'notifications'),
    ('backup_frequency', '"daily"', 'Database backup frequency', 'system'),
    ('timezone', '"UTC"', 'Default application timezone', 'general'),
    ('date_format', '"YYYY-MM-DD"', 'Default date format', 'general')
ON CONFLICT (setting_key) DO NOTHING;
