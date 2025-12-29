import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ centerId: string }> | { centerId: string } }
) {
  try {
    // Handle params as Promise (Next.js 15) or object (Next.js 14)
    const resolvedParams = await Promise.resolve(params);
    const { centerId } = resolvedParams;
    if (!centerId) {
      return NextResponse.json({ success: false, message: 'centerId is required' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: center, error } = await supabase
      .from('centers')
      .select('id, name, name_ar, address, phone, email')
      .eq('id', centerId)
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: 'Failed to fetch center', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, center });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Internal server error', error: err.message }, { status: 500 });
  }
} 