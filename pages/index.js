import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

// --- Constants ---
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/";

// --- Main App Component ---
// This is the final, stable version that links to the new dedicated details pages.
export default function DhavaFlixApp() {
    const [myList, setMyList] = useState([]);
    const [continueWatching, setContinueWatching] = useState([]);
    const [heroItem, setHeroItem] = useState(null);
    const [contentData, setContentData] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [videoKey, setVideoKey] = useState(null);
    const [currentView, setCurrentView] = useState('home');
    const [isLoading, setIsLoading] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
    const [theme, setTheme] = useState('dark');

    // --- Local Storage Sync ---
    useEffect(() => {
        try {
            setMyList(JSON.parse(localStorage.getItem('dhavaflixMyList')) || []);
            setContinueWatching(JSON.parse(localStorage.getItem('dhavaflixContinueWatching')) || []);
            const savedTheme = localStorage.getItem('theme') || 'dark';
            setTheme(savedTheme);
            document.documentElement.classList.toggle('light', savedTheme === 'light');
        } catch (error) { console.error("Error initializing from localStorage", error); }
    }, []);

    const saveToLocalStorage = (key, data) => {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch (error) { console.error("Error saving to localStorage", error); }
    };

    // --- API Helper ---
    const fetchApi = useCallback(async (path, params = "") => {
        const queryParams = new URLSearchParams(params.replace(/^&/, '')).toString();
        const url = `/api/tmdb?path=${encodeURIComponent(path)}&${queryParams}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`API proxy error: ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error(`Failed to fetch via proxy for path "${path}":`, err);
            return null;
        }
    }, []);
    
    // --- Data Fetching Logic ---
    const fetchAndSetContent = useCallback(async (viewConfig) => {
        setIsLoading(true);
        const heroData = await fetchApi(viewConfig.heroEndpoint);
        if (heroData?.results?.length) {
            setHeroItem(heroData.results[Math.floor(Math.random() * Math.min(10, heroData.results.length))]);
        }
        const results = await Promise.all(viewConfig.categories.map(cat => fetchApi(cat.endpoint, cat.params)));
        let rows = results.map((data, i) => ({ title: viewConfig.categories[i].title, items: data?.results || [] })).filter(row => row.items.length > 0);
        if (viewConfig.showContinueWatching) {
            const cw = JSON.parse(localStorage.getItem('dhavaflixContinueWatching')) || [];
            if (cw.length > 0) rows.unshift({ title: "Continue Watching", items: cw });
        }
        setContentData(rows);
        setIsLoading(false);
    }, [fetchApi]);

    // --- Navigation ---
    const updateView = useCallback((view) => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
        setHeroItem(null);
        setContentData([]);
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const viewConfigs = {
            home: { heroEndpoint: 'trending/all/week', categories: [{ title: "Trending This Week", endpoint: "trending/all/week" }, { title: "Popular in India", endpoint: "discover/movie", params: "&region=IN&sort_by=popularity.desc&with_original_language=hi|te|ta" }, { title: "Popular TV Shows", endpoint: "tv/popular", params: "&region=IN" }, { title: "Top Rated Movies", endpoint: "movie/top_rated" }], showContinueWatching: true },
            movies: { heroEndpoint: 'movie/popular', categories: [{ title: "Now Playing in Theaters", endpoint: "movie/now_playing", params: "&region=IN" }, { title: "Action Movies", endpoint: "discover/movie", params: "&with_genres=28" }, { title: "Comedies", endpoint: "discover/movie", params: "&with_genres=35" }, { title: "Horror", endpoint: "discover/movie", params: "&with_genres=27" }, { title: "Top Rated", endpoint: "movie/top_rated" }, { title: "Upcoming", endpoint: "movie/upcoming", params: "&region=IN" }] },
            tv: { heroEndpoint: 'tv/popular', categories: [{ title: "Airing Today", endpoint: "tv/airing_today" }, { title: "Animation", endpoint: "discover/tv", params: "&with_genres=16" }, { title: "Crime Dramas", endpoint: "discover/tv", params: "&with_genres=80" }, { title: "Documentaries", endpoint: "discover/tv", params: "&with_genres=99" }, { title: "Sci-Fi & Fantasy", endpoint: "discover/tv", params: "&with_genres=10765" }, { title: "Top Rated Shows", endpoint: "tv/top_rated" }] }
        };
        if (viewConfigs[currentView]) fetchAndSetContent(viewConfigs[currentView]);
        else setIsLoading(false);
    }, [currentView, fetchAndSetContent]);
    
    // --- Event Handlers ---
    const handlePlayTrailer = useCallback(async (item) => {
        setContinueWatching(currentCw => {
            const newCw = [item, ...currentCw.filter(i => i.id !== item.id)].slice(0, 20);
            saveToLocalStorage('dhavaflixContinueWatching', newCw);
            return newCw;
        });
        const data = await fetchApi(`${item.type}/${item.id}/videos`);
        const trailer = data?.results?.find(v => v.type === "Trailer" && v.site === "YouTube");
        if (trailer) setVideoKey(trailer.key);
        else alert("Trailer not available for this title.");
    }, [fetchApi]);

    const debounce = (func, delay) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); }; };
    const debouncedSearch = useCallback(debounce(async (query) => {
        if (query) {
            const data = await fetchApi(`search/multi`, `&query=${encodeURIComponent(query)}`);
            setSearchResults(data?.results?.filter(item => item.poster_path && item.media_type !== 'person') || []);
        } else { setSearchResults([]); }
    }, 300), [fetchApi]);
    
    const toggleTheme = () => {
        setTheme(currentTheme => {
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            document.documentElement.classList.toggle('light', newTheme === 'light');
            return newTheme;
        });
    };
    
    useEffect(() => {
        const handleScroll = () => setIsHeaderScrolled(window.scrollY > 0);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <Head>
                <title>DhavaFlix – Watch Movies & Webseries</title>
                <meta name="description" content="A Netflix-style streaming site to explore the latest movies and TV shows."/>
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </Head>
            <div className="themed-bg">
                <Header isScrolled={isHeaderScrolled} onNavClick={updateView} currentView={currentView} onSearchClick={() => setIsSearchOpen(true)} onThemeToggle={toggleTheme} theme={theme} onMobileMenuClick={() => setIsMobileMenuOpen(o => !o)} />
                <MobileMenu isOpen={isMobileMenuOpen} onNavClick={updateView} currentView={currentView} />
                <main className="pt-20">
                    <MainContent currentView={currentView} isLoading={isLoading} heroItem={heroItem} contentData={contentData} myList={myList} onPlayTrailer={handlePlayTrailer} />
                </main>
                <Footer onNavClick={updateView} />
                <BottomNav onNavClick={updateView} currentView={currentView} />
                <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSearch={debouncedSearch} results={searchResults} onPlayTrailer={handlePlayTrailer} />
                {videoKey && <VideoModal videoKey={videoKey} onClose={() => setVideoKey(null)} />}
            </div>
        </>
    );
}

// --- Sub-Components ---

function MainContent({ currentView, isLoading, heroItem, contentData, myList, onPlayTrailer }) {
    if (isLoading && !['mylist', 'profile'].includes(currentView)) {
        return (
            <>
                <section className="relative min-h-[50vh] md:min-h-[calc(85vh-5rem)] flex items-center justify-center themed-bg shimmer"></section>
                <div className="py-8 md:py-12 space-y-8 md:space-y-12"><SkeletonLoader /></div>
            </>
        );
    }
    if (currentView === 'mylist') return <ListPage title="My List" items={myList} onPlayTrailer={onPlayTrailer} />;
    if (currentView === 'profile') return <ProfilePage />;
    return (
        <>
            {heroItem && <HeroSection item={heroItem} onPlayTrailer={onPlayTrailer}/>}
            <div className="py-8 md:py-12 space-y-8 md:space-y-12">
                {contentData.map(row => <ContentRow key={row.title} row={row} onPlayTrailer={onPlayTrailer}/>)}
            </div>
        </>
    );
}

function ListPage({ title, items, onPlayTrailer }) {
    return (
        <div className="px-4 sm:px-6 lg:px-8 pt-8 min-h-screen">
            <h1 className="text-2xl md:text-4xl font-bold mb-6">{title}</h1>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {items.length > 0
                    ? items.map(item => <ItemCard key={item.id} item={item} onPlayTrailer={onPlayTrailer} />)
                    : <p className="col-span-full themed-text text-center py-10">🎬 This list is empty.</p>
                }
            </div>
        </div>
    );
}

function Header({ isScrolled, onNavClick, currentView, onSearchClick, onThemeToggle, theme, onMobileMenuClick }) {
    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'header-scrolled' : ''}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8"><div className="flex items-center justify-between h-20">
                <div className="flex items-center space-x-8">
                    <button onClick={() => onNavClick('home')} aria-label="DhavaFlix Home">
                       <svg width="150" height="38" viewBox="0 0 150 38" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--electric-blue-light)"/><stop offset="100%" stopColor="var(--electric-blue)"/></linearGradient></defs><text x="0" y="29" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="800" fill="url(#logo-gradient)">DHAVA</text><text id="logo-text" x="95" y="29" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="800" fill="var(--text-primary-dark)">FLIX</text></svg>
                    </button>
                    <nav className="hidden md:flex space-x-6 text-sm font-medium">
                        {[{v:'home', t:'Home'}, {v:'tv', t:'TV Shows'}, {v:'movies', t:'Movies'}, {v:'mylist', t:'My List'}].map(({v, t}) => 
                            <button key={v} onClick={() => onNavClick(v)} className={`nav-link themed-text transition-transform duration-300 hover:scale-105 ${currentView === v ? 'active' : ''}`}>{t}</button>
                        )}
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                    <button onClick={onThemeToggle} className="themed-text p-2 rounded-full hover:bg-gray-700" aria-label="Toggle Theme">{theme === 'light' ? '☀️' : '🌙'}</button>
                    <button onClick={onSearchClick} className="themed-text" aria-label="Search"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
                    <button onClick={() => onNavClick('profile')} className="hidden md:block" aria-label="Profile"><img src="https://placehold.co/40x40/0072F5/FFFFFF?text=D" alt="Profile" className="w-8 h-8 rounded-md"/></button>
                    <div className="md:hidden"><button onClick={onMobileMenuClick} className="themed-text" aria-label="Open Menu"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg></button></div>
                </div>
            </div></div>
        </header>
    );
}

function HeroSection({ item, onPlayTrailer }) {
    const itemType = item.media_type || (item.title ? 'movie' : 'tv');
    const fullItem = {...item, type: itemType, title: item.title || item.name };
    const detailUrl = `/${itemType}/${item.id}`;

    return (
        <section className="relative min-h-[50vh] md:min-h-[calc(85vh-5rem)] flex items-center">
            <div className="absolute inset-0">
                <img src={`${IMAGE_BASE_URL}w1280${item.backdrop_path}`} className="w-full h-full object-cover object-top" alt={fullItem.title} />
                <div className="absolute inset-0 hero-gradient"></div>
            </div>
            <div className="relative z-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8"><div className="max-w-xl">
                <h2 className="text-3xl md:text-6xl font-bold hero-text-shadow">{fullItem.title}</h2>
                <p className="mt-4 text-sm md:text-lg max-w-lg hero-text-shadow line-clamp-2 md:line-clamp-3">{item.overview}</p>
                <div className="mt-6 flex space-x-4">
                    <button onClick={() => onPlayTrailer(fullItem)} className="bg-white text-black font-semibold py-2 px-5 rounded flex items-center hover:bg-gray-200 transition duration-300 hover:scale-105">Play Trailer</button>
                    <Link href={detailUrl}><a className="bg-gray-700/80 font-semibold py-2 px-5 rounded flex items-center hover:bg-gray-600/70 transition duration-300 hover:scale-105">More Info</a></Link>
                </div>
            </div></div>
        </section>
    );
}

function ContentRow({ row, onPlayTrailer }) {
    const rowRef = useRef(null);
    const scroll = (amount) => rowRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
    return (
        <div className="carousel-category"><h2 className="text-lg sm:text-2xl font-bold mb-3 md:mb-4 px-4 sm:px-6 lg:px-8">{row.title}</h2>
            <div className="carousel-container relative">
                <div ref={rowRef} className="carousel-wrapper flex overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-6 lg:px-8 space-x-4">
                    {row.items.map(item => item.poster_path && <ItemCard key={item.id} item={item} onPlayTrailer={onPlayTrailer}/>)}
                </div>
                <button onClick={() => scroll(-rowRef.current.clientWidth)} className="carousel-arrow left-2 absolute top-0 bottom-0 px-4 bg-black/50 hidden md:flex items-center z-20 rounded-l-lg" aria-label="Scroll Left">&#9664;</button>
                <button onClick={() => scroll(rowRef.current.clientWidth)} className="carousel-arrow right-2 absolute top-0 bottom-0 px-4 bg-black/50 hidden md:flex items-center z-20 rounded-r-lg" aria-label="Scroll Right">&#9654;</button>
            </div>
        </div>
    );
}

function ItemCard({ item, onPlayTrailer }) {
    const itemType = item.media_type || (item.title ? 'movie' : 'tv') || item.type || 'movie';
    const fullItem = {...item, type: itemType, title: item.title || item.name };
    const detailUrl = `/${itemType}/${item.id}`;

    return (
        <div className="group flex-shrink-0 w-36 sm:w-48 md:w-56 relative">
            <div className="movie-card w-full aspect-[2/3] themed-bg rounded-lg overflow-hidden relative">
                <img src={`${IMAGE_BASE_URL}w500${item.poster_path}`} alt={fullItem.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex flex-col items-center justify-center p-2 text-center z-20">
                <h3 className="font-bold text-sm mb-3">{fullItem.title}</h3>
                <button onClick={() => onPlayTrailer(fullItem)} className="w-full bg-white text-black text-sm font-semibold py-2 rounded mb-2 transition hover:scale-105">▶ Play Trailer</button>
                <Link href={detailUrl}><a className="w-full bg-gray-700/80 text-sm font-semibold py-2 rounded transition hover:scale-105 block">ℹ More Info</a></Link>
            </div>
        </div>
    );
}

function VideoModal({ videoKey, onClose }) {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80" role="dialog" aria-modal="true">
            <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
                <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${videoKey}?autoplay=1`} title="YouTube video player" frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen></iframe>
                <button onClick={onClose} className="absolute top-2 right-2 text-3xl text-white" aria-label="Close video">&times;</button>
            </div>
        </div>
    );
}

function SearchOverlay({ isOpen, onClose, onSearch, results, onPlayTrailer }) {
    if(!isOpen) return null;
    return (
         <div className="fixed inset-0 z-[60] bg-black/80 search-overlay">
             <div className="container mx-auto px-4 pt-24">
                 <button onClick={onClose} className="absolute top-8 right-8 text-4xl">&times;</button>
                 <input type="text" onChange={(e) => onSearch(e.target.value)} className="w-full bg-transparent border-b-2 border-electric-blue text-2xl md:text-5xl focus:outline-none" placeholder="Search movies, TV shows..." autoFocus />
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
                    {results.map(item => <ItemCard key={item.id} item={item} onPlayTrailer={onPlayTrailer} />)}
                 </div>
             </div>
         </div>
    );
}

function MobileMenu({ isOpen, onNavClick, currentView }) {
    return (
        <div id="mobile-menu" className={`fixed top-0 left-0 h-full w-64 z-40 transform md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <nav className="mt-24 flex flex-col space-y-6 px-6">
                {[{v:'home', t:'Home'}, {v:'tv', t:'TV Shows'}, {v:'movies', t:'Movies'}, {v:'mylist', t:'My List'}, {v:'profile', t:'Profile'}].map(({v,t}) =>
                    <button key={v} onClick={() => onNavClick(v)} className={`nav-link themed-text text-lg text-left ${currentView === v ? 'active' : ''} ${v === 'profile' ? 'mt-4 border-t border-gray-700 pt-4' : ''}`}>{t}</button>
                )}
            </nav>
        </div>
    );
}

function BottomNav({ onNavClick, currentView }) {
    return (
         <div className="fixed bottom-0 left-0 right-0 themed-bg bottom-nav flex justify-around py-2 md:hidden z-50 border-t border-gray-700/50">
            {[{v:'home', t:'Home', i:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'}, {v:'tv', t:'TV', i:'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'}, {v:'movies', t:'Movies', i:'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'}, {v:'mylist', t:'My List', i:'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'}].map(({v,t,i}) =>
                <button key={v} onClick={() => onNavClick(v)} className={`flex flex-col items-center text-xs themed-text ${currentView === v ? 'active' : ''}`}>
                    <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={i} /></svg>
                    <span>{t}</span>
                </button>
            )}
        </div>
    );
}

function Footer({ onNavClick }) {
    return (
         <footer className="themed-bg themed-text text-center py-6 mt-8 border-t border-gray-700/50 text-sm opacity-80">
            <p>© 2025 DhavaFlix. All Rights Reserved.</p>
            <div className="flex justify-center space-x-4 mt-2">
                <button onClick={() => onNavClick('privacy')} className="hover:underline">Privacy Policy</button><span>•</span>
                <button onClick={() => onNavClick('about')} className="hover:underline">About Us</button><span>•</span>
                <button onClick={() => onNavClick('contact')} className="hover:underline">Contact</button>
            </div>
        </footer>
    );
}

function PlaceholderPage({ view }) {
    const content = {
        privacy: { title: 'Privacy Policy', text: 'All user data is stored locally in your browser.' },
        about: { title: 'About Us', text: 'A demo project using the TMDB API.' },
        contact: { title: 'Contact Us', text: 'Contact at example@email.com.' }
    };
    const { title, text } = content[view] || {};
    return (
        <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-4xl mx-auto min-h-screen">
            <h1 className="text-3xl font-bold mb-6">{title}</h1><p className="themed-text">{text}</p>
        </div>
    );
}

function ProfilePage() {
    const [cw, setCw] = useState([]);
    const [ml, setMl] = useState([]);
    useEffect(() => {
        setCw(JSON.parse(localStorage.getItem('dhavaflixContinueWatching')) || []);
        setMl(JSON.parse(localStorage.getItem('dhavaflixMyList')) || []);
    }, []);
    const clearList = (key, setter) => { localStorage.removeItem(key); setter([]); };
    return (
        <div className="px-4 sm:px-6 lg:px-8 pt-8 min-h-screen">
            <h1 className="text-3xl font-bold mb-6">Profile & Settings</h1>
            <ProfileSection title="Continue Watching" items={cw} onClear={() => clearList('dhavaflixContinueWatching', setCw)} emptyText="No viewing history." />
            <ProfileSection title="My List" items={ml} onClear={() => clearList('dhavaflixMyList', setMl)} emptyText="Your list is empty." />
        </div>
    );
}

function ProfileSection({ title, items, onClear, emptyText }) {
    return (
        <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">{title}</h2>
                <button onClick={onClear} className="text-sm hover:text-electric-blue">Clear List</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {items.length > 0 
                    ? items.map(item => <img key={item.id} src={`${IMAGE_BASE_URL}w500${item.poster_path}`} alt={item.title} className="w-full aspect-[2/3] themed-bg rounded-lg object-cover" />) 
                    : <p className="col-span-full themed-text">{emptyText}</p>
                }
            </div>
        </div>
    );
}

function SkeletonLoader() {
    return (
        Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 sm:px-6 lg:px-8">
                <div className="h-8 w-1/3 themed-bg shimmer rounded-lg shadow-sm mb-4"></div>
                <div className="flex space-x-4 overflow-hidden">
                    {Array.from({ length: 5 }).map((_, j) => (
                        <div key={j} className="flex-shrink-0 w-36 sm:w-48 md:w-56"><div className="w-full aspect-[2/3] themed-bg shimmer rounded-lg shadow-sm"></div></div>
                    ))}
                </div>
            </div>
        ))
    );
}


