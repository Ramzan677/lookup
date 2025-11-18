// api/lookup.js
// Deploy on Vercel as an API route. It proxies request to Eyecon using secrets from env vars.
export default async function handler(req, res) {
  const number = (req.query.number || '').trim();
  if (!number) return res.status(400).json({ error: 'Missing number parameter' });
  if (!/^\+?[0-9]{6,15}$/.test(number)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  const urlBase = 'https://api.eyecon-app.com/app/getnames.jsp';
  const params = new URLSearchParams({
    cli: number,
    lang: 'en',
    is_callerid: 'true',
    is_ic: 'true',
    cv: 'vc_672_vn_4.2025.10.17.1932_a',
    requestApi: 'URLconnection',
    source: 'MenifaFragment'
  });

  // Build headers from env (set these in Vercel dashboard)
  const headers = {
    'User-Agent': 'Mozilla/5.0',
    'accept': 'application/json',
    'accept-charset': 'UTF-8',
    'content-type': 'application/x-www-form-urlencoded; charset=utf-8'
  };
  // only append auth headers if set (keep them private in project settings)
  if (process.env.E_AUTH) {
    headers['e-auth-v'] = process.env.E_AUTH_V || 'e1';
    headers['e-auth']   = process.env.E_AUTH;
    headers['e-auth-c'] = process.env.E_AUTH_C || '40';
    headers['e-auth-k'] = process.env.E_AUTH_K || '';
  }

  try {
    const r = await fetch(`${urlBase}?${params.toString()}`, {
      method: 'GET',
      headers,
      redirect: 'follow'
    });

    const status = r.status;
    const bodyText = await r.text(); // Eyecon might return empty body with headers
    // If JSON, parse and forward; otherwise forward as text wrapped in object
    const contentType = r.headers.get('content-type') || '';
    if (status !== 200) {
      // return helpful debug (but not secrets)
      return res.status(502).json({ error: 'API request failed', http_code: status, body_preview: bodyText.slice(0,2000) });
    }
    if (contentType.includes('application/json')) {
      try {
        const j = JSON.parse(bodyText);
        return res.status(200).json(j);
      } catch (e) {
        // invalid JSON — send as raw
        return res.status(200).json({ raw: bodyText });
      }
    }
    // non-json body (maybe empty) — forward raw
    return res.status(200).json({ raw: bodyText });
  } catch (err) {
    return res.status(502).json({ error: 'Fetch error', detail: String(err.message) });
  }
}
