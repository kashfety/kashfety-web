export type WorkersAIOptions = {
  model?: string;
  timeoutMs?: number;
  debug?: boolean;
  // New options
  messages?: Array<{ role: string; content: string }>;
  responseFormat?: { type: 'json_object' | 'json_schema'; json_schema?: any };
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
};

export async function runWorkersAI(prompt: string, opts: WorkersAIOptions = {}) {
  const accountId = (process.env.CF_ACCOUNT_ID as string || '').trim();
  const apiToken = (process.env.CF_API_TOKEN as string || '').trim();
  const model = (opts.model || (process.env.CF_AI_MODEL as string) || '@cf/openai/gpt-oss-20b').trim();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);

  if (!accountId || !apiToken) {
    throw new Error('Cloudflare AI credentials missing (CF_ACCOUNT_ID/CF_API_TOKEN)');
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const isOpenAICompatModel = model.startsWith('@cf/openai/');
  const concatenated = (opts.messages?.map(m => `${m.role}: ${m.content}`).join('\n\n') || prompt || '').trim();

  const body: any = isOpenAICompatModel
    ? { input: concatenated }
    : (opts.messages?.length ? { messages: opts.messages } : { prompt });

  if (!isOpenAICompatModel) {
    if (opts.responseFormat) body.response_format = opts.responseFormat;
    if (typeof opts.temperature === 'number') body.temperature = opts.temperature;
    if (typeof opts.top_p === 'number') body.top_p = opts.top_p;
    if (typeof opts.max_tokens === 'number') body.max_tokens = opts.max_tokens;
  } else {
    // Minimal fields for @cf/openai/* models; some may not accept extra parameters
    if (typeof opts.temperature === 'number') body.temperature = opts.temperature;
    if (typeof opts.top_p === 'number') body.top_p = opts.top_p;
    if (typeof opts.max_tokens === 'number') body.max_tokens = opts.max_tokens;
  }

  if (opts.debug) {
    console.log('[WorkersAI] request', {
      url,
      accountId_tail: accountId.slice(-6),
      model,
      prompt_chars: (opts.messages?.map(m => m.content).join('\n') || prompt || '').length,
    });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).catch((e) => {
    clearTimeout(timeout);
    throw e;
  });
  clearTimeout(timeout);

  const txt = await res.text().catch(() => '');
  if (opts.debug) {
    console.log('[WorkersAI] response', { status: res.status, ok: res.ok, bytes: txt.length });
  }
  if (!res.ok) {
    throw new Error(`Workers AI error: HTTP ${res.status} ${txt}`);
  }

  // Try to parse Workers AI structured response
  let json: any = null;
  try { json = JSON.parse(txt); } catch { json = null; }

  // 1) New style: top-level result.response (string) for JSON mode or plain text
  const topResponse = json?.result?.response;
  if (typeof topResponse === 'string' && topResponse.trim()) {
    return topResponse.trim();
  }

  // 2) Common style: result.output is an array of segments containing content arrays
  const outputs = json?.result?.output || [];
  if (Array.isArray(outputs) && outputs.length > 0) {
    // Prefer segments marked as message/assistant with content.type === 'output_text'
    const candidateTexts: string[] = [];
    for (const item of outputs) {
      const itemType = item?.type;
      const role = item?.role;
      const contents = Array.isArray(item?.content) ? item.content : [];
      for (const c of contents) {
        const text = typeof c?.text === 'string' ? c.text : '';
        const ctype = c?.type;
        if (!text) continue;
        // Prefer explicit output_text
        if (ctype === 'output_text') {
          candidateTexts.push(text);
          continue;
        }
        // Otherwise, prefer assistant message text
        if (itemType === 'message' && role === 'assistant') {
          candidateTexts.push(text);
          continue;
        }
      }
    }
    if (candidateTexts.length > 0) {
      return candidateTexts.join('\n').trim();
    }
    // Fallback: return the last available text content
    for (let i = outputs.length - 1; i >= 0; i--) {
      const contents = Array.isArray(outputs[i]?.content) ? outputs[i].content : [];
      for (let j = contents.length - 1; j >= 0; j--) {
        const text = typeof contents[j]?.text === 'string' ? contents[j].text : '';
        if (text?.trim()) return text.trim();
      }
    }
  }

  // 3) Older style: result.text or summary[0]
  const legacy = json?.result?.text || json?.result?.summary?.[0] || '';
  if (legacy && String(legacy).trim()) {
    return String(legacy).trim();
  }

  // 4) As a last resort, return raw body
  return String(txt || '').trim();
} 