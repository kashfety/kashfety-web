import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const AUTH_FALLBACK_ENABLED = process.env.AUTH_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');

    const body = await request.json();
    const { id } = await params;

    if (authHeader) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/appointments/${id}/cancel`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (response.ok) return NextResponse.json(data, { status: response.status });
      } catch (e) {
        // continue to fallback
      }
    }

    if (!AUTH_FALLBACK_ENABLED) {
      return NextResponse.json({ success: false, message: 'Authorization header required' }, { status: 401 });
    }

    // Supabase fallback: set status=cancelled
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', cancellation_reason: body?.reason || 'Cancelled by doctor' })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Appointment cancelled' });
  } catch (error) {
    console.error('Proxy error (cancel):', error);
    return NextResponse.json({ success: false, message: 'Failed to cancel appointment' }, { status: 500 });
  }
}
