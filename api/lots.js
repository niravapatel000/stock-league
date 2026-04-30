import { supabase } from './_supabase.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { admin_password } = req.body || {};
  if (admin_password !== ADMIN_PASSWORD)
    return res.status(403).json({ error: 'Unauthorized' });

  try {
    // POST — create a lot manually (admin), debits cash
    if (req.method === 'POST') {
      const { user_name, ticker, shares, cost_basis, purchase_date } = req.body;
      if (!user_name || !ticker || !shares || !cost_basis || !purchase_date)
        return res.status(400).json({ error: 'Missing fields' });

      const { data: user } = await supabase.from('users').select('cash').eq('name', user_name).single();
      if (!user) return res.status(404).json({ error: 'User not found' });

      const cost = cost_basis * shares;
      if (cost > user.cash) return res.status(400).json({ error: 'Insufficient cash for this user' });

      const { error } = await supabase.from('lots').insert({
        user_name, ticker: ticker.toUpperCase(), shares, cost_basis, purchase_date,
      });
      if (error) return res.status(400).json({ error: error.message });

      await supabase.from('users').update({ cash: user.cash - cost }).eq('name', user_name);
      return res.status(200).json({ success: true });
    }

    // PUT — edit an existing lot (does not affect cash)
    if (req.method === 'PUT') {
      const { lot_id, shares, cost_basis, purchase_date } = req.body;
      if (!lot_id) return res.status(400).json({ error: 'Missing lot_id' });
      const updates = {};
      if (shares !== undefined) updates.shares = shares;
      if (cost_basis !== undefined) updates.cost_basis = cost_basis;
      if (purchase_date !== undefined) updates.purchase_date = purchase_date;
      const { error } = await supabase.from('lots').update(updates).eq('id', lot_id);
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // DELETE — remove a lot, refund cash at cost basis
    if (req.method === 'DELETE') {
      const { lot_id, refund_cash } = req.body;
      if (!lot_id) return res.status(400).json({ error: 'Missing lot_id' });

      if (refund_cash) {
        const { data: lot } = await supabase.from('lots').select('*').eq('id', lot_id).single();
        if (lot) {
          const { data: user } = await supabase.from('users').select('cash').eq('name', lot.user_name).single();
          if (user) {
            await supabase.from('users').update({ cash: user.cash + lot.cost_basis * lot.shares }).eq('name', lot.user_name);
          }
        }
      }

      await supabase.from('lots').delete().eq('id', lot_id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
