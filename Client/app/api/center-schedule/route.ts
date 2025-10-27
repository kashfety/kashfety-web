import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const specialty = searchParams.get('specialty');

    // If no specialty, return all centers
    if (!specialty || specialty === 'all') {
      const { data, error } = await supabase
        .from('centers')
        .select('id, name, address, phone, email, services, operating_hours')
        .order('name');
      if (error) throw error;
      return NextResponse.json({ success: true, centers: data || [] });
    }

    // With specialty filter: find centers that have doctors of that specialty
    const { data: doctors, error: doctorsError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'doctor')
      .ilike('specialty', `%${specialty}%`);
    if (doctorsError) throw doctorsError;

    const doctorIds = (doctors || []).map((d) => d.id);
    if (doctorIds.length === 0) {
      return NextResponse.json({ success: true, centers: [] });
    }

    const { data: links, error: linkError } = await supabase
      .from('doctor_centers')
      .select('center_id')
      .in('doctor_id', doctorIds);
    if (linkError) throw linkError;

    const centerIds = Array.from(new Set((links || []).map((l: any) => l.center_id)));
    if (centerIds.length === 0) {
      return NextResponse.json({ success: true, centers: [] });
    }

    const { data: centers, error: centersError } = await supabase
      .from('centers')
      .select('id, name, address, phone, email, services, operating_hours')
      .in('id', centerIds)
      .order('name');
    if (centersError) throw centersError;

    return NextResponse.json({ success: true, centers: centers || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch centers' }, { status: 500 });
  }
}
