const BASE_URL = 'https://dhavaflix.vercel.app'; // Your final URL

async function generateSitemap() {
    const response = await fetch(`${BASE_URL}/api/tmdb?path=movie/popular`);
    const movies = await response.json();

    const movieUrls = movies.results.map(movie => {
        return `<url><loc>${BASE_URL}/movie/${movie.id}</loc></url>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url><loc>${BASE_URL}</loc></url>
     ${movieUrls}
   </urlset>
 `;
}

function Sitemap() {}

export async function getServerSideProps({ res }) {
  const sitemap = await generateSitemap();

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return { props: {} };
}

export default Sitemap;


