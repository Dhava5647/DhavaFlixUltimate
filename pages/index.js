import { useEffect, useState } from "react";

export default function Home() {
  const [content, setContent] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [category, setCategory] = useState("movie"); // "movie" or "tv"
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Fetch Movies or TV Shows
  useEffect(() => {
    async function fetchContent() {
      const res = await fetch(
        `https://api.themoviedb.org/3/${category}/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`
      );
      const data = await res.json();
      setContent(data.results || []);
      setFeatured(data.results ? data.results[0] : null);
    }
    fetchContent();
  }, [category]);

  // Search function
  async function handleSearch(e) {
    e.preventDefault();
    if (!query) return;

    const res = await fetch(
      `https://api.themoviedb.org/3/search/multi?api_key=${process.env.TMDB_API_KEY}&language=en-US&query=${query}`
    );
    const data = await res.json();
    setSearchResults(data.results || []);
  }

  return (
    <div className="bg-black min-h-screen text-white">
      {/* Navbar */}
      <header className="bg-gray-900 p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center shadow-md">
        <h1 className="text-2xl font-extrabold mb-3 sm:mb-0">
          DhavaFlixUltimate
        </h1>

        {/* Nav buttons */}
        <nav className="flex space-x-4 mb-3 sm:mb-0">
          <button
            onClick={() => {
              setCategory("movie");
              setSearchResults([]);
            }}
            className={`px-3 py-1 rounded ${
              category === "movie"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => {
              setCategory("tv");
              setSearchResults([]);
            }}
            className={`px-3 py-1 rounded ${
              category === "tv"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            TV Shows
          </button>
        </nav>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="flex w-full sm:w-auto bg-gray-800 rounded-lg overflow-hidden"
        >
          <input
            type="text"
            placeholder="Search movies, TV..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="px-3 py-2 w-full bg-transparent text-white outline-none"
          />
          <button
            type="submit"
            className="bg-blue-600 px-4 hover:bg-blue-700"
          >
            Search
          </button>
        </form>
      </header>

      {/* Hero Banner */}
      {featured && !searchResults.length && (
        <section
          className="relative h-[400px] flex items-end p-6 bg-cover bg-center"
          style={{
            backgroundImage: `url(https://image.tmdb.org/t/p/original${featured.backdrop_path})`,
          }}
        >
          <div className="bg-black/60 p-4 rounded-xl">
            <h2 className="text-3xl font-bold">
              {category === "movie" ? featured.title : featured.name}
            </h2>
            <p className="mt-2 text-sm max-w-md line-clamp-3">
              {featured.overview}
            </p>
          </div>
        </section>
      )}

      {/* Grid */}
      <main className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {(searchResults.length ? searchResults : content).map((item) => (
          <div
            key={item.id}
            className="bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:scale-105 transform transition duration-300"
          >
            <img
              src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
              alt={item.title || item.name}
              className="w-full h-auto"
            />
            <div className="p-3">
              <h3 className="text-sm sm:text-base font-semibold text-center line-clamp-2">
                {item.title || item.name}
              </h3>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

