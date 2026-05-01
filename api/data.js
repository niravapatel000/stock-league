export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  // Debug: show if env vars are set
  if (!url || !key) {
    return res.status(500).json({
      error: 'Missing env vars',
      has_url: !!url,
      has_key: !!key,
      url_preview: url ? url.substring(0, 30) + '...' : null,
      key_preview: key ? key.substring(0, 20) + '...' : null,
    });
  }

  try {
    const r = await fetch(`${url}/rest/v1/users?select=*`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });
    const text = await r.text();
    return res.status(200).json({
      status: r.status,
      raw: text,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
