import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, message: 'Authorization header required' }, { status: 401 });
        }

        const body = await request.json();
        const { center_id, test_type, notes, referring_doctor_id, ...rest } = body;

        // Pass through to unified booking with additional context in notes
        const payload = {
            ...rest,
            center_id,
            doctor_id: referring_doctor_id || rest.doctor_id || null,
            type: 'routine',
            appointment_type: 'clinic',
            notes: `${notes || ''}${test_type ? `\nTest Type: ${test_type}` : ''}${center_id ? `\nCenter: ${center_id}` : ''}`,
        };

        const response = await fetch(`${BACKEND_URL}/api/auth/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: 'Failed to book medical test' }, { status: 500 });
    }
}
