import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setupProfilePictureStorage() {
    try {
        console.log('🔧 Setting up profile picture storage...');
        
        // Create the profile-pictures bucket if it doesn't exist
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
            console.error('❌ Error listing buckets:', listError);
            return;
        }
        
        const profilePicturesBucket = buckets.find(bucket => bucket.name === 'profile-pictures');
        
        if (!profilePicturesBucket) {
            console.log('📁 Creating profile-pictures bucket...');
            const { data, error } = await supabase.storage.createBucket('profile-pictures', {
                public: true,
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
                fileSizeLimit: 5242880 // 5MB
            });
            
            if (error) {
                console.error('❌ Error creating bucket:', error);
                return;
            }
            
            console.log('✅ Profile pictures bucket created successfully');
        } else {
            console.log('✅ Profile pictures bucket already exists');
        }
        
        // Set up RLS policies for the bucket
        console.log('🔐 Setting up storage policies...');
        
        // Policy to allow doctors to upload their own profile pictures
        const uploadPolicy = {
            name: 'Doctors can upload their profile pictures',
            definition: `(auth.uid()::text = (storage.foldername(name))[1])`,
            check: null,
            command: 'INSERT'
        };
        
        // Policy to allow public read access to profile pictures
        const readPolicy = {
            name: 'Public read access to profile pictures',
            definition: 'true',
            check: null,
            command: 'SELECT'
        };
        
        console.log('📝 Storage policies configured (RLS policies need to be set manually in Supabase dashboard)');
        console.log('💡 Manual steps required in Supabase dashboard:');
        console.log('   1. Go to Storage > Policies');
        console.log('   2. Create policy for profile-pictures bucket:');
        console.log('      - Name: "Doctors can upload their profile pictures"');
        console.log('      - Operation: INSERT');
        console.log('      - Target roles: authenticated');
        console.log('      - Policy definition: auth.uid()::text = (storage.foldername(name))[1]');
        console.log('   3. Create policy for profile-pictures bucket:');
        console.log('      - Name: "Public read access to profile pictures"');
        console.log('      - Operation: SELECT');
        console.log('      - Target roles: public');
        console.log('      - Policy definition: true');
        
        console.log('🎉 Profile picture storage setup completed!');
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

setupProfilePictureStorage();