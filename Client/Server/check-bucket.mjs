import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkBucket() {
  try {
    const { data, error } = await supabase.storage.getBucket('medical-documents');
    console.log('Bucket config:', JSON.stringify(data, null, 2));
    if (error) console.error('Error:', error);
  } catch (err) {
    console.error('Error:', err);
  }
}

checkBucket();
