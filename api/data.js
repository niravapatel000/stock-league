const BASE = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_KEY;

const hdrs = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const [usersR, lotsR, stocksR] = await Promise.all([
      fetch(`${BASE}/rest/v1/users?select=*&order=name`, { headers: hdrs }),
      fetch(`${BASE}/rest/v1/lots?select=*&order=purchase_date`, { headers: hdrs }),
      fetch(`${BASE}/rest/v1/stock_pool?select=*&order=ticker`, { headers: hdrs }),
    ]);
    const [users, lots, stocks] = await Promise.all([
      usersR.json(), lotsR.json(), stocksR.json(),
    ]);
    return res.status(200).json({ users, lots, stocks });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
