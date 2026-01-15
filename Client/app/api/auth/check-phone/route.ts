import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/auth/check-phone
 * Check if a phone number is already registered in the system.
 * This endpoint should be called before sending OTP to prevent
 * users from going through verification only to fail at registration.
 */
export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/78d1136f-9142-45b6-842c-ca61d8e46e6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'check-phone/route.ts:POST:entry',message:'Check phone API called',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const body = await request.json();
    const { phone } = body;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/78d1136f-9142-45b6-842c-ca61d8e46e6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'check-phone/route.ts:POST:phoneReceived',message:'Phone received from request',data:{phone,phoneLength:phone?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
    // #endregion

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required', exists: false },
        { status: 400 }
      );
    }

    // Check if phone number exists in users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/78d1136f-9142-45b6-842c-ca61d8e46e6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'check-phone/route.ts:POST:queryResult',message:'Supabase query result',data:{existingUser:!!existingUser,userId:existingUser?.id,checkError:checkError?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
    // #endregion

    if (checkError) {
      console.error('Error checking phone number:', checkError);
      return NextResponse.json(
        { error: 'Database error while checking phone number', exists: false },
        { status: 500 }
      );
    }

    if (existingUser) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/78d1136f-9142-45b6-842c-ca61d8e46e6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'check-phone/route.ts:POST:phoneExists',message:'Phone already exists - returning error',data:{exists:true},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({
        exists: true,
        message: 'This phone number is already registered'
      });
    }

    return NextResponse.json({
      exists: false,
      message: 'Phone number is available'
    });

  } catch (error: any) {
    console.error('Check phone error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', exists: false },
      { status: 500 }
    );
  }
}

