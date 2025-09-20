import Head from 'next/head';
import { useState, useEffect, useCallback, useRef } from 'react';

// --- Constants ---
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/";

// --- Main App Component ---
// This version includes the missing 'debounce' function to fix the Vercel build error.
export default function DhavaFlixApp() {
    // --- State Management ---
    const [myList, setMyList] = useState([]);
    const [continueWatching, setContinueWatching] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [heroItem, setHeroItem] = useState(null);
    const [contentData, setContentData] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [modalDetails, setModalDetails] = useState(null);
    const [videoKey, setVideoKey] = useState(null);
    const [currentView, setCurrentView] = useState('home');
    const [isLoading, setIsLoading] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
    const [theme, setTheme] = useState('dark');

    // --- Local Storage & Theme Sync ---
    useEffect(() => {
        try {
            setMyList(JSON.parse(localStorage.getItem('dhavaflixMyList')) || []);
            setContinueWatching(JSON.parse(localStorage.getItem('dhavaflixContinueWatching')) || []);
            setReminders(JSON.parse(localStorage.getItem('dhavaflixReminders')) || []);
            const savedTheme = localStorage.getItem('theme') || 'dark';
            setTheme(savedTheme);
            document.documentElement.classList.toggle('light', savedTheme === 'light');
        } catch (error) {
            console.error("Error initializing from localStorage", error);
        }
    }, []);

    const saveToLocalStorage = (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error("Error saving to localStorage", error);
        }
    };

    // --- Utility Helpers ---
    // THIS IS THE MISSING FUNCTION THAT IS NOW ADDED
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // --- API Helper using the Vercel Proxy ---
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
    
    // --- Data Fetching and View Logic ---
    const fetchAndSetContent = useCallback(async (viewConfig) => {
        setIsLoading(true);
        
        const heroData = await fetchApi(viewConfig.heroEndpoint);
        if (heroData?.results?.length) {
            setHeroItem(heroData.results[Math.floor(Math.random() * Math.min(10, heroData.results.length))]);
        }

        const results = await Promise.all(viewConfig.categories.map(cat => fetchApi(cat.endpoint, cat.params)));
        let rows = results.map((data, i) => ({
            title: viewConfig.categories[i].title,
            items: data?.results || []
        })).filter(row => row.items.length > 0);

        if (viewConfig.showContinueWatching) {
            const cw = JSON.parse(localStorage.getItem('dhavaflixContinueWatching')) || [];
             if (cw.length > 0) {
                rows.unshift({ title: "Continue Watching", items: cw });
            }
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
        const homeConfig = {
            heroEndpoint: 'trending/all/week',
            categories: [
                { title: "Trending This Week", endpoint: "trending/all/week" },
                { title: "Popular in India", endpoint: "discover/movie", params: "&region=IN&sort_by=popularity.desc&with_original_language=hi|te|ta" },
                { title: "Top Rated Movies", endpoint: "movie/top_rated" }
            ],
            showContinueWatching: true
        };

        const movieConfig = {
            heroEndpoint: 'movie/popular',
            categories: [
                { title: "Now Playing", endpoint: "movie/now_playing", params: "&region=IN" },
                { title: "Top Rated Movies", endpoint: "movie/top_rated" },
                { title: "Popular Movies", endpoint: "movie/popular" },
                { title: "Upcoming", endpoint: "movie/upcoming", params: "&region=IN" }
            ]
        };
        
        const tvConfig = {
            heroEndpoint: 'tv/popular',
            categories: [
                { title: "Airing Today", endpoint: "tv/airing_today" },
                { title: "Top Rated TV Shows", endpoint: "tv/top_rated" },
                { title: "Popular TV Shows", endpoint: "tv/popular" }
            ]
        };

        if (currentView === 'home') fetchAndSetContent(homeConfig);
        else if (currentView === 'movies') fetchAndSetContent(movieConfig);
        else if (currentView === 'tv') fetchAndSetContent(tvConfig);
        else setIsLoading(false); // For list pages like 'My List'

    }, [currentView, fetchAndSetContent]);
    
    // --- Event Handlers ---
    const handleShowDetails = useCallback(async (id, type) => {
        setModalDetails('loading');
        document.body.style.overflow = 'hidden';
        const details = await fetchApi(`${type}/${id}`, '&append_to_response=videos,credits');
        setModalDetails(details);
    }, [fetchApi]);

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

    const handleToggleMyList = (item) => {
        setMyList(currentMl => {
            const index = currentMl.findIndex(i => i.id === item.id);
            const newMl = index > -1 ? currentMl.filter(i => i.id !== item.id) : [item, ...currentMl];
            saveToLocalStorage('dhavaflixMyList', newMl);
            return newMl;
        });
    };

    const debouncedSearch = useCallback(debounce(async (query) => {
        if (query) {
            const data = await fetchApi(`search/multi`, `&query=${encodeURIComponent(query)}`);
            setSearchResults(data?.results?.filter(item => item.poster_path && item.media_type !== 'person') || []);
        } else {
            setSearchResults([]);
        }
    }, 300), [fetchApi]);
    
    // --- UI State Toggles ---
    const closeModal = () => { setModalDetails(null); document.body.style.overflow = 'auto'; };
    const closeVideo = () => setVideoKey(null);
    const closeSearch = () => setIsSearchOpen(false);

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

    // --- Main Render ---
    return (
        <>
            <Head>
                <title>DhavaFlix – Watch Movies & Webseries</title>
                <meta name="description" content="A Netflix-style streaming site to explore the latest movies and TV shows."/>
                <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎬</text></svg>" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </Head>

            <div className="themed-bg">
                <Header 
                    isScrolled={isHeaderScrolled}
                    onNavClick={updateView} 
                    currentView={currentView}
                    onSearchClick={() => setIsSearchOpen(true)}
                    onThemeToggle={toggleTheme}
                    theme={theme}
                    onMobileMenuClick={() => setIsMobileMenuOpen(o => !o)}
                />
                <MobileMenu 
                    isOpen={isMobileMenuOpen}
                    onNavClick={updateView}
                    currentView={currentView}
                />
                
                <main className="pt-20">
                    <MainContent
                        currentView={currentView}
                        isLoading={isLoading}
                        heroItem={heroItem}
                        contentData={contentData}
                        myList={myList}
                        onPlayTrailer={handlePlayTrailer}
                        onShowDetails={handleShowDetails}
                    />
                </main>

                <Footer onNavClick={updateView} />
                <BottomNav onNavClick={updateView} currentView={currentView} />

                <SearchOverlay
                    isOpen={isSearchOpen}
                    onClose={closeSearch}
                    onSearch={debouncedSearch}
                    results={searchResults}
                    onItemClick={handleShowDetails}
                    onTrailerClick={handlePlayTrailer}
                />
                <DetailsModal details={modalDetails} onClose={closeModal} onToggleMyList={handleToggleMyList} myList={myList} />
                {videoKey && <VideoModal videoKey={videoKey} onClose={closeVideo} />}
            </div>
        </>
    );
}

// --- Sub-Components (defined outside main component for stability) ---

function MainContent({ currentView, isLoading, heroItem, contentData, myList, onPlayTrailer, onShowDetails }) {
    const isListPage = ['mylist', 'profile', 'privacy', 'about', 'contact'].includes(currentView);

    if (isLoading && !isListPage) {
        return (
            <>
                <section className="relative min-h-[50vh] md:min-h-[calc(85vh-5rem)] flex items-center justify-center themed-bg shimmer"></section>
                <div className="py-8 md:py-12 space-y-8 md:space-y-12"><SkeletonLoader /></div>
            </>
        );
    }

    if (currentView === 'mylist') {
        return (
            <div className="px-4 sm:px-6 lg:px-8 pt-8 min-h-screen">
                <h1 className="text-2xl md:text-4xl font-bold mb-6">My List</h1>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {myList.length > 0
                        ? myList.map(item => <ItemCard key={item.id} item={item} onPlayTrailer={onPlayTrailer} onShowDetails={onShowDetails} />)
                        : <p className="col-span-full themed-text text-center py-10">🎬 Your list is empty.</p>
                    }
                </div>
            </div>
        );
    }
    
    if (isListPage) {
         if (currentView === 'profile') return <ProfilePage />;
         return <PlaceholderPage view={currentView} />;
    }

    return (
        <>
            {heroItem && <HeroSection item={heroItem} onPlayTrailer={onPlayTrailer} onShowDetails={onShowDetails}/>}
            <div className="py-8 md:py-12 space-y-8 md:space-y-12">
                {contentData.map(row => (
                    <ContentRow key={row.title} row={row} onPlayTrailer={onPlayTrailer} onShowDetails={onShowDetails}/>
                ))}
            </div>
        </>
    );
}

function Header({ isScrolled, onNavClick, currentView, onSearchClick, onThemeToggle, theme, onMobileMenuClick }) {
    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'header-scrolled' : ''}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center space-x-8">
                        <button onClick={() => onNavClick('home')} className="cursor-pointer" aria-label="DhavaFlix Home">
                           <svg width="150" height="38" viewBox="0 0 150 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                               <defs><linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--electric-blue-light)"/><stop offset="100%" stopColor="var(--electric-blue)"/></linearGradient></defs>
                               <text x="0" y="29" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="800" fill="url(#logo-gradient)">DHAVA</text><text id="logo-text" x="95" y="29" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="800" fill="var(--text-primary-dark)">FLIX</text>
                           </svg>
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
                </div>
            </div>
        </header>
    );
}

function HeroSection({ item, onPlayTrailer, onShowDetails }) {
    const itemType = item.media_type || (item.title ? 'movie' : 'tv');
    const fullItem = {...item, type: itemType, title: item.title || item.name };

    return (
        <section className="relative min-h-[50vh] md:min-h-[calc(85vh-5rem)] flex items-center justify-center">
            <div className="absolute inset-0">
                <img src={`${IMAGE_BASE_URL}w1280${item.backdrop_path}`} className="w-full h-full object-cover object-top" alt={fullItem.title} />
                <div className="absolute inset-0 hero-gradient"></div>
            </div>
            <div className="relative z-10 flex flex-col justify-end h-full w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-10 md:pb-0 md:justify-center">
                <div className="max-w-xl">
                    <h2 className="text-3xl md:text-6xl font-bold hero-text-shadow">{fullItem.title}</h2>
                    <p className="mt-4 text-sm md:text-lg max-w-lg hero-text-shadow line-clamp-2 md:line-clamp-3">{item.overview}</p>
                    <div className="mt-6 flex space-x-4">
                        <button onClick={() => onPlayTrailer(fullItem)} className="bg-white text-black font-semibold py-2 px-5 rounded flex items-center hover:bg-gray-200 transition duration-300 hover:scale-105">Play Trailer</button>
                        <button onClick={() => onShowDetails(fullItem.id, fullItem.type)} className="bg-gray-700/80 font-semibold py-2 px-5 rounded flex items-center hover:bg-gray-600/70 transition duration-300 hover:scale-105">More Info</button>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ContentRow({ row, onPlayTrailer, onShowDetails }) {
    const rowRef = useRef(null);
    const scroll = (amount) => rowRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
    return (
        <div className="carousel-category">
            <h2 className="text-lg sm:text-2xl font-bold mb-3 md:mb-4 px-4 sm:px-6 lg:px-8">{row.title}</h2>
            <div className="carousel-container relative">
                <div ref={rowRef} className="carousel-wrapper flex overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-6 lg:px-8 space-x-4">
                    {row.items.map(item => item.poster_path && <ItemCard key={item.id} item={item} onPlayTrailer={onPlayTrailer} onShowDetails={onShowDetails} />)}
                </div>
                <button onClick={() => scroll(-rowRef.current.clientWidth)} className="carousel-arrow left-2 absolute top-0 bottom-0 px-4 bg-black/50 hidden md:flex items-center z-20 rounded-l-lg" aria-label="Scroll Left">&#9664;</button>
                <button onClick={() => scroll(rowRef.current.clientWidth)} className="carousel-arrow right-2 absolute top-0 bottom-0 px-4 bg-black/50 hidden md:flex items-center z-20 rounded-r-lg" aria-label="Scroll Right">&#9654;</button>
            </div>
        </div>
    );
}

function ItemCard({ item, onPlayTrailer, onShowDetails }) {
    const itemType = item.media_type || (item.title ? 'movie' : 'tv') || item.type || 'movie';
    const fullItem = {...item, type: itemType, title: item.title || item.name };

    return (
        <div className="group flex-shrink-0 w-36 sm:w-48 md:w-56 relative">
            <div className="movie-card w-full aspect-[2/3] themed-bg rounded-lg overflow-hidden relative">
                <img src={`${IMAGE_BASE_URL}w500${item.poster_path}`} alt={fullItem.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex flex-col items-center justify-center p-2 text-center z-20">
                <h3 className="font-bold text-sm mb-3">{fullItem.title}</h3>
                <button onClick={() => onPlayTrailer(fullItem)} className="w-full bg-white text-black text-sm font-semibold py-2 rounded mb-2 transition hover:scale-105">▶ Play Trailer</button>
                <button onClick={() => onShowDetails(fullItem.id, fullItem.type)} className="w-full bg-gray-700/80 text-sm font-semibold py-2 rounded transition hover:scale-105">ℹ More Info</button>
            </div>
        </div>
    );
}

function DetailsModal({ details, onClose, onToggleMyList, myList }) {
    if (!details) return null;

    if (details === 'loading') {
        return (
            <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
                <div className="fixed inset-0 bg-black/80"></div>
                <div className="relative w-full max-w-4xl mx-auto my-8"><div className="modal-content bg-midnight-bg rounded-lg shadow-xl overflow-hidden p-8 text-center shimmer h-96"></div></div>
            </div>
        );
    }

    const type = details.title ? 'movie' : 'tv';
    const trailer = details.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
    const isInList = myList.some(i => i.id === details.id);
    const itemForMyList = {id: details.id, type, poster_path: details.poster_path, title: details.title || details.name};

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/80" onClick={onClose}></div>
            <div className="relative w-full max-w-4xl mx-auto my-8">
                <div className="modal-content bg-midnight-bg rounded-lg shadow-xl overflow-hidden">
                    <div className="relative"><div className="bg-black h-48 sm:h-64 md:h-80">
                        <img src={`${IMAGE_BASE_URL}w1280${details.backdrop_path}`} className="w-full h-full object-cover object-top opacity-50"/></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-midnight-bg via-midnight-bg/80 to-transparent"></div>
                        <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center text-2xl leading-none z-10" aria-label="Close modal">&times;</button>
                        <div className="absolute bottom-0 left-0 p-4 md:p-8"><h2 className="text-2xl md:text-4xl font-bold hero-text-shadow">{details.title || details.name}</h2></div>
                    </div>
                    <div className="p-4 md:p-8">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 my-3 text-sm">
                            <span>({(details.release_date || details.first_air_date || 'N/A').substring(0,4)})</span>
                            <span>{details.runtime || (details.episode_run_time?.[0]) || "N/A"} min</span>
                            <span className="flex items-center"><svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg> {details.vote_average?.toFixed(1) || 'N/A'}</span>
                        </div>
                        <button onClick={() => onToggleMyList(itemForMyList)} className="bg-gray-700/80 font-semibold py-2 px-4 rounded w-full my-4 hover:bg-gray-600/70 transition">
                            {isInList ? '✓ Added to My List' : '+ Add to My List'}
                        </button>
                        <p className="text-sm md:text-base">{details.overview}</p>
                        {details.credits?.cast?.length > 0 && <div className="mt-6"><h3 className="text-xl font-bold mb-4">Cast</h3><div className="grid grid-cols-3 sm:grid-cols-6 gap-4">{details.credits.cast.slice(0, 6).map(person => person.profile_path && <div key={person.id} className="text-center"><img src={`${IMAGE_BASE_URL}w185${person.profile_path}`} className="rounded-full w-20 h-20 object-cover mx-auto" loading="lazy" alt={person.name}/><p className="text-sm mt-2">{person.name}</p></div>)}</div></div>}
                        {trailer && <div className="mt-6"><h3 className="text-xl font-bold mb-2">Trailer</h3><div className="video-container rounded-lg"><iframe src={`https://www.youtube.com/embed/${trailer.key}`} title="Trailer" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div></div>}
                    </div>
                </div>
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

function SearchOverlay({ isOpen, onClose, onSearch, results, onItemClick, onTrailerClick }) {
    if(!isOpen) return null;
    return (
         <div className="fixed inset-0 z-[60] bg-black/80 search-overlay">
             <div className="container mx-auto px-4 pt-24">
                 <button onClick={onClose} className="absolute top-8 right-8 text-4xl">&times;</button>
                 <input type="text" onChange={(e) => onSearch(e.target.value)} className="w-full bg-transparent border-b-2 border-electric-blue text-2xl md:text-5xl focus:outline-none" placeholder="Search movies, TV shows..." autoFocus />
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
                    {results.map(item => <ItemCard key={item.id} item={item} onShowDetails={onItemClick} onPlayTrailer={onTrailerClick}/>)}
                 </div>
             </div>
         </div>
    );
}

function MobileMenu({ isOpen, onNavClick, currentView }) {
    return (
        <div className={`fixed top-0 left-0 h-full w-64 z-40 transform md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
            {[{v:'home', i:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', t:'Home'}, {v:'tv', i:'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', t:'TV'}, {v:'movies', i:'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', t:'Movies'}, {v:'mylist', i:'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', t:'My List'}].map(({v,i,t}) =>
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
        privacy: { title: 'Privacy Policy', text: 'All user data like "My List" is stored locally in your browser and is not sent to any server.' },
        about: { title: 'About Us', text: 'This is a demonstration project using the TMDB API to showcase modern web technologies.' },
        contact: { title: 'Contact Us', text: 'For inquiries, please reach out to example@email.com.' }
    };
    const { title, text } = content[view] || {};
    return (
        <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-4xl mx-auto min-h-screen">
            <h1 className="text-3xl font-bold mb-6">{title}</h1>
            <p className="themed-text">{text}</p>
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

    const clearList = (key, setter) => {
        localStorage.removeItem(key);
        setter([]);
    };
    
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
