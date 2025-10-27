import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Proxy home-visit booking to backend unified JWT endpoint
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, message: 'Authorization header required' }, { status: 401 });
        }

        const body = await request.json();

        // Ensure type and appointment_type reflect home visit
        const payload = {
            ...body,
            type: body.type || 'home_visit',
            appointment_type: body.appointment_type || 'home',
            notes: `${body.notes || ''}${body.address ? `\nAddress: ${body.address}` : ''}${body.emergency_contact ? `\nEmergency Contact: ${body.emergency_contact}` : ''}`,
            duration: body.duration || 60,
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
        console.error('Proxy error (book-home-visit):', error);
        return NextResponse.json({ success: false, message: 'Failed to book home visit' }, { status: 500 });
    }
}
