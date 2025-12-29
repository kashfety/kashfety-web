import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Proxy booking to backend unified JWT endpoint
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, message: 'Authorization header required' }, { status: 401 });
        }

        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/api/auth/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: 'Failed to book appointment' }, { status: 500 });
    }
}
