import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('centers')
      .select('id, name, address, phone, email, services, operating_hours')
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, centers: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch centers' }, { status: 500 });
  }
}
