// Direct Supabase REST API wrapper.
// Avoids all supabase-js client auth/JWT quirks.
const BASE = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_KEY;

function makeHeaders(prefer) {
  return {
    'apikey':        KEY,
    'Authorization': `Bearer ${KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        prefer || 'return=representation',
  };
}

export const supabase = {
  from(table) {
    const filters = [];
    let _select = '*';
    let _order  = '';
    let _single = false;
    let _method = 'GET';
    let _body   = null;
    let _prefer = 'return=representation';
    let _extra  = '';

    const b = {
      select(cols = '*') { _method = 'GET'; _select = cols; return b; },
      insert(data)       { _method = 'POST'; _body = data; return b; },
      update(data)       { _method = 'PATCH'; _body = data; return b; },
      delete()           { _method = 'DELETE'; return b; },
      upsert(data, opts) {
        _method = 'POST';
        _body = data;
        _prefer = 'return=representation,resolution=merge-duplicates';
        if (opts?.onConflict) _extra = `on_conflict=${opts.onConflict}`;
        return b;
      },
      eq(col, val)  { filters.push(`${col}=eq.${encodeURIComponent(val)}`); return b; },
      gte(col, val) { filters.push(`${col}=gte.${encodeURIComponent(val)}`); return b; },
      order(col, opts = {}) {
        _order = `order=${col}.${opts.ascending === false ? 'desc' : 'asc'}`;
        return b;
      },
      single() { _single = true; return b; },

      async then(resolve) {
        try {
          const params = [];
          if (_method === 'GET' || _method === 'DELETE' || _method === 'PATCH') {
            params.push(`select=${_select}`);
          }
          params.push(...filters);
          if (_order) params.push(_order);
          if (_extra) params.push(_extra);

          const qs   = params.length ? '?' + params.join('&') : '';
          const url  = `${BASE}/rest/v1/${table}${qs}`;
          const opts = { method: _method, headers: makeHeaders(_prefer) };
          if (_body && (_method === 'POST' || _method === 'PATCH')) {
            opts.body = JSON.stringify(_body);
          }

          const res  = await fetch(url, opts);
          const text = await res.text();

          if (!res.ok) {
            resolve({ data: null, error: { message: text, status: res.status } });
            return;
          }

          const json = text ? JSON.parse(text) : (_method === 'GET' ? [] : null);
          const data = _single && Array.isArray(json) ? (json[0] || null) : json;
          resolve({ data, error: null });
        } catch (err) {
          resolve({ data: null, error: { message: err.message } });
        }
      }
    };
    return b;
  }
};
