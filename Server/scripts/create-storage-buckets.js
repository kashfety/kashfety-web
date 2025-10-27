// Script to create required storage buckets in Supabase
// Run this once to set up your storage infrastructure

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createStorageBuckets() {
  console.log('🚀 Creating Supabase Storage Buckets...');

  const buckets = [
    { 
      name: 'doctor-certificates', 
      public: false,
      description: 'Store doctor medical certificates for approval'
    },
    { 
      name: 'lab-results', 
      public: false,
      description: 'Store lab test result files'
    },
    { 
      name: 'profile-pictures', 
      public: true,
      description: 'Store user profile pictures'
    }
  ];

  for (const bucket of buckets) {
    try {
      console.log(`Creating bucket: ${bucket.name}...`);
      
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        allowedMimeTypes: bucket.name === 'profile-pictures' 
          ? ['image/jpeg', 'image/png', 'image/gif']
          : ['application/pdf', 'image/jpeg', 'image/png'],
        fileSizeLimit: bucket.name === 'profile-pictures' ? 5242880 : 10485760 // 5MB for images, 10MB for docs
      });

      if (error) {
        if (error.message.includes('already exists')) {
          console.log(`✅ Bucket ${bucket.name} already exists`);
        } else {
          console.error(`❌ Error creating ${bucket.name}:`, error);
        }
      } else {
        console.log(`✅ Created bucket: ${bucket.name}`);
      }
    } catch (err) {
      console.error(`❌ Failed to create ${bucket.name}:`, err);
    }
  }

  // List all buckets to verify
  console.log('\n📋 Listing all storage buckets:');
  const { data: bucketList, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Error listing buckets:', listError);
  } else {
    bucketList.forEach(bucket => {
      console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
  }
}

createStorageBuckets().catch(console.error);
