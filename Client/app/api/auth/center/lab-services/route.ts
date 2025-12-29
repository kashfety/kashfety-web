import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateCenterExists } from '../utils/center-validation';
import { getUserFromAuth } from '../utils/jwt-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromAuth(request);
    if (!user || user.role !== 'center') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get center ID - either from user.center_id or use user.id if user is the center
    const centerId = user.center_id || user.id;

    // Validate that center exists before proceeding
    const centerValidation = await validateCenterExists(centerId);
    if (!centerValidation.exists) {
      return NextResponse.json({ 
        error: centerValidation.error || 'Center not found. Please ensure the center is properly registered.',
        services: []
      }, { status: 404 });
    }

    const { data: services, error } = await supabase
      .from('center_lab_services')
      .select(`
        *,
        lab_test_types (
          id,
          name,
          category,
          code,
          default_fee
        )
      `)
      .eq('center_id', centerId)
      .eq('is_active', true);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
    }

    return NextResponse.json({ services: services || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromAuth(request);
    if (!user || user.role !== 'center') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { services } = await request.json();
    
    if (!Array.isArray(services)) {
      return NextResponse.json({ error: 'Services must be an array' }, { status: 400 });
    }

    const centerId = user.center_id || user.id;

    // Validate that center exists before proceeding
    const centerValidation = await validateCenterExists(centerId);
    if (!centerValidation.exists) {
      return NextResponse.json({ 
        error: centerValidation.error || 'Center not found. Please ensure the center is properly registered.' 
      }, { status: 404 });
    }

    // First, deactivate all existing services for this center
    await supabase
      .from('center_lab_services')
      .update({ is_active: false })
      .eq('center_id', centerId);

    // Then insert/update the new services
    if (services.length > 0) {
      const serviceUpdates = services.map(service => ({
        center_id: centerId,
        lab_test_type_id: service.lab_test_type_id,
        base_fee: service.base_fee,
        is_active: service.is_active !== false, // Default to true
      }));

      const { error } = await supabase
        .from('center_lab_services')
        .upsert(serviceUpdates, { 
          onConflict: 'center_id,lab_test_type_id',
          ignoreDuplicates: false 
        });

      if (error) {
        return NextResponse.json({ error: 'Failed to save services' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
