import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Create unique filename
    const timestamp = Date.now();
    const filename = `lab_result_${bookingId}_${timestamp}.pdf`;
    
    // Define upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'lab-results');
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }

    // Save file
    const filePath = join(uploadDir, filename);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    await writeFile(filePath, buffer);

    // Update database with file URL
    const file_url = `/uploads/lab-results/${filename}`;
    
    const { data, error } = await supabase
      .from('lab_bookings')
      .update({ 
        result_file_url: file_url,
        result_date: new Date().toISOString().split('T')[0],
        status: 'completed'
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      return NextResponse.json({ error: 'Failed to update booking record' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      file_url,
      message: 'Lab result uploaded successfully',
      booking: data
    });

  } catch (error) {
    console.error('Upload result error:', error);
    return NextResponse.json({ error: 'Failed to upload result' }, { status: 500 });
  }
}
