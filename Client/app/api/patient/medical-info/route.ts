import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET: Fetch patient's medical information
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({
                success: false,
                message: "User ID is required"
            }, { status: 400 });
        }

        console.log(`🔍 Fetching medical info for user: ${userId}`);

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('id, name, medical_history, allergies, medications, date_of_birth, gender, emergency_contact')
            .eq('id', userId)
            .eq('role', 'patient')
            .single();

        if (error) {
            console.error('Error fetching user medical info:', error);
            throw error;
        }

        if (!user) {
            return NextResponse.json({
                success: false,
                message: "Patient not found"
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            medical_info: {
                id: user.id,
                name: user.name,
                date_of_birth: user.date_of_birth,
                gender: user.gender,
                medical_history: user.medical_history || '',
                allergies: user.allergies || '',
                medications: user.medications || '',
                emergency_contact: user.emergency_contact || {}
            }
        });

    } catch (error: any) {
        console.error('Error in GET medical-info:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to fetch medical information'
        }, { status: 500 });
    }
}

// PUT: Update patient's medical information
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { userId, medical_history, allergies, medications, emergency_contact } = body;

        if (!userId) {
            return NextResponse.json({
                success: false,
                message: "User ID is required"
            }, { status: 400 });
        }

        console.log(`📝 Updating medical info for user: ${userId}`);

        // Validate that user exists and is a patient
        const { data: existingUser, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, role')
            .eq('id', userId)
            .single();

        if (userError || !existingUser || existingUser.role !== 'patient') {
            return NextResponse.json({
                success: false,
                message: "Patient not found or invalid user"
            }, { status: 404 });
        }

        // Update medical information
        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        if (medical_history !== undefined) updateData.medical_history = medical_history;
        if (allergies !== undefined) updateData.allergies = allergies;
        if (medications !== undefined) updateData.medications = medications;
        if (emergency_contact !== undefined) updateData.emergency_contact = emergency_contact;

        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating medical info:', updateError);
            throw updateError;
        }

        console.log(`✅ Successfully updated medical info for user: ${userId}`);

        return NextResponse.json({
            success: true,
            message: "Medical information updated successfully"
        });

    } catch (error: any) {
        console.error('Error in PUT medical-info:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to update medical information'
        }, { status: 500 });
    }
}