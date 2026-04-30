import { supabase } from './_supabase.js';

export default async function handler(req, res) {
  try {
    const [{ data: users }, { data: lots }, { data: stocks }] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('lots').select('*'),
      supabase.from('stock_pool').select('ticker, price'),
    ]);

    const priceMap = {};
    for (const s of stocks) priceMap[s.ticker] = Number(s.price);

    const today = new Date().toISOString().slice(0, 10);
    const snapshots = users.map(user => {
      const userLots = lots.filter(l => l.user_name === user.name);
      const invested = userLots.reduce((sum, l) => sum + (priceMap[l.ticker] || 0) * l.shares, 0);
      const total = Number(user.cash) + invested;
      return { user_name: user.name, snapshot_date: today, total_value: total };
    });

    // upsert so re-runs on same day just overwrite
    const { error } = await supabase
      .from('snapshots')
      .upsert(snapshots, { onConflict: 'user_name,snapshot_date' });

    if (error) throw error;
    return res.status(200).json({ success: true, date: today, snapshots });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
