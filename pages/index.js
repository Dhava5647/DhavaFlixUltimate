import Head from 'next/head';
import { useState, useEffect, useCallback, useRef } from 'react';

// This single component contains the entire application logic.
export default function DhavaFlixApp() {
    // --- STATE MANAGEMENT ---
    // Data states
    const [myList, setMyList] = useState([]);
    const [continueWatching, setContinueWatching] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [heroItem, setHeroItem] = useState(null);
    const [contentData, setContentData] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [modalDetails, setModalDetails] = useState(null);
    
    // UI States
    const [currentView, setCurrentView] = useState('home');
    const [isLoading, setIsLoading] = useState(true);
    const [videoKey, setVideoKey] = useState(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
    const [theme, setTheme] = useState('dark');

    // --- CONFIG ---
    const apiKey = "0627e9682f6c3eca80da4e2a6217ce57";
    const apiBaseUrl = "https://api.themoviedb.org/3";
    const imageBaseUrl = "https://image.tmdb.org/t/p/";

    // --- LOCAL STORAGE & THEME INITIALIZATION ---
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
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error(`Failed to fetch ${path}:`, err);
            return null;
        }
    }, []);

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };
    
    // --- PAGE VIEW RENDERERS ---
    const renderHomePage = useCallback(async () => {
        setIsLoading(true);
        const categories = [
            { title: "Trending This Week", endpoint: "trending/all/week" },
            { title: "Popular in India", endpoint: "discover/movie", params: "&region=IN&sort_by=popularity.desc&with_original_language=hi|te|ta" },
            { title: "Top Rated Movies", endpoint: "movie/top_rated" }
        ];
        const heroData = await fetchApi('trending/all/week');
        if (heroData?.results.length > 0) {
            setHeroItem(heroData.results[Math.floor(Math.random() * Math.min(10, heroData.results.length))]);
        }
        const results = await Promise.all(categories.map(cat => fetchApi(cat.endpoint, cat.params)));
        const rows = results.map((data, i) => ({ title: categories[i].title, items: data?.results || [], endpoint: categories[i].endpoint })).filter(row => row.items.length > 0);
        if (continueWatching.length > 0) {
            rows.unshift({ title: "Continue Watching", items: continueWatching, endpoint: '' });
        }
        setContentData(rows);
        setIsLoading(false);
    }, [fetchApi, continueWatching]);

    const renderCategoryPage = useCallback(async (type) => {
        setIsLoading(true);
        const staticCategories = type === 'movie' 
            ? [{ title: "Now Playing", endpoint: `movie/now_playing`, params: "&region=IN" }, { title: "Top Rated", endpoint: "movie/top_rated" }] 
            : [{ title: "Popular TV Shows", endpoint: `tv/popular` }, { title: "Top Rated", endpoint: "tv/top_rated" }];
        
        const heroData = await fetchApi(`${type}/popular`);
        if (heroData?.results.length > 0) setHeroItem(heroData.results[Math.floor(Math.random() * 10)]);

        const genreData = await fetchApi(`genre/${type}/list`);
        const genreCategories = genreData?.genres.slice(0, 6).map(genre => ({ title: genre.name, endpoint: `discover/${type}`, params: `&with_genres=${genre.id}` })) || [];
        
        const allCategories = [...staticCategories, ...genreCategories];
        const results = await Promise.all(allCategories.map(cat => fetchApi(cat.endpoint, cat.params)));
        const rows = results.map((data, i) => ({ title: allCategories[i].title, items: data?.results || [], endpoint: allCategories[i].endpoint })).filter(row => row.items.length > 0);
        
        setContentData(rows);
        setIsLoading(false);
    }, [fetchApi]);
    
    const renderComingSoon = useCallback(async () => {
        setIsLoading(true);
        const data = await fetchApi('movie/upcoming', '&region=IN');
        setContentData([{ title: 'Coming Soon', items: data?.results || [], endpoint: 'movie/upcoming' }]);
        setIsLoading(false);
    }, [fetchApi]);

    // --- MAIN NAVIGATION LOGIC ---
    const updateView = useCallback((view) => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
        setHeroItem(null);
        setContentData([]);
        window.scrollTo(0, 0);

        switch (view) {
            case 'tv': renderCategoryPage('tv'); break;
            case 'movies': renderCategoryPage('movie'); break;
            case 'comingsoon': renderComingSoon(); break;
            case 'home':
            default: renderHomePage();
        }
    }, [renderCategoryPage, renderComingSoon, renderHomePage]);

    useEffect(() => {
        updateView('home'); // Initial load
    }, [updateView]);

    // --- EVENT HANDLERS ---
    const handleShowDetails = useCallback(async (id, type) => {
        setModalDetails('loading');
        const details = await fetchApi(`${type}/${id}`, '&append_to_response=videos,credits');
        setModalDetails(details);
    }, [fetchApi]);

    const handlePlayTrailer = useCallback(async (id, type) => {
        const item = { id, type };
        const updatedContinueWatching = [item, ...continueWatching.filter(i => i.id !== id)].slice(0, 20);
        setContinueWatching(updatedContinueWatching);
        saveToLocalStorage('dhavaflixContinueWatching', updatedContinueWatching);

        const data = await fetchApi(`${type}/${id}/videos`);
        const trailer = data?.results.find(v => v.type === "Trailer" && v.site === "YouTube");
        if (trailer) setVideoKey(trailer.key);
        else alert("Trailer not available.");
    }, [fetchApi, continueWatching]);
    
    const handleToggleMyList = (item, type) => {
        let updatedList = [...myList];
        const itemIdentifier = { id: item.id, type, poster_path: item.poster_path, title: item.title || item.name };
        const index = updatedList.findIndex(i => i.id === item.id);
        if (index > -1) updatedList.splice(index, 1);
        else updatedList.unshift(itemIdentifier);
        setMyList(updatedList);
        saveToLocalStorage('dhavaflixMyList', updatedList);
    };

    const handleToggleReminder = (item) => {
        let updatedReminders = [...reminders];
        const index = updatedReminders.findIndex(r => r.id === item.id);
        if (index > -1) updatedReminders.splice(index, 1);
        else updatedReminders.unshift({ id: item.id, title: item.title });
        setReminders(updatedReminders);
        saveToLocalStorage('dhavaflixReminders', updatedReminders);
    }
    
    const handleSearch = useCallback(debounce(async (query) => {
        if (query) {
            const data = await fetchApi(`search/multi`, `&query=${encodeURIComponent(query)}`);
            setSearchResults(data?.results.filter(item => item.poster_path && item.media_type !== 'person') || []);
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
    
    const MainContent = () => {
        const isListPage = ['mylist', 'profile', 'comingsoon', 'privacy', 'about', 'contact'].includes(currentView);
        
        if (isListPage) {
             let title = '', items = [];
             if (currentView === 'mylist') { title = 'My List'; items = myList; }
             if (currentView === 'comingsoon') { title = 'Coming Soon'; items = contentData[0]?.items || []; }
             
             if (currentView === 'profile') return <ProfilePage />;
             if (['privacy', 'about', 'contact'].includes(currentView)) return <PlaceholderPage view={currentView} />;
             
             return (
                 <div className="px-4 sm:px-6 lg:px-8 pt-8">
                     <h1 className="text-2xl md:text-4xl font-bold mb-6">{title}</h1>
                     <div className={`grid ${currentView === 'comingsoon' ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-x-4 gap-y-8' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4'}`}>
                         {items.length > 0 ? items.map(item => <ItemCard key={item.id} item={item} type="movie" />) : <p className="col-span-full">Your list is empty.</p>}
                     </div>
                 </div>
             )
        }
        
        return (
            <>
                {heroItem && <HeroSection item={heroItem} />}
                <div className="py-8 md:py-12 space-y-8 md:space-y-12">
                     {isLoading ? <SkeletonLoader /> : contentData.map(row => <ContentRow key={row.title} row={row} />)}
                </div>
            </>
        )
    };
    
    const PlaceholderPage = ({ view }) => {
        const content = {
            privacy: { title: 'Privacy Policy', text: 'All user data like "My List" is stored locally in your browser and is not sent to any server.' },
            about: { title: 'About Us', text: 'This is a demonstration project using the TMDB API to showcase modern web technologies.' },
            contact: { title: 'Contact Us', text: 'For inquiries, please reach out to example@email.com.' }
        };
        const { title, text } = content[view];
        return (
            <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">{title}</h1>
                <p className="themed-text">{text}</p>
            </div>
        );
    };
    
    const ProfilePage = () => (
        <div className="px-4 sm:px-6 lg:px-8 pt-8">
            <h1 className="text-3xl font-bold mb-6">Profile & Settings</h1>
            <div className="mb-10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">Continue Watching</h2>
                    <button onClick={() => { setContinueWatching([]); saveToLocalStorage('dhavaflixContinueWatching', []) }} className="text-sm hover:text-electric-blue">Clear History</button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {continueWatching.length > 0 ? continueWatching.map(item => <ItemCard key={item.id} item={item} type={item.type}/>) : <p className="col-span-full themed-text">No viewing history.</p>}
                </div>
            </div>
             <div className="mb-10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">My List</h2>
                    <button onClick={() => { setMyList([]); saveToLocalStorage('dhavaflixMyList', []) }} className="text-sm hover:text-electric-blue">Clear List</button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {myList.length > 0 ? myList.map(item => <ItemCard key={item.id} item={item} type={item.type}/>) : <p className="col-span-full themed-text">Your list is empty.</p>}
                </div>
            </div>
            <div className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">Reminders</h2>
                <ul className="space-y-3 max-w-md">
                    {reminders.length > 0 ? reminders.map(r => <li key={r.id} className="reminder-item themed-bg p-3 rounded-lg">{r.title}</li>) : <p className="themed-text">No reminders set.</p>}
                </ul>
            </div>
        </div>
    );
    
    // --- UI COMPONENTS ---
    const Header = () => (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isHeaderScrolled ? 'header-scrolled' : ''}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center space-x-8">
                        <a onClick={() => updateView('home')} className="cursor-pointer">
                           <svg width="150" height="38" viewBox="0 0 150 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <defs><linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--electric-blue-light)"/><stop offset="100%" stopColor="var(--electric-blue)"/></linearGradient></defs>
                                  <text x="0" y="29" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="800" fill="url(#logo-gradient)">DHAVA</text><text id="logo-text" x="95" y="29" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="800" fill="var(--text-primary-dark)">FLIX</text>
                               </svg>
                        </a>
                        <nav className="hidden md:flex space-x-6 text-sm font-medium">
                            {['home', 'tv', 'movies', 'comingsoon', 'mylist'].map(view => 
                                <a key={view} onClick={() => updateView(view)} className={`nav-link themed-text transition-transform duration-300 hover:scale-105 cursor-pointer ${currentView === view ? 'active' : ''}`}>{view.charAt(0).toUpperCase() + view.slice(1).replace('comingsoon', 'Coming Soon').replace('mylist', 'My List')}</a>
                            )}
                        </nav>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button onClick={toggleTheme} className="themed-text p-2 rounded-full hover:bg-gray-700">{theme === 'light' ? '☀️' : '🌙'}</button>
                        <button onClick={() => setIsSearchOpen(true)} className="themed-text"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
                        <a onClick={() => updateView('profile')} className="hidden md:block cursor-pointer"><img src="https://placehold.co/40x40/0072F5/FFFFFF?text=D" alt="Profile" className="w-8 h-8 rounded-md"/></a>
                        <div className="md:hidden"><button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="themed-text"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg></button></div>
                    </div>
                </div>
            </div>
        </header>
    );

    const MobileMenu = () => (
        <div id="mobile-menu" className={`fixed top-0 left-0 h-full w-64 z-40 transform md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <nav className="mt-24 flex flex-col space-y-6 px-6">
                {['home', 'tv', 'movies', 'comingsoon', 'mylist', 'profile'].map(view =>
                    <a key={view} onClick={() => updateView(view)} className={`nav-link themed-text text-lg cursor-pointer ${currentView === view ? 'active' : ''} ${view === 'profile' ? 'mt-4 border-t border-gray-700 pt-4' : ''}`}>{view.charAt(0).toUpperCase() + view.slice(1).replace('comingsoon', 'Coming Soon').replace('mylist', 'My List')}</a>
                )}
            </nav>
        </div>
    );
    
    const BottomNav = () => (
         <div className="fixed bottom-0 left-0 right-0 themed-bg bottom-nav flex justify-around py-2 md:hidden z-50 border-t border-gray-700/50">
            {[{v:'home', i:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'}, {v:'tv', i:'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'}, {v:'movies', i:'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'}, {v:'mylist', i:'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'}].map(item =>
                <button key={item.v} onClick={() => updateView(item.v)} className={`flex flex-col items-center text-xs themed-text ${currentView === item.v ? 'active' : ''}`}>
                    <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.i} /></svg>
                    <span>{item.v.charAt(0).toUpperCase() + item.v.slice(1).replace('mylist', 'My List')}</span>
                </button>
            )}
        </div>
    );
    
    const Footer = () => (
         <footer className="themed-bg themed-text text-center py-6 mt-8 border-t border-gray-700/50 text-sm opacity-80">
            <p>© 2025 DhavaFlix. All Rights Reserved.</p>
            <div className="flex justify-center space-x-4 mt-2">
                <a onClick={() => updateView('privacy')} className="hover:underline cursor-pointer">Privacy Policy</a><span>•</span>
                <a onClick={() => updateView('about')} className="hover:underline cursor-pointer">About Us</a><span>•</span>
                <a onClick={() => updateView('contact')} className="hover:underline cursor-pointer">Contact</a>
            </div>
        </footer>
    );

    const HeroSection = ({ item }) => (
        <section className="relative min-h-[50vh] md:min-h-[calc(85vh-5rem)] flex items-center justify-center">
            <div className="absolute inset-0">
                <img src={`${imageBaseUrl}w1280${item.backdrop_path}`} className="w-full h-full object-cover object-top" alt={item.title || item.name} />
                <div className="absolute inset-0 hero-gradient"></div>
            </div>
            <div className="relative z-10 flex flex-col justify-end h-full w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-10 md:pb-0 md:justify-center">
                <div className="max-w-xl">
                    <h2 className="text-3xl md:text-6xl font-bold hero-text-shadow">{item.title || item.name}</h2>
                    <p className="mt-4 text-sm md:text-lg max-w-lg hero-text-shadow line-clamp-2 md:line-clamp-3">{item.overview}</p>
                    <div className="mt-6 flex space-x-4">
                        <button onClick={() => handlePlayTrailer(item.id, item.media_type || (item.title ? 'movie' : 'tv'))} className="bg-white text-black font-semibold py-2 px-5 rounded flex items-center hover:bg-gray-200 transition duration-300 hover:scale-105">Play Trailer</button>
                        <button onClick={() => handleShowDetails(item.id, item.media_type || (item.title ? 'movie' : 'tv'))} className="bg-gray-700/80 font-semibold py-2 px-5 rounded flex items-center hover:bg-gray-600/70 transition duration-300 hover:scale-105">More Info</button>
                    </div>
                </div>
            </div>
        </section>
    );

    const ContentRow = ({ row }) => {
        const rowRef = useRef(null);
        const scroll = (amount) => {
            if (rowRef.current) rowRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        };
        return (
            <div className="carousel-category">
                <h2 className="text-lg sm:text-2xl font-bold mb-3 md:mb-4 px-4 sm:px-6 lg:px-8">{row.title}</h2>
                <div className="carousel-container relative">
                    <div ref={rowRef} className="carousel-wrapper flex overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-6 lg:px-8 space-x-4">
                        {row.items.map(item => <ItemCard key={item.id} item={item} type={row.endpoint.includes('movie') ? 'movie' : 'tv'} />)}
                    </div>
                    <button onClick={() => scroll(-rowRef.current.clientWidth)} className="carousel-arrow left-2 absolute top-0 bottom-0 px-4 bg-black/50 hidden md:flex items-center z-20 rounded-l-lg">&#9664;</button>
                    <button onClick={() => scroll(rowRef.current.clientWidth)} className="carousel-arrow right-2 absolute top-0 bottom-0 px-4 bg-black/50 hidden md:flex items-center z-20 rounded-r-lg">&#9654;</button>
                </div>
            </div>
        );
    };

    const ItemCard = ({ item, type }) => {
        const itemType = type || item.type || (item.title ? 'movie' : 'tv');
        
        if (currentView === 'comingsoon') {
            const isInReminders = reminders.some(r => r.id === item.id);
            return (
                <div className="group">
                    <div onClick={() => handleShowDetails(item.id, itemType)} className="movie-card w-full aspect-[2/3] themed-bg rounded-lg overflow-hidden relative cursor-pointer">
                        <img src={`${imageBaseUrl}w500${item.poster_path}`} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <p className="font-semibold truncate text-sm">{item.title}</p>
                        <button onClick={() => handleToggleReminder(item)} className={`reminder-bell p-1 ${isInReminders ? 'active' : ''}`}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15h14a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path></svg>
                        </button>
                    </div>
                    <p className="text-xs">{new Date(item.release_date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })}</p>
                </div>
            );
        }

        return (
            <div className="group flex-shrink-0 w-36 sm:w-48 md:w-56 relative">
                <div className="movie-card w-full aspect-[2/3] themed-bg rounded-lg overflow-hidden relative">
                    <img src={`${imageBaseUrl}w500${item.poster_path}`} alt={item.title || item.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex flex-col items-center justify-center p-2 text-center z-20">
                    <h3 className="font-bold text-sm mb-3">{item.title || item.name}</h3>
                    <button onClick={() => handlePlayTrailer(item.id, itemType)} className="w-full bg-white text-black text-sm font-semibold py-2 rounded mb-2 transition hover:scale-105">▶ Play Trailer</button>
                    <button onClick={() => handleShowDetails(item.id, itemType)} className="w-full bg-gray-700/80 text-sm font-semibold py-2 rounded transition hover:scale-105">ℹ More Info</button>
                </div>
            </div>
        );
    };

    const SkeletonLoader = () => (
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

    const SearchOverlay = () => (
        isSearchOpen && (
             <div className="fixed inset-0 z-[60] bg-black/80 search-overlay">
                 <div className="container mx-auto px-4 pt-24">
                     <button onClick={() => setIsSearchOpen(false)} className="absolute top-8 right-8 text-4xl">&times;</button>
                     <input type="text" onChange={(e) => handleSearch(e.target.value)} className="w-full bg-transparent border-b-2 border-electric-blue text-2xl md:text-5xl focus:outline-none" placeholder="Search movies, TV shows..." autoFocus />
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
                        {searchResults.map(item => <ItemCard key={item.id} item={item} />)}
                     </div>
                 </div>
             </div>
        )
    );
    
    const DetailsModal = () => {
        if (!modalDetails) return null;
        const details = modalDetails;
        const type = details.title ? 'movie' : 'tv';
        const trailer = details.videos?.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
        const isInList = myList.some(i => i.id === details.id);
        
        return (
            <div className="fixed inset-0 z-[100] overflow-y-auto">
                <div className="fixed inset-0 bg-black/80" onClick={() => setModalDetails(null)}></div>
                <div className="relative w-full max-w-4xl mx-auto my-8">
                    <div className="modal-content bg-midnight-bg rounded-lg shadow-xl overflow-hidden">
                        {modalDetails === 'loading' ? <div className="p-8 text-center shimmer h-96 rounded-lg"></div> : (
                            <>
                                <div className="relative">
                                    <div className="bg-black h-48 sm:h-64 md:h-80">
                                        <img src={`${imageBaseUrl}w1280${details.backdrop_path}`} className="w-full h-full object-cover object-top opacity-50"/>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-midnight-bg via-midnight-bg/80 to-transparent"></div>
                                    <button onClick={() => setModalDetails(null)} className="absolute top-4 right-4 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center text-2xl leading-none z-10">&times;</button>
                                    <div className="absolute bottom-0 left-0 p-4 md:p-8">
                                        <h2 className="text-2xl md:text-4xl font-bold hero-text-shadow">{details.title || details.name}</h2>
                                    </div>
                                </div>
                                <div className="p-4 md:p-8">
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 my-3 text-sm">
                                        <span>({(details.release_date || details.first_air_date || 'N/A').substring(0,4)})</span>
                                        <span>{details.runtime || (details.episode_run_time?.[0]) || "N/A"} min</span>
                                        <span className="flex items-center"><svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg> {details.vote_average?.toFixed(1) || 'N/A'}</span>
                                    </div>
                                    <button onClick={() => handleToggleMyList(details, type)} className="bg-gray-700/80 font-semibold py-2 px-4 rounded w-full my-4 hover:bg-gray-600/70 transition">
                                        {isInList ? '✓ Added to My List' : '+ Add to My List'}
                                    </button>
                                    <p className="text-sm md:text-base">{details.overview}</p>
                                    {details.credits?.cast.length > 0 && <div className="mt-6"><h3 className="text-xl font-bold mb-4">Cast</h3><div className="grid grid-cols-3 sm:grid-cols-6 gap-4">{details.credits.cast.slice(0, 6).map(person => person.profile_path && <div key={person.id} className="text-center"><img src={`${imageBaseUrl}w185${person.profile_path}`} className="rounded-full w-20 h-20 object-cover mx-auto" loading="lazy"/><p className="text-sm mt-2">{person.name}</p></div>)}</div></div>}
                                    {trailer && <div className="mt-6"><h3 className="text-xl font-bold mb-2">Trailer</h3><div className="video-container rounded-lg"><iframe src={`https://www.youtube.com/embed/${trailer.key}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div></div>}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )
    };
    
    const VideoModal = () => (
        videoKey && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80">
                <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${videoKey}?autoplay=1`} frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen></iframe>
                    <button onClick={() => setVideoKey(null)} className="absolute top-2 right-2 text-3xl">&times;</button>
                </div>
            </div>
        )
    );
    
    // --- MAIN RENDER ---
    return (
        <>
            <Head>
                <title>DhavaFlix – Watch Movies & Webseries</title>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </Head>

            <Header />
            <MobileMenu />

            <main className="pt-20">
                <MainContent />
            </main>
            
            <Footer />
            <BottomNav />

            <SearchOverlay />
            <DetailsModal />
            <VideoModal />
        </>
    );
}
