import { supabase } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user_name, lot_id, shares } = req.body;
  if (!user_name || !lot_id || !shares || shares <= 0)
    return res.status(400).json({ error: 'Missing or invalid fields' });

  try {
    const { data: lot } = await supabase.from('lots').select('*').eq('id', lot_id).single();
    if (!lot) return res.status(404).json({ error: 'Lot not found' });
    if (lot.user_name !== user_name) return res.status(403).json({ error: 'Not your lot' });
    if (shares > lot.shares) return res.status(400).json({ error: `Only ${lot.shares} shares in this lot` });

    const { data: stock } = await supabase.from('stock_pool').select('price').eq('ticker', lot.ticker).single();
    if (!stock) return res.status(404).json({ error: 'Stock not found' });

    const proceeds = stock.price * shares;
    const remaining = lot.shares - shares;

    if (remaining === 0) {
      await supabase.from('lots').delete().eq('id', lot_id);
    } else {
      await supabase.from('lots').update({ shares: remaining }).eq('id', lot_id);
    }

    const { data: user } = await supabase.from('users').select('cash').eq('name', user_name).single();
    await supabase.from('users').update({ cash: user.cash + proceeds }).eq('name', user_name);

    const pl = (stock.price - lot.cost_basis) * shares;

    return res.status(200).json({ success: true, proceeds, pl, ticker: lot.ticker });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
