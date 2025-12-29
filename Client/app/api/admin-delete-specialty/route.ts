import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
  try {
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { specialtyId } = body;
    
    if (!specialtyId) {
      return NextResponse.json({ 
        error: 'Specialty ID is required' 
      }, { status: 400 });
    }


    // Check if specialty is being used by any doctors
    const { data: doctors, error: doctorsError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'doctor')
      .eq('specialty', specialtyId)
      .limit(1);

    if (doctorsError) {
    }

    if (doctors && doctors.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete specialty that is assigned to doctors. Please reassign doctors first.' 
      }, { status: 400 });
    }


    // Delete specialty
    const { error: deleteError } = await supabase
      .from('specialties')
      .delete()
      .eq('id', specialtyId);

    if (deleteError) {
      return NextResponse.json({ 
        error: 'Failed to delete specialty',
        details: deleteError.message 
      }, { status: 500 });
    }

    
    return NextResponse.json({
      success: true,
      message: 'Specialty deleted successfully'
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
