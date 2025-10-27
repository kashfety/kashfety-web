// Test script to verify Supabase Storage signed URL generation
// Run this with: node test-storage.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testStorage() {
  try {
    console.log('🔍 Testing Supabase Storage Configuration...');
    
    // Check if buckets exist
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }
    
    console.log('📦 Available buckets:', buckets.map(b => `${b.id} (${b.public ? 'public' : 'private'})`));
    
    // Test if we can generate a signed URL for the existing file
    const testFilePath = 'lab-results/5c4cf5df-fd07-4192-b5ad-170f6239e4a8/76b64a8c-6cb1-4d78-bba6-88c03d7ed4e3/1757347616812-ass2_accounting.pdf';
    
    console.log(`🔗 Testing signed URL generation for: ${testFilePath}`);
    
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('medical-documents')
      .createSignedUrl(testFilePath, 3600); // 1 hour
    
    if (signedUrlError) {
      console.error('❌ Error generating signed URL:', signedUrlError);
      return;
    }
    
    console.log('✅ Signed URL generated successfully:');
    console.log('🔗 URL:', signedUrlData.signedUrl);
    console.log('⏰ Expires at:', new Date(Date.now() + 3600 * 1000));
    
    // Test if the file actually exists
    const { data: fileExists, error: downloadError } = await supabase.storage
      .from('medical-documents')
      .download(testFilePath);
    
    if (downloadError) {
      console.error('❌ File download test failed:', downloadError);
    } else {
      console.log('✅ File exists and can be downloaded');
      console.log('📄 File size:', fileExists.size, 'bytes');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testStorage();
