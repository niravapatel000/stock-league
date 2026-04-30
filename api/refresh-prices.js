import { supabase } from './_supabase.js';

export default async function handler(req, res) {
  try {
    const { data: stocks } = await supabase.from('stock_pool').select('ticker');
    if (!stocks || stocks.length === 0) return res.status(200).json({ message: 'No stocks to update' });

    const tickers = stocks.map(s => s.ticker).join(',');
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers}&apiKey=${process.env.POLYGON_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.tickers || data.tickers.length === 0)
      return res.status(200).json({ message: 'No price data from Polygon' });

    for (const t of data.tickers) {
      await supabase.from('stock_pool').update({
        price: t.day?.c || t.prevDay?.c || 0,
        change_pct: t.todaysChangePerc || 0,
        updated_at: new Date().toISOString(),
      }).eq('ticker', t.ticker);
    }

    return res.status(200).json({ updated: data.tickers.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
