const BASE = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_KEY;
const POLY = process.env.POLYGON_API_KEY;

const hdrs = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function getPrice(ticker) {
  try {
    // Use previous close endpoint (free tier)
    const r = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${POLY}`
    );
    const data = await r.json();
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const close = result.c;
      const open = result.o;
      const changePct = open ? ((close - open) / open) * 100 : 0;
      return { price: close, change_pct: changePct };
    }
    return null;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const stocksRes = await fetch(`${BASE}/rest/v1/stock_pool?select=ticker`, { headers: hdrs });
    const stocks = await stocksRes.json();
    if (!stocks || !stocks.length) return res.status(200).json({ message: 'No stocks' });

    const results = [];
    for (const s of stocks) {
      // Free tier: 5 calls/min, so small delay between requests
      const priceData = await getPrice(s.ticker);
      if (priceData) {
        const now = new Date().toISOString();
        await fetch(
          `${BASE}/rest/v1/stock_pool?ticker=eq.${s.ticker}`,
          {
            method: 'PATCH',
            headers: hdrs,
            body: JSON.stringify({
              price: priceData.price,
              change_pct: priceData.change_pct,
              updated_at: now,
            }),
          }
        );
        results.push({ ticker: s.ticker, price: priceData.price, ok: true });
      } else {
        results.push({ ticker: s.ticker, ok: false });
      }
    }

    return res.status(200).json({ updated: results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
