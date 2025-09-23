import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

// --- Constants ---
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/";
const SITE_URL = "https://dhavaflix.vercel.app"; // Your live site

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [shows, setShows] = useState([]);
  const [heroItem, setHeroItem] = useState(null);
  const videoRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const movieRes = await fetch(`/api/tmdb?path=movie/popular`);
      const showRes = await fetch(`/api/tmdb?path=tv/popular`);
      const movieData = await movieRes.json();
      const showData = await showRes.json();

      setMovies(movieData.results || []);
      setShows(showData.results || []);

      const randomHero =
        Math.random() > 0.5
          ? movieData.results[Math.floor(Math.random() * movieData.results.length)]
          : showData.results[Math.floor(Math.random() * showData.results.length)];
      setHeroItem(randomHero);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!heroItem) return <div className="text-white">Loading...</div>;

  return (
    <>
      {/* ✅ SEO Head */}
      <Head>
        <title>DhavaFlix – Watch Movies & Webseries Online Free</title>
        <meta
          name="description"
          content="DhavaFlix lets you stream movies and webseries online for free. Browse popular titles, trending shows, and watch the latest releases in HD."
        />

        {/* Canonical */}
        <link rel="canonical" href={SITE_URL} />

        {/* Open Graph */}
        <meta property="og:title" content="DhavaFlix – Watch Movies & Webseries Online Free" />
        <meta
          property="og:description"
          content="Stream trending movies and webseries online in HD for free on DhavaFlix."
        />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${SITE_URL}/logo.png`} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="DhavaFlix – Watch Movies & Webseries Online Free" />
        <meta
          name="twitter:description"
          content="Browse popular movies and trending shows. Watch free online in HD."
        />
        <meta name="twitter:image" content={`${SITE_URL}/logo.png`} />
      </Head>

      {/* ✅ Hero Section with H1 */}
      <section
        className="relative h-[60vh] md:h-[80vh] w-full text-white"
        style={{
          backgroundImage: `url(${IMAGE_BASE_URL}original${heroItem.backdrop_path})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent"></div>
        <div className="relative z-10 p-6 md:p-12 max-w-2xl">
          <h1 className="text-3xl md:text-6xl font-bold hero-text-shadow">
            {heroItem.title || heroItem.name}
          </h1>
          <p className="mt-4 text-base md:text-lg text-gray-200 line-clamp-3">
            {heroItem.overview}
          </p>
          <Link href={`/movie/${heroItem.id}`}>
            <button className="mt-6 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-lg font-semibold shadow-lg">
              Watch Now
            </button>
          </Link>
        </div>
      </section>

      {/* Movies Section */}
      <section className="p-6 md:p-12">
        <h2 className="text-2xl font-bold text-white mb-4">Popular Movies</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
          {movies.map((movie) => (
            <Link key={movie.id} href={`/movie/${movie.id}`}>
              <div className="cursor-pointer">
                <img
                  src={`${IMAGE_BASE_URL}w500${movie.poster_path}`}
                  alt={movie.title}
                  className="rounded-lg shadow-lg hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* TV Shows Section */}
      <section className="p-6 md:p-12">
        <h2 className="text-2xl font-bold text-white mb-4">Popular Webseries</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
          {shows.map((show) => (
            <Link key={show.id} href={`/tv/${show.id}`}>
              <div className="cursor-pointer">
                <img
                  src={`${IMAGE_BASE_URL}w500${show.poster_path}`}
                  alt={show.name}
                  className="rounded-lg shadow-lg hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
