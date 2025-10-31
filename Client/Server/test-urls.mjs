import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testPublicUrl() {
  try {
    // Test the getPublicUrl function with a sample path
    const { data } = supabase.storage
      .from('medical-documents')
      .getPublicUrl('lab-results/test-file.pdf');
    
    console.log('Public URL format:', data.publicUrl);
    console.log('Contains /sign/:', data.publicUrl.includes('/sign/'));
    console.log('Contains /object/public/:', data.publicUrl.includes('/object/public/'));
    
    // Check if there are any lab bookings with stored signed URLs
    const { data: bookings, error } = await supabase
      .from('lab_bookings')
      .select('id, result_file_url, result_file_path')
      .not('result_file_url', 'is', null)
      .limit(5);
    
    if (error) {
      console.error('Error fetching bookings:', error);
    } else {
      console.log('\nSample stored URLs:');
      bookings.forEach(booking => {
        console.log(`Booking ${booking.id}:`);
        console.log(`  URL: ${booking.result_file_url}`);
        console.log(`  Path: ${booking.result_file_path}`);
        console.log(`  Has /sign/: ${booking.result_file_url?.includes('/sign/')}`);
        console.log('');
      });
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

testPublicUrl();
