import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string

// Admin-only: approve or reject a center request
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { center_id, status } = body || {}
    if (!center_id || !['approved','rejected','pending'].includes(status)) {
      return NextResponse.json({ error: 'center_id and valid status (approved|rejected|pending) are required' }, { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Probe column
    const probe = await supabase.from('centers').select('approval_status').eq('id', center_id).single()
    if (probe.error && probe.error.code === '42703') {
      return NextResponse.json({
        error: 'Database migration required: add approval_status column to centers',
        migration: "ALTER TABLE public.centers ADD COLUMN approval_status text DEFAULT 'approved' CHECK (approval_status IN ('pending','approved','rejected'));"
      }, { status: 400 })
    }

    const { error } = await supabase.from('centers').update({ approval_status: status }).eq('id', center_id)
    if (error) throw error

    // If approved, and this is a personal clinic, auto-assign to owner and make primary
    if (status === 'approved') {
      const { data: centerRow } = await supabase
        .from('centers')
        .select('id, center_type, owner_doctor_id')
        .eq('id', center_id)
        .single()
      if (centerRow && centerRow.center_type === 'personal' && centerRow.owner_doctor_id) {
        const doctorId = centerRow.owner_doctor_id as string
        // Clear previous primary
        await supabase.from('doctor_centers').update({ is_primary: false }).eq('doctor_id', doctorId)
        // Insert assignment
        await supabase.from('doctor_centers').insert({
          doctor_id: doctorId,
          center_id: center_id,
          is_primary: true,
          created_at: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update approval status' }, { status: 500 })
  }
}


