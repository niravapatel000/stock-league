import { supabase } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const [{ data: users }, { data: lots }, { data: stocks }] = await Promise.all([
      supabase.from('users').select('*').order('name'),
      supabase.from('lots').select('*').order('purchase_date', { ascending: true }),
      supabase.from('stock_pool').select('*').order('ticker'),
    ]);
    return res.status(200).json({ users, lots, stocks });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
