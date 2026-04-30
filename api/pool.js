import { supabase } from './_supabase.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { admin_password } = req.body || {};
  if (admin_password !== ADMIN_PASSWORD)
    return res.status(403).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'POST') {
      const { ticker, name, price } = req.body;
      if (!ticker || !name || !price) return res.status(400).json({ error: 'Missing fields' });
      const { error } = await supabase.from('stock_pool').insert({
        ticker: ticker.toUpperCase(), name, price, change_pct: 0,
      });
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') {
      const { ticker } = req.body;
      if (!ticker) return res.status(400).json({ error: 'Missing ticker' });
      await supabase.from('stock_pool').delete().eq('ticker', ticker);
      return res.status(200).json({ success: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
