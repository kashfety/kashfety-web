import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
  try {
    console.log('📝 [Admin Update Specialty] Starting specialty update');
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📝 [Admin Update Specialty] Request data received');

    const { specialtyId, ...updates } = body;
    
    if (!specialtyId) {
      return NextResponse.json({ 
        error: 'Specialty ID is required' 
      }, { status: 400 });
    }

    // Validate required fields if provided
    if (updates.name !== undefined && !updates.name.trim()) {
      return NextResponse.json({ 
        error: 'Name cannot be empty' 
      }, { status: 400 });
    }

    if (updates.name_en !== undefined && !updates.name_en.trim()) {
      return NextResponse.json({ 
        error: 'English name cannot be empty' 
      }, { status: 400 });
    }

    // Check for duplicate name if name is being updated
    if (updates.name) {
      const { data: existingSpecialty } = await supabase
        .from('specialties')
        .select('id')
        .eq('name', updates.name)
        .neq('id', specialtyId)
        .single();

      if (existingSpecialty) {
        return NextResponse.json({ 
          error: 'A specialty with this name already exists' 
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Sync order_index with display_order if display_order is provided
    if (updates.display_order !== undefined) {
      updateData.order_index = updates.display_order;
    }

    console.log('📝 [Admin Update Specialty] Updating specialty:', updateData);

    // Update specialty record
    const { data: specialty, error: specialtyError } = await supabase
      .from('specialties')
      .update(updateData)
      .eq('id', specialtyId)
      .select()
      .single();

    if (specialtyError) {
      console.error('❌ [Admin Update Specialty] Update error:', specialtyError);
      return NextResponse.json({ 
        error: 'Failed to update specialty',
        details: specialtyError.message 
      }, { status: 500 });
    }

    console.log('✅ [Admin Update Specialty] Specialty updated successfully');
    
    return NextResponse.json({
      success: true,
      specialty
    });

  } catch (error: any) {
    console.error('❌ [Admin Update Specialty] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
