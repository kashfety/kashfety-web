import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Fetching all appointments...');
    
    // Get all appointments
    const { data: allAppointments, error } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching appointments:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        appointments: [] 
      });
    }
    
    console.log('✅ Found appointments:', allAppointments);
    
    // Get appointments for our specific doctor and date
    const { data: specificAppointments, error: specificError } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', 'f0fb2d13-6149-47f4-bcb0-958d1f5bc2b5')
      .eq('appointment_date', '2025-08-08');
    
    console.log('🎯 Specific appointments for doctor and date:', specificAppointments);
    
    return NextResponse.json({
      success: true,
      allAppointments: allAppointments || [],
      specificAppointments: specificAppointments || [],
      message: `Found ${allAppointments?.length || 0} total appointments, ${specificAppointments?.length || 0} for doctor on 2025-08-08`
    });
    
  } catch (error: any) {
    console.error('💥 DEBUG ERROR:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      appointments: []
    });
  }
}
