// pages/api/tmdb.js
export default async function handler(req, res) {
  const { path = 'trending/all/week', params = '' } = req.query;

  const TMDB_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_KEY) {
    return res.status(500).json({ ok:false, message: 'TMDB_API_KEY not set on server.' });
  }

  // Build TMDB URL
  const base = 'https://api.themoviedb.org/3';
  // params should already start with & if needed (client code will pass it like "&query=abc")
  const url = `${base}/${path}?api_key=${encodeURIComponent(TMDB_KEY)}&language=en-US${params}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    res.status(r.ok ? 200 : r.status).json(data);
  } catch (err) {
    console.error('tmdb proxy error', err);
    res.status(500).json({ ok:false, message: 'Proxy error' });
  }
}
