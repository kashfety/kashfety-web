import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require admin or super_admin role
    const authResult = requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403
    }

    const body = await request.json();

    const { name, name_ar, name_ku, description, icon_name, color_code, is_active, display_order } = body;
    
    // Validate required fields
    if (!name) {
      return NextResponse.json({ 
        error: 'Name is required' 
      }, { status: 400 });
    }

    // Check for duplicate name
    const { data: existingSpecialty } = await supabase
      .from('specialties')
      .select('id')
      .eq('name', name)
      .single();

    if (existingSpecialty) {
      return NextResponse.json({ 
        error: 'A specialty with this name already exists' 
      }, { status: 400 });
    }

    // Create specialty record with name_en defaulting to "General"
    const specialtyData = {
      name,
      name_en: 'General',
      name_ar: name_ar || null,
      name_ku: name_ku || null,
      description: description || null,
      icon_name: icon_name || 'medical_services',
      color_code: color_code || '#4CAF50',
      is_active: is_active !== undefined ? is_active : true,
      display_order: display_order || 0,
      order_index: display_order || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: specialty, error: specialtyError } = await supabase
      .from('specialties')
      .insert(specialtyData)
      .select()
      .single();

    if (specialtyError) {
      return NextResponse.json({ error: 'Failed to create specialty record' }, { status: 500 });
    }

    
    return NextResponse.json({
      success: true,
      data: {
        specialty
      }
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
