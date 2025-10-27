import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runWorkersAI } from '@/lib/ai/cloudflare';

// Returns a compact JSON to minimize tokens and payload
// { prep_sections: [{t:string, i:string[]}], reminder_24h:string, reminder_3h:string, sms:string, email_text:string }

function extractJson(raw: string): any {
  try { return JSON.parse(raw); } catch {}
  const fenced = /```json\s*([\s\S]*?)\s*```/i.exec(raw);
  if (fenced && fenced[1]) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = raw.slice(firstBrace, lastBrace + 1);
    try { return JSON.parse(candidate); } catch {}
  }
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    const body = await request.json().catch(() => ({}));
    const appointmentId = body.appointment_id as string | undefined;
    if (!appointmentId) return NextResponse.json({ success: false, message: 'appointment_id required' }, { status: 400 });

    const { data: apt, error } = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, appointment_type, center_id, doctor_id')
      .eq('id', appointmentId)
      .single();
    if (error || !apt) return NextResponse.json({ success: false, message: 'appointment not found' }, { status: 404 });

    const { data: center } = await supabase
      .from('centers')
      .select('name, address, phone')
      .eq('id', apt.center_id)
      .single();

    const { data: doc } = await supabase
      .from('users')
      .select('name')
      .eq('id', apt.doctor_id)
      .single();

    const hasCF = !!process.env.CF_ACCOUNT_ID && !!process.env.CF_API_TOKEN;
    if (!hasCF) {
      return NextResponse.json({ success: false, message: 'Cloudflare AI env vars missing (CF_ACCOUNT_ID, CF_API_TOKEN)' }, { status: 400 });
    }

    // Use a JSON-mode-capable model (env overrideable)
    const model = (process.env.CF_AI_JSON_MODEL || process.env.CF_AI_MODEL || '@hf/nousresearch/hermes-2-pro-mistral-7b').trim();

    const contextLine = `type=${apt.appointment_type || 'clinic'}, date=${apt.appointment_date}, time=${String(apt.appointment_time).slice(0,5)}, center=${center?.name || ''}, address=${center?.address || ''}, phone=${center?.phone || ''}, doctor=${doc?.name || ''}.`;

    const messages = [
      { role: 'system', content: 'ROLE: clinical ops assistant. OUTPUT: strictly minified JSON only (no markdown, no extra text). Start with { and end with }.' },
      { role: 'user', content: (
        'SCHEMA: {"prep_sections":[{"t":"string","i":["string"]}],"reminder_24h":"string","reminder_3h":"string","sms":"string","email_text":"string"}.\n' +
        'CONSTRAINTS: 3-6 bullets total across sections, each <=15 words, non-diagnostic, include clinic-contact disclaimer.\n' +
        `CONTEXT: ${contextLine}`
      )},
    ];

    // First attempt with configured model
    const raw = await runWorkersAI('', {
      model,
      messages,
      responseFormat: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 512,
      timeoutMs: 15000,
      debug: true,
    });
    const preview = raw.slice(0, 400);
    console.log('[PrepAI] raw preview:', preview);

    let data = extractJson(raw);

    // If invalid, auto-retry with a JSON-mode capable fallback model
    if (!data || !Array.isArray(data.prep_sections)) {
      const fallbackModel = '@hf/nousresearch/hermes-2-pro-mistral-7b';
      if (model !== fallbackModel) {
        console.warn('[PrepAI] invalid JSON, retrying with fallback model:', fallbackModel);
        const raw2 = await runWorkersAI('', {
          model: fallbackModel,
          messages,
          responseFormat: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 512,
          timeoutMs: 15000,
          debug: true,
        });
        const preview2 = raw2.slice(0, 400);
        console.log('[PrepAI] retry raw preview:', preview2);
        data = extractJson(raw2);
      }
    }

    if (!data || !Array.isArray(data.prep_sections)) {
      return NextResponse.json({ success: false, message: 'AI did not return valid JSON plan', rawPreview: preview }, { status: 502 });
    }

    return NextResponse.json({ success: true, plan: data });
  } catch (e: any) {
    console.error('prep route error:', e);
    const msg = String(e?.message || 'prep generation failed');
    return NextResponse.json({ success: false, message: msg }, { status: 502 });
  }
} 