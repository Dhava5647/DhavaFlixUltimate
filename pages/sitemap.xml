const BASE_URL = 'https://dhavaflix.myvnc.com';

// This function generates the XML for the sitemap
async function generateSitemap() {
  try {
    // Use the secure, server-side environment variable
    const API_KEY = process.env.TMDB_API_KEY; 
    const response = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}`);
    const movies = await response.json();

    const today = new Date().toISOString().split('T')[0];

    const movieUrls = movies.results.map((movie) => {
      return `
        <url>
          <loc>${BASE_URL}/movie/${movie.id}</loc>
          <lastmod>${today}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
      `;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
          <loc>${BASE_URL}</loc>
          <lastmod>${today}</lastmod>
          <changefreq>daily</changefreq>
          <priority>1.0</priority>
        </url>
        <url>
          <loc>${BASE_URL}/movies</loc>
          <lastmod>${today}</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.9</priority>
        </url>
        <url>
          <loc>${BASE_URL}/tv-shows</loc>
          <lastmod>${today}</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.9</priority>
        </url>
        ${movieUrls}
      </urlset>`;
  } catch (err) {
    console.error("Sitemap generation failed.", err);
    // Return a fallback sitemap on error
    return `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
          <loc>${BASE_URL}</loc>
        </url>
      </urlset>`;
  }
}

// This is the actual page component, which we don't need to render anything
function Sitemap() {
  return null;
}

export async function getServerSideProps({ res }) {
  const sitemap = await generateSitemap();

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

export default Sitemap;
