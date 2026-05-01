const BASE = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_KEY;
const POLY = process.env.POLYGON_API_KEY;

const hdrs = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

export default async function handler(req, res) {
  try {
    // Get tickers from DB
    const stocksRes = await fetch(`${BASE}/rest/v1/stock_pool?select=ticker`, { headers: hdrs });
    const stocks = await stocksRes.json();
    if (!stocks || !stocks.length) return res.status(200).json({ message: 'No stocks' });

    const tickers = stocks.map(s => s.ticker).join(',');
    const polyUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers}&apiKey=${POLY}`;
    const polyRes = await fetch(polyUrl);
    const polyData = await polyRes.json();

    if (!polyData.tickers || !polyData.tickers.length) {
      return res.status(200).json({ message: 'No price data from Polygon', raw: polyData });
    }

    const results = [];
    for (const t of polyData.tickers) {
      const price = t.day?.c || t.prevDay?.c || 0;
      const change = t.todaysChangePerc || 0;
      const now = new Date().toISOString();

      const updateRes = await fetch(
        `${BASE}/rest/v1/stock_pool?ticker=eq.${t.ticker}`,
        {
          method: 'PATCH',
          headers: hdrs,
          body: JSON.stringify({ price, change_pct: change, updated_at: now }),
        }
      );
      results.push({ ticker: t.ticker, price, change, ok: updateRes.ok });
    }

    return res.status(200).json({ updated: results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
