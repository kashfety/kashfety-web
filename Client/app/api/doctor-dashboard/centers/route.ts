import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDoctor } from '@/lib/api-auth-utils';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/doctor-dashboard/centers`, {
        method: 'GET',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        // Post-filter using Supabase to hide personal clinics and unapproved generics even if backend doesn't
        try {
          const SUP = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const centersPayload = (data?.centers || data?.data || []);
          const centersArr = centersPayload.map((c: any) => c.id).filter(Boolean);
          if (centersArr.length) {
            const { data: rows } = await SUP
              .from('centers')
              .select('id, center_type, owner_doctor_id, approval_status')
              .in('id', centersArr);
            const meta = new Map<string, any>((rows || []).map((r: any) => [r.id, r]));

            // Attempt to decode doctor id from token for filtering personal clinics
            let doctorId = '';
            try {
              const token = authHeader.replace(/^Bearer\s+/i, '');
              const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
              doctorId = payload.id || payload.user_id || payload.sub || '';
            } catch {}

            const filtered = centersPayload.filter((c: any) => {
              const m = meta.get(c.id);
              const type = (m?.center_type || 'generic').toLowerCase();
              const approved = (m?.approval_status || 'approved').toLowerCase() === 'approved';
              if (type === 'personal') {
                return approved && !!doctorId && m?.owner_doctor_id === doctorId;
              }
              return approved;
            });

            const assigned = (filtered as any[]).filter((c: any) => c.is_assigned);
            const payloadOut = { ...(data || {}), centers: filtered, assigned_centers: assigned };
            // Also print any dropped personal clinics for visibility
            centersPayload.forEach((c: any) => {
              const m = meta.get(c.id);
              if (m?.center_type === 'personal' && m?.owner_doctor_id !== doctorId) {
              }
            });
            return NextResponse.json(payloadOut);
          }
        } catch (e) {
        }
        return NextResponse.json(data);
      }
      // If unauthorized/forbidden and fallback enabled, continue to fallback; else forward error
      if (!FALLBACK_ENABLED || (response.status !== 401 && response.status !== 403)) {
        return NextResponse.json(data, { status: response.status });
      }
    } catch (e) {
      // fall through to fallback
    }
  }

  if (!FALLBACK_ENABLED) {
    return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctor_id');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Detect personal/approval fields if present
    let hasPersonalColumns = false;
    let hasApproval = false;
    try {
      const probe = await supabase.from('centers').select('center_type, owner_doctor_id, approval_status').limit(1);
      hasPersonalColumns = !probe.error;
      hasApproval = !probe.error;
    } catch {}

    // Fetch centers; if personal fields exist, hide other doctors' personal clinics
    let centersQuery = supabase.from('centers') as any;
    if (hasPersonalColumns && doctorId) {
      centersQuery = centersQuery
        .select('id, name, name_ar, address, phone, email, center_type, owner_doctor_id, approval_status')
        .or(`owner_doctor_id.eq.${doctorId},and(center_type.eq.generic,approval_status.eq.approved)`, { referencedTable: 'centers' })
        .order('name');
    } else {
      centersQuery = centersQuery.select('id, name, name_ar, address, phone, email').order('name');
    }
    const { data: allCenters, error: centersError } = await centersQuery;
    if (centersError) throw centersError;

    let assignments: any[] = [];
    if (doctorId) {
      const { data: a, error: assignmentsError } = await supabase
        .from('doctor_centers')
        .select('center_id, is_primary')
        .eq('doctor_id', doctorId);
      if (assignmentsError) throw assignmentsError;
      assignments = a || [];
    }

    const centersWithFlags = (allCenters || []).map((center: any) => {
      const a = (assignments || []).find((x: any) => x.center_id === center.id);
      return {
        ...center,
        is_assigned: !!a,
        is_primary: a?.is_primary || false,
      };
    });

    // Filter out other doctors' personal clinics and unapproved generics
    const visibleCenters = centersWithFlags.filter((c: any) => {
      if (hasPersonalColumns) {
        const type = c.center_type || 'generic';
        const approved = !hasApproval || (c.approval_status || 'approved') === 'approved';
        if (type === 'personal') {
          return (!!doctorId && c.owner_doctor_id === doctorId) && approved; // only owner sees personal clinic once approved
        }
        // generic
        return approved;
      }
      return true;
    });

    const assignedCenters = visibleCenters.filter((c: any) => c.is_assigned);

    return NextResponse.json({
      success: true,
      centers: visibleCenters,
      assigned_centers: assignedCenters,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load centers' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // SECURITY: Require doctor authentication
  const authResult = requireDoctor(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Returns 401 or 403
  }

  const authHeader = request.headers.get('authorization');
  const body = await request.json().catch(() => ({}));
  // Try to compute doctorId and a sensible primary for proxy/fallback consistency
  let computedDoctorId = '';
  if (authHeader) {
    try {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
      computedDoctorId = payload.id || payload.user_id || payload.sub || '';
    } catch {}
  }
  const centerIds = Array.isArray((body as any)?.center_ids) ? (body as any).center_ids : undefined;
  const computedPrimary = (body as any)?.primary_center_id || (Array.isArray(centerIds) && centerIds.length === 1 ? centerIds[0] : undefined);
  // Pre-validate against personal clinics even when proxying to backend
  if (authHeader && Array.isArray(centerIds) && centerIds.length) {
    try {
      const SUP = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: rows } = await SUP
        .from('centers')
        .select('id, center_type, owner_doctor_id, approval_status')
        .in('id', centerIds);
      for (const r of rows || []) {
        if ((r as any).center_type === 'personal' && (r as any).owner_doctor_id && (r as any).owner_doctor_id !== computedDoctorId) {
          return NextResponse.json({ error: "Cannot assign another doctor's personal clinic" }, { status: 403 });
        }
        if ((r as any).approval_status && (r as any).approval_status !== 'approved') {
          return NextResponse.json({ error: 'Cannot assign an unapproved center' }, { status: 403 });
        }
      }
    } catch (e) {
    }
  }
  if (authHeader) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/doctor-dashboard/centers`, {
        method: 'PUT',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        // Augment body for backend compatibility (snake_case + camelCase variants)
        body: JSON.stringify({
          ...body,
          ...(computedPrimary ? { primary_center_id: computedPrimary, primaryCenterId: computedPrimary } : {}),
          ...(computedDoctorId ? { doctor_id: computedDoctorId, doctorId: computedDoctorId } : {}),
          ...(Array.isArray(centerIds) ? { center_ids: centerIds, centerIds } : {}),
        }),
      });
      const data = await response.json();
      if (response.ok) return NextResponse.json(data);
      // Log details to aid debugging in dev
      // If unauthorized/forbidden and fallback enabled, continue to fallback; else forward error
      // Also in dev, allow fallback on 400/404 to keep UI flowing.
      if (!FALLBACK_ENABLED || ![401, 403, 400, 404].includes(response.status)) {
        return NextResponse.json(data, { status: response.status });
      }
    } catch (e) {
      // fall through to fallback
    }
  }

  if (!FALLBACK_ENABLED) {
    return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let doctorId = searchParams.get('doctor_id') || body?.doctor_id || '';
    if (!doctorId && authHeader) {
      // Attempt to decode JWT to extract doctor id (dev-only)
      try {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        doctorId = payload.id || payload.user_id || payload.sub || '';
      } catch {}
    }
    if (!doctorId) {
      // Dev convenience: if only one doctor exists, use that
      const supabaseProbe = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: doctors, error: docErr } = await supabaseProbe
        .from('users')
        .select('id')
        .eq('role', 'doctor')
        .limit(2);
      if (!docErr && (doctors?.length === 1)) {
        doctorId = doctors[0].id;
      }
    }
    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required (provide in query/body or use a valid dev token)' }, { status: 400 });

    let { center_ids, primary_center_id } = body || {};
    if (!Array.isArray(center_ids) || center_ids.length === 0) {
      return NextResponse.json({ error: 'At least one center must be selected' }, { status: 400 });
    }
    // Dev-friendly: auto-pick the first as primary if not provided
    if (!primary_center_id) {
      primary_center_id = center_ids[0];
    }
    if (primary_center_id && !center_ids.includes(primary_center_id)) {
      return NextResponse.json({ error: 'Primary center must be one of the assigned centers' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // If schema supports personal clinics, prevent assigning another doctor's personal clinic
    try {
      const probe = await supabase.from('centers').select('id, center_type, owner_doctor_id, approval_status').in('id', center_ids);
      if (!probe.error) {
        const rows = probe.data || [];
        for (const row of rows) {
          if ((row as any).center_type === 'personal' && (row as any).owner_doctor_id && (row as any).owner_doctor_id !== doctorId) {
            return NextResponse.json({ error: 'Cannot assign another doctor\'s personal clinic' }, { status: 403 });
          }
        }
      }
    } catch {}

    // Remove existing assignments
    const { error: delErr } = await supabase
      .from('doctor_centers')
      .delete()
      .eq('doctor_id', doctorId);
    if (delErr) throw delErr;

    // Insert new assignments
    const inserts = center_ids.map((center_id: string) => ({
      doctor_id: doctorId,
      center_id,
      is_primary: primary_center_id ? center_id === primary_center_id : center_ids.length === 1 && center_id === center_ids[0],
      created_at: new Date().toISOString(),
    }));
    const { error: insErr } = await supabase.from('doctor_centers').insert(inserts);
    if (insErr) throw insErr;

    return NextResponse.json({
      success: true,
      message: 'Center assignments updated successfully',
      assigned_centers: center_ids,
      primary_center: primary_center_id || (center_ids.length === 1 ? center_ids[0] : null),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to save center assignments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const body = await request.json().catch(() => ({}));

  // Try proxy to backend first
  if (authHeader) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/doctor-dashboard/centers`, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (response.ok) return NextResponse.json(data);
      if (!FALLBACK_ENABLED || ![401,403,404].includes(response.status)) {
        return NextResponse.json(data, { status: response.status });
      }
    } catch {}
  }

  if (!FALLBACK_ENABLED) {
    return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let doctorId = searchParams.get('doctor_id') || body?.doctor_id || '';
    if (!doctorId && authHeader) {
      try {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        doctorId = payload.id || payload.user_id || payload.sub || '';
      } catch {}
    }
    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });

    const { name, address, phone, email, center_type = 'generic', set_as_primary = false } = body || {};
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Probe columns
    const probe = await supabase.from('centers').select('center_type, owner_doctor_id').limit(1);
    const hasPersonalColumns = !probe.error;
    if (center_type === 'personal' && !hasPersonalColumns) {
      return NextResponse.json({
        error: 'Database migration required: add columns center_type and owner_doctor_id to centers table',
        migration: 'ALTER TABLE public.centers ADD COLUMN center_type text DEFAULT \"generic\" CHECK (center_type IN (\"generic\", \"personal\")); ALTER TABLE public.centers ADD COLUMN owner_doctor_id uuid REFERENCES public.users(id);',
      }, { status: 400 });
    }

    // Insert center
    const centerInsert: any = { name, address, phone, email };
    if (hasPersonalColumns) {
      centerInsert.center_type = center_type;
      centerInsert.owner_doctor_id = center_type === 'personal' ? doctorId : null;
    }

    // If approval_status column exists, set to pending by default
    try {
      const probe = await supabase.from('centers').select('approval_status').limit(1);
      if (!probe.error) {
        (centerInsert as any).approval_status = 'pending';
      }
    } catch {}

    const { data: inserted, error: insErr } = await supabase.from('centers').insert(centerInsert).select('id, approval_status').single();
    if (insErr) throw insErr;
    const newCenterId = inserted?.id as string;

    // Do not auto-assign; require admin approval first

    return NextResponse.json({ success: true, center_id: newCenterId, approval_status: (inserted as any)?.approval_status || 'pending' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create center' }, { status: 500 });
  }
}
