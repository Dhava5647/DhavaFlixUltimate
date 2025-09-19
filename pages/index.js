import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';

export default function Home() {
    // --- STATE MANAGEMENT ---
    const [myList, setMyList] = useState([]);
    const [continueWatching, setContinueWatching] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [currentView, setCurrentView] = useState('home');
    const [heroItem, setHeroItem] = useState(null);
    const [contentRows, setContentRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalDetails, setModalDetails] = useState(null);
    const [videoKey, setVideoKey] = useState(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
    const [theme, setTheme] = useState('dark');

    // --- CONFIG ---
    const apiKey = "0627e9682f6c3eca80da4e2a6217ce57";
    const apiBaseUrl = "https://api.themoviedb.org/3";
    const imageBaseUrl = "https://image.tmdb.org/t/p/";

    // --- LOCAL STORAGE HELPERS ---
    useEffect(() => {
        setMyList(JSON.parse(localStorage.getItem('dhavaflixMyList')) || []);
        setContinueWatching(JSON.parse(localStorage.getItem('dhavaflixContinueWatching')) || []);
        setReminders(JSON.parse(localStorage.getItem('dhavaflixReminders')) || []);
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        document.documentElement.classList.toggle('light', savedTheme === 'light');
    }, []);

    const saveToLocalStorage = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    // --- API & UTILITY HELPERS ---
    const fetchApi = useCallback(async (path, params = "") => {
        const url = `${apiBaseUrl}/${path}?api_key=${apiKey}&language=en-US${params}`;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                console.error(`API Error: Status ${res.status} for ${url}`);
                return null;
            }
            return await res.json();
        } catch (err) {
            console.error(`Failed to fetch ${path}:`, err);
            return null;
        }
    }, [apiKey]);

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // --- CORE LOGIC & PAGE RENDERING ---
    const renderHomePage = useCallback(async () => {
        setIsLoading(true);
        const categories = [
            { title: "Trending This Week", endpoint: "trending/all/week" },
            { title: "Popular in India", endpoint: "discover/movie", params: "&region=IN&sort_by=popularity.desc&with_original_language=hi|te|ta" },
            { title: "Top Rated Movies", endpoint: "movie/top_rated" }
        ];

        const heroData = await fetchApi('trending/all/week');
        if (heroData && heroData.results.length > 0) {
            setHeroItem(heroData.results[Math.floor(Math.random() * Math.min(10, heroData.results.length))]);
        }

        const promises = categories.map(category => fetchApi(category.endpoint, category.params));
        const results = await Promise.all(promises);
        
        const rows = results.map((data, index) => {
            if (data && data.results && data.results.length > 0) {
                return { title: categories[index].title, items: data.results, endpoint: categories[index].endpoint };
            }
            return null;
        }).filter(Boolean);
        
        const localContinueWatching = JSON.parse(localStorage.getItem('dhavaflixContinueWatching')) || [];
        if (localContinueWatching.length > 0) {
             rows.unshift({ title: "Continue Watching", items: localContinueWatching });
        }
       
        setContentRows(rows);
        setIsLoading(false);
    }, [fetchApi]);

    // This useEffect hook will run when the component mounts and when `currentView` changes.
    useEffect(() => {
        // Based on the current view, you can decide what content to load.
        // For now, we'll just load the home page content as the default.
        renderHomePage();
    }, [currentView, renderHomePage]);


    // --- EVENT HANDLERS ---
    const handleShowDetails = async (id, type) => {
        const details = await fetchApi(`${type}/${id}`, '&append_to_response=videos,credits');
        if (details) setModalDetails(details);
    };

    const handlePlayTrailer = async (id, type) => {
        const data = await fetchApi(`${type}/${id}/videos`);
        const trailer = data?.results.find(v => v.type === "Trailer" && v.site === "YouTube");
        if (trailer) {
            setVideoKey(trailer.key);
        } else {
            alert("Trailer not available for this title.");
        }
    };
    
    const handleAddToMyList = (item) => {
        let updatedList = [...myList];
        const isInList = myList.some(i => i.id === item.id);
        if (isInList) {
            updatedList = updatedList.filter(i => i.id !== item.id);
        } else {
            updatedList.push({ id: item.id, type: item.media_type || (item.title ? 'movie' : 'tv'), poster_path: item.poster_path, title: item.title || item.name });
        }
        setMyList(updatedList);
        saveToLocalStorage('dhavaflixMyList', updatedList);
    };
    
    const handleSearch = useCallback(debounce(async (query) => {
        if (query) {
            const data = await fetchApi(`search/multi`, `&query=${encodeURIComponent(query)}`);
            const results = data ? data.results.filter(item => item.poster_path && item.media_type !== 'person') : [];
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    }, 300), [fetchApi]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('light', newTheme === 'light');
    };

    useEffect(() => {
        const handleScroll = () => setIsHeaderScrolled(window.scrollY > 0);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);


    // --- RENDER COMPONENTS ---
    const ItemCard = ({ item, endpoint }) => {
        if (!item.poster_path) return null;
        const type = item.media_type || (item.title ? 'movie' : 'tv') || (endpoint?.includes('movie') ? 'movie' : 'tv');
        return (
            <div className="group flex-shrink-0 w-36 sm:w-48 md:w-56 relative">
                <div className="movie-card w-full aspect-[2/3] themed-bg rounded-lg overflow-hidden relative">
                    <img src={`${imageBaseUrl}w500${item.poster_path}`} alt={item.title || item.name} className="w-full h-full object-cover" loading="lazy" />
                    {item.vote_average > 7.0 && <div className="quality-badge">HD</div>}
                </div>
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex flex-col items-center justify-center p-2 text-center z-20">
                    <h3 className="font-bold text-sm mb-3">{item.title || item.name}</h3>
                    <button onClick={() => handlePlayTrailer(item.id, type)} className="w-full bg-white text-black text-sm font-semibold py-2 rounded mb-2 transition hover:scale-105">▶ Play Trailer</button>
                    <button onClick={() => handleShowDetails(item.id, type)} className="w-full bg-gray-700/80 text-sm font-semibold py-2 rounded transition hover:scale-105">ℹ More Info</button>
                </div>
            </div>
        );
    };
    
    // --- MAIN RENDER ---
    return (
        <>
            <Head>
                <title>DhavaFlix – Watch Movies & Webseries</title>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </Head>

            <header id="main-header" className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isHeaderScrolled ? 'header-scrolled' : ''}`}>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center space-x-8">
                            <a href="#" aria-label="DhavaFlix Home">
                               <svg width="150" height="38" viewBox="0 0 150 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <defs><linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--electric-blue-light)"/><stop offset="100%" stopColor="var(--electric-blue)"/></linearGradient></defs>
                                  <text x="0" y="29" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="800" fill="url(#logo-gradient)">DHAVA</text><text id="logo-text" x="95" y="29" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="800" fill="var(--text-primary-dark)">FLIX</text>
                               </svg>
                            </a>
                            <nav className="hidden md:flex space-x-6 text-sm font-medium">
                                <a href="#" className="nav-link themed-text transition-transform duration-300 hover:scale-105 active">Home</a>
                                <a href="#" className="nav-link themed-text transition-transform duration-300 hover:scale-105">TV Shows</a>
                            </nav>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button onClick={toggleTheme} className="themed-text p-2 rounded-full hover:bg-gray-700 transition-colors duration-300">{theme === 'light' ? '☀️' : '🌙'}</button>
                            <button onClick={() => setIsSearchOpen(true)} className="themed-text"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-20">
                {heroItem && (
                    <section className="relative min-h-[50vh] md:min-h-[calc(85vh-5rem)] flex items-center justify-center">
                        <div className="absolute inset-0">
                            <img src={`${imageBaseUrl}w1280${heroItem.backdrop_path}`} className="w-full h-full object-cover object-top" alt={heroItem.title || heroItem.name} />
                            <div className="absolute inset-0 hero-gradient"></div>
                        </div>
                        <div className="relative z-10 flex flex-col justify-end h-full w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-10 md:pb-0 md:justify-center">
                            <div className="max-w-xl">
                                <h2 className="text-3xl md:text-6xl font-bold hero-text-shadow">{heroItem.title || heroItem.name}</h2>
                                <p className="mt-4 text-sm md:text-lg max-w-lg hero-text-shadow line-clamp-2 md:line-clamp-3">{heroItem.overview}</p>
                                <div className="mt-6 flex space-x-4">
                                    <button onClick={() => handlePlayTrailer(heroItem.id, heroItem.media_type || (heroItem.title ? 'movie' : 'tv'))} className="bg-white text-black font-semibold py-2 px-5 rounded flex items-center hover:bg-gray-200 transition duration-300 hover:scale-105">Play Trailer</button>
                                    <button onClick={() => handleShowDetails(heroItem.id, heroItem.media_type || (heroItem.title ? 'movie' : 'tv'))} className="bg-gray-700/80 font-semibold py-2 px-5 rounded flex items-center hover:bg-gray-600/70 transition duration-300 hover:scale-105">More Info</button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
                
                <div className="py-8 md:py-12 space-y-8 md:space-y-12">
                    {isLoading ? (
                         Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="px-4 sm:px-6 lg:px-8">
                                <div className="h-8 w-1/3 themed-bg shimmer rounded-lg shadow-sm mb-4"></div>
                                <div className="flex space-x-4">
                                    {Array.from({ length: 5 }).map((_, j) => (
                                        <div key={j} className="flex-shrink-0 w-36 sm:w-48 md:w-56">
                                            <div className="w-full aspect-[2/3] themed-bg shimmer rounded-lg shadow-sm"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        contentRows.map(row => (
                            <div key={row.title} className="carousel-category">
                                <h2 className="text-lg sm:text-2xl font-bold mb-3 md:mb-4 px-4 sm:px-6 lg:px-8">{row.title}</h2>
                                <div className="carousel-container relative">
                                    <div className="carousel-wrapper flex overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-6 lg:px-8 space-x-4">
                                        {row.items.map(item => <ItemCard key={item.id} item={item} endpoint={row.endpoint} />)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {isSearchOpen && (
                 <div className="fixed inset-0 z-[60] bg-black/80 search-overlay">
                     <div className="container mx-auto px-4 pt-24">
                         <button onClick={() => setIsSearchOpen(false)} className="absolute top-8 right-8 text-4xl">&times;</button>
                         <input type="text" onChange={(e) => handleSearch(e.target.value)} className="w-full bg-transparent border-b-2 border-electric-blue text-2xl md:text-5xl focus:outline-none" placeholder="Search movies, TV shows..." autoFocus />
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
                            {searchResults.map(item => <ItemCard key={item.id} item={item} />)}
                         </div>
                     </div>
                 </div>
            )}
            
            {videoKey && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80">
                    <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
                        <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${videoKey}?autoplay=1`} frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen></iframe>
                        <button onClick={() => setVideoKey(null)} className="absolute top-2 right-2 text-3xl">&times;</button>
                    </div>
                </div>
            )}
        </>
    );
}
