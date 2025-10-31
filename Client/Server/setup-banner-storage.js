import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setupBannerStorage() {
    try {
        console.log('🔧 Setting up banner storage...');
        
        // Create the banners bucket if it doesn't exist
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
            console.error('❌ Error listing buckets:', listError);
            return;
        }
        
        const bannersBucket = buckets.find(bucket => bucket.name === 'banners');
        
        if (!bannersBucket) {
            console.log('📁 Creating banners bucket...');
            const { data, error } = await supabase.storage.createBucket('banners', {
                public: true,
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
                fileSizeLimit: 10485760 // 10MB
            });
            
            if (error) {
                console.error('❌ Error creating bucket:', error);
                return;
            }
            
            console.log('✅ Banners bucket created successfully');
        } else {
            console.log('✅ Banners bucket already exists');
        }
        
        // Set up RLS policies for the bucket
        console.log('🔐 Setting up storage policies...');
        
        console.log('📝 Storage policies configured (RLS policies need to be set manually in Supabase dashboard)');
        console.log('💡 Manual steps required in Supabase dashboard:');
        console.log('   1. Go to Storage > Policies');
        console.log('   2. Create policy for banners bucket:');
        console.log('      - Name: "Admins can upload and delete banners"');
        console.log('      - Operation: INSERT, UPDATE, DELETE');
        console.log('      - Target roles: authenticated');
        console.log('      - Policy definition:');
        console.log('        (SELECT role FROM public.users WHERE id = auth.uid()) IN (\'admin\', \'super_admin\')');
        console.log('   3. Create policy for banners bucket:');
        console.log('      - Name: "Public read access to banners"');
        console.log('      - Operation: SELECT');
        console.log('      - Target roles: public');
        console.log('      - Policy definition: true');
        
        console.log('🎉 Banner storage setup completed!');
        console.log('📱 Note: Banners will be used in the mobile application');
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

setupBannerStorage();
