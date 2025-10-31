import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateOldUrls() {
  try {
    // Find all bookings with signed URLs (containing /sign/)
    const { data: bookings, error: fetchError } = await supabase
      .from('lab_bookings')
      .select('id, result_file_url, result_file_path')
      .like('result_file_url', '%/sign/%');
    
    if (fetchError) {
      console.error('Error fetching bookings:', fetchError);
      return;
    }
    
    console.log(`Found ${bookings.length} bookings with signed URLs`);
    
    for (const booking of bookings) {
      if (booking.result_file_path) {
        // Generate new public URL
        const { data } = supabase.storage
          .from('medical-documents')
          .getPublicUrl(booking.result_file_path);
        
        // Update the booking with the new public URL
        const { error: updateError } = await supabase
          .from('lab_bookings')
          .update({ result_file_url: data.publicUrl })
          .eq('id', booking.id);
        
        if (updateError) {
          console.error(`Error updating booking ${booking.id}:`, updateError);
        } else {
          console.log(`Updated booking ${booking.id}`);
          console.log(`  Old: ${booking.result_file_url.substring(0, 100)}...`);
          console.log(`  New: ${data.publicUrl}`);
        }
      }
    }
    
    console.log('URL update complete!');
    
  } catch (err) {
    console.error('Error:', err);
  }
}

updateOldUrls();
