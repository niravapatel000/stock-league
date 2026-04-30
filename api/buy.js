import { supabase } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user_name, ticker, shares, purchase_date } = req.body;
  if (!user_name || !ticker || !shares || shares <= 0)
    return res.status(400).json({ error: 'Missing or invalid fields' });

  try {
    const [{ data: user }, { data: stock }] = await Promise.all([
      supabase.from('users').select('*').eq('name', user_name).single(),
      supabase.from('stock_pool').select('*').eq('ticker', ticker).single(),
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!stock) return res.status(404).json({ error: 'Stock not in pool' });

    const cost = stock.price * shares;
    if (cost > user.cash) return res.status(400).json({ error: 'Insufficient cash' });

    const lotDate = purchase_date || new Date().toISOString().slice(0, 10);

    const { error: lotErr } = await supabase.from('lots').insert({
      user_name,
      ticker,
      shares,
      cost_basis: stock.price,
      purchase_date: lotDate,
    });
    if (lotErr) throw lotErr;

    await supabase.from('users').update({ cash: user.cash - cost }).eq('name', user_name);

    return res.status(200).json({ success: true, cost, lot_date: lotDate, price: stock.price });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
