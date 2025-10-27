-- Create banners table to store banner metadata
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    target_audience VARCHAR(50) DEFAULT 'all', -- 'all', 'patients', 'doctors', 'centers'
    click_url TEXT, -- Optional URL to navigate to when banner is clicked
    click_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_banners_active ON banners(is_active);
CREATE INDEX idx_banners_display_order ON banners(display_order);
CREATE INDEX idx_banners_created_at ON banners(created_at DESC);
CREATE INDEX idx_banners_target_audience ON banners(target_audience);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER trigger_update_banners_updated_at
    BEFORE UPDATE ON banners
    FOR EACH ROW
    EXECUTE FUNCTION update_banners_updated_at();

-- Add RLS policies (optional - since you're using service role key, these won't apply)
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view active banners
CREATE POLICY "Users can view active banners"
    ON banners FOR SELECT
    USING (is_active = true);

-- Policy for admins to manage all banners
CREATE POLICY "Admins can manage all banners"
    ON banners FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Grant permissions
GRANT ALL ON banners TO authenticated;
GRANT ALL ON banners TO service_role;

-- Add comment
COMMENT ON TABLE banners IS 'Stores banner images with metadata for display in mobile application';
