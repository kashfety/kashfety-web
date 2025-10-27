import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const AUTH_FALLBACK_ENABLED = process.env.AUTH_FALLBACK_ENABLED !== '0';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader && !AUTH_FALLBACK_ENABLED) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId } = await context.params;
    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId param is required' }, { status: 400 });
    }

    // First try unified-auth endpoint if token provided
    if (authHeader) {
      try {
        // First try unified-auth endpoint
        let response = await fetch(`${BACKEND_URL}/api/auth/doctor/appointments/${appointmentId}/status`, {
          method: 'PUT',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        // If unified-auth rejects due to validation (400), try doctor-dashboard route as fallback
        if (!response.ok && response.status === 400) {
          let unifiedError: any = null;
          try { unifiedError = await response.json(); } catch {}

          const msg = (unifiedError?.message || unifiedError?.error || '').toString().toLowerCase();
          if (msg.includes('valid status') || msg.includes('invalid status')) {
            const alt = await fetch(`${BACKEND_URL}/api/doctor-dashboard/appointments/${appointmentId}/status`, {
              method: 'PUT',
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            });
            const altData = await alt.json().catch(() => ({}));
            if (!alt.ok) {
              return NextResponse.json(altData, { status: alt.status });
            }
            return NextResponse.json(altData);
          }
          // Not a validation-style error; pass through original
          return NextResponse.json(unifiedError || { error: 'Bad Request' }, { status: 400 });
        }

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          // If role/ownership forbidden, optionally fallback below
          if (response.status === 403 && AUTH_FALLBACK_ENABLED) {
            // Fall through to Supabase fallback below
          } else {
            return NextResponse.json(data, { status: response.status });
          }
        } else {
          return NextResponse.json(data);
        }
      } catch (e) {
        // fall through to Supabase fallback if enabled
      }
    }

    // Supabase fallback path (DEV): requires doctor_id via query/body
    if (!AUTH_FALLBACK_ENABLED) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctor_id') || body?.doctor_id;
    const status = body?.status;

    if (!doctorId) {
      return NextResponse.json({ error: 'doctor_id is required for fallback' }, { status: 400 });
    }
    if (!status || !['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(status)) {
      return NextResponse.json({ error: 'Valid status required (scheduled, confirmed, completed, cancelled, no_show)' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    // Verify appointment belongs to doctor
    const { data: appt, error: fetchError } = await supabase
      .from('appointments')
      .select('id, doctor_id')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    if (appt.doctor_id !== doctorId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', appointmentId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Fallback update status error:', updateError);
      return NextResponse.json({ error: 'Failed to update appointment status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Appointment status updated successfully', appointment: updated });
  } catch (error) {
    console.error('Proxy error (/api/auth/doctor/appointments/[appointmentId]/status PUT):', error);
    return NextResponse.json({ error: 'Failed to connect to backend server' }, { status: 500 });
  }
}
