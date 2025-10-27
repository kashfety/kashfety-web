import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function makeBucketPublic() {
  try {
    const { data, error } = await supabase.storage.updateBucket('medical-documents', {
      public: true
    });
    
    if (error) {
      console.error('Error updating bucket:', error);
    } else {
      console.log('Bucket updated successfully:', data);
    }
    
    // Verify the change
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('medical-documents');
    if (bucketError) {
      console.error('Error checking bucket:', bucketError);
    } else {
      console.log('Updated bucket config:', JSON.stringify(bucketData, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

makeBucketPublic();
