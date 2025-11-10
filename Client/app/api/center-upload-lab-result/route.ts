import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log('📤 [Center Upload Lab Result] Request received');
    
    const formData = await request.formData();
    const booking_id = formData.get('booking_id') as string;
    const result_notes = formData.get('result_notes') as string;
    const file = formData.get('labResult') as File;

    console.log('📤 [Center Upload Lab Result] Data:', { booking_id, result_notes, hasFile: !!file });

    if (!booking_id) {
      return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ success: false, error: 'Lab result file is required' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify booking exists
    const { data: booking, error: bookingError } = await supabase
      .from('lab_bookings')
      .select('id, patient_id, center_id, lab_test_type_id')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('❌ Booking not found:', bookingError);
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Upload file to Supabase Storage
    const fileName = `${booking_id}_${Date.now()}_${file.name}`;
    const filePath = `lab-results/${booking.center_id}/${fileName}`;
    
    console.log('📤 [Center Upload Lab Result] Uploading file to:', filePath);

    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('medical-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ File upload error:', uploadError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to upload file',
        details: uploadError.message 
      }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('medical-documents')
      .getPublicUrl(filePath);

    console.log('📤 [Center Upload Lab Result] File uploaded successfully:', urlData.publicUrl);

    // Update booking with result
    const { data: updatedBooking, error: updateError } = await supabase
      .from('lab_bookings')
      .update({
        result_file_url: urlData.publicUrl,
        result_file_path: filePath,
        result_notes: result_notes || '',
        result_date: new Date().toISOString(),
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update booking:', updateError);
      
      // Try to clean up uploaded file
      try {
        await supabase.storage.from('medical-documents').remove([filePath]);
      } catch (cleanupError) {
        console.error('⚠️ Failed to cleanup uploaded file:', cleanupError);
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update booking',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ [Center Upload Lab Result] Lab result uploaded successfully');
    return NextResponse.json({
      success: true,
      message: 'Lab result uploaded successfully',
      booking: updatedBooking,
      file_url: urlData.publicUrl
    });

  } catch (error: any) {
    console.error('❌ Center upload lab result error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

