import { supabase } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    // last 400 days of snapshots is plenty for all windows
    const since = new Date();
    since.setDate(since.getDate() - 400);
    const sinceStr = since.toISOString().slice(0, 10);

    const [{ data: snapshots }, { data: lots }, { data: users }, { data: stocks }] = await Promise.all([
      supabase.from('snapshots').select('*').gte('snapshot_date', sinceStr).order('snapshot_date'),
      supabase.from('lots').select('*'),
      supabase.from('users').select('*'),
      supabase.from('stock_pool').select('ticker, price'),
    ]);

    return res.status(200).json({ snapshots, lots, users, stocks });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
