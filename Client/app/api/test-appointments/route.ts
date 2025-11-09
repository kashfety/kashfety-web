import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Test appointments endpoint works',
    timestamp: new Date().toISOString()
  });
}

