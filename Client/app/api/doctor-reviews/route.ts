import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctor_id');

    if (!doctorId) {
      return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });
    }

    console.log('📋 [Doctor Reviews] Fetching reviews for doctor:', doctorId);

    // Fetch reviews for the doctor
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('❌ [Doctor Reviews] Error fetching reviews:', reviewsError);
      return NextResponse.json({ 
        error: 'Failed to fetch reviews',
        details: reviewsError.message 
      }, { status: 500 });
    }

    // Enrich reviews with patient information
    const enrichedReviews = [];
    for (const review of reviews || []) {
      let patientInfo = null;
      if (review.patient_id) {
        const { data: patient } = await supabase
          .from('users')
          .select('id, name, first_name, last_name, email, profile_picture')
          .eq('id', review.patient_id)
          .single();
        
        if (patient) {
          // Resolve patient name: prioritize name, then first_name + last_name, then email prefix
          let patientName = patient.name;
          if (!patientName && (patient.first_name || patient.last_name)) {
            patientName = [patient.first_name, patient.last_name].filter(Boolean).join(' ').trim();
          }
          if (!patientName && patient.email) {
            patientName = patient.email.split('@')[0];
          }
          
          patientInfo = {
            ...patient,
            name: patientName || 'Anonymous Patient'
          };
        }
      }

      enrichedReviews.push({
        ...review,
        patient: patientInfo,
        patient_name: patientInfo?.name || 'Anonymous Patient'
      });
    }

    // Calculate average rating from reviews (rounded to 2 decimal places)
    let avgRating = 0;
    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((s: number, r: any) => s + Number(r.rating || 0), 0);
      avgRating = Math.round((sum / reviews.length) * 100) / 100; // Round to 2 decimal places
    }

    console.log('✅ [Doctor Reviews] Fetched', enrichedReviews.length, 'reviews, avg rating:', avgRating);

    return NextResponse.json({
      success: true,
      reviews: enrichedReviews,
      totalReviews: enrichedReviews.length,
      averageRating: avgRating
    });

  } catch (error: any) {
    console.error('❌ [Doctor Reviews] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

