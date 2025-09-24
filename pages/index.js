import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, query, doc } from 'firebase/firestore';

// --- Constants ---
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/";
const SITE_URL = "https://dhavaflix.vercel.app";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// --- Main App Component ---
export default function DhavaFlixApp() {
    const [user, setUser] = useState(null);
    const [myList, setMyList] = useState([]);
    const [continueWatching, setContinueWatching] = useState([]);
    const [heroItem, setHeroItem] = useState(null);
    const [contentData, setContentData] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [streamingItem, setStreamingItem] = useState(null);
    const [currentView, setCurrentView] = useState('home');
    const [isLoading, setIsLoading] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
    const [theme, setTheme] = useState('dark');

    // --- Effects ---
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                signInAnonymously(auth).catch(error => console.error("Anonymous sign-in failed:", error));
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !db) return;
        const myListRef = collection(db, `users/${user.uid}/myList`);
        const q = query(myListRef);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id }));
            setMyList(list);
        });
        return () => unsubscribe();
    }, [user]);
    
    useEffect(() => {
        try {
            setContinueWatching(JSON.parse(localStorage.getItem('dhavaflixContinueWatching')) || []);
            const savedTheme = localStorage.getItem('theme') || 'dark';
            setTheme(savedTheme);
            document.documentElement.className = savedTheme;
        } catch (error) { console.error("Error initializing from localStorage", error); }
    }, []);

    const saveToLocalStorage = (key, data) => {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch (error) { console.error("Error saving to localStorage", error); }
    };

    const fetchApi = useCallback(async (path, params = "") => {
        const url = `/api/tmdb?path=${encodeURIComponent(path)}&${new URLSearchParams(params.replace(/^&/, ''))}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`API proxy error: ${res.status}`);
            return await res.json();
        } catch (err) { return null; }
    }, []);
    
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

    const updateView = useCallback((view) => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
        setHeroItem(null);
        setContentData([]);
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const viewConfigs = {
            home: { heroEndpoint: 'trending/all/week', categories: [{ title: "Trending This Week", endpoint: "trending/all/week" }, { title: "Popular in India", endpoint: "discover/movie", params: "&region=IN&sort_by=popularity.desc" }, { title: "Popular TV Shows", endpoint: "tv/popular", params: "&region=IN" }, { title: "Top Rated Movies", endpoint: "movie/top_rated" }], showContinueWatching: true },
            movies: { heroEndpoint: 'movie/popular', categories: [{ title: "Now Playing", endpoint: "movie/now_playing", params: "&region=IN" }, { title: "Action", endpoint: "discover/movie", params: "&with_genres=28" }, { title: "Comedy", endpoint: "discover/movie", params: "&with_genres=35" }, { title: "Horror", endpoint: "discover/movie", params: "&with_genres=27" }, { title: "Top Rated", endpoint: "movie/top_rated" }] },
            tv: { heroEndpoint: 'tv/popular', categories: [{ title: "Airing Today", endpoint: "tv/airing_today" }, { title: "Animation", endpoint: "discover/tv", params: "&with_genres=16" }, { title: "Crime", endpoint: "discover/tv", params: "&with_genres=80" }, { title: "Sci-Fi & Fantasy", endpoint: "discover/tv", params: "&with_genres=10765" }, { title: "Top Rated", endpoint: "tv/top_rated" }] }
        };
        if (viewConfigs[currentView]) fetchAndSetContent(viewConfigs[currentView]);
        else setIsLoading(false);
    }, [currentView, fetchAndSetContent]);
    
    const handlePlayNow = useCallback((item) => {
        setContinueWatching(currentCw => {
            const newCw = [item, ...currentCw.filter(i => i.id !== item.id)].slice(0, 20);
            saveToLocalStorage('dhavaflixContinueWatching', newCw);
            return newCw;
        });
        setStreamingItem(item);
    }, []);

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
            document.documentElement.className = newTheme;
            return newTheme;
        });
    };
    
    useEffect(() => {
        const handleScroll = () => setIsHeaderScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <Head>
                {/* --- SEO & METADATA --- */}
                <title>DhavaFlix | Stream HD Movies & TV Shows Online Free in India</title>
                <meta name="description" content="Explore a vast collection of movies and TV shows on DhavaFlix. Stream the latest releases, popular series, and timeless classics in HD for free. Your ultimate entertainment destination in India." />
                <link rel="canonical" href={SITE_URL} />
                
                <meta property="og:site_name" content="DhavaFlix" />
                <meta property="og:title" content="DhavaFlix | Stream HD Movies & TV Shows Online Free" />
                <meta property="og:description" content="Discover and stream a huge library of movies and webseries in high definition, completely free. No subscription required." />
                <meta property="og:url" content={SITE_URL} />
                <meta property="og:type" content="website" />
                <meta property="og:image" content={`${SITE_URL}/og-image.png`} /> 

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="DhavaFlix | Stream HD Movies & TV Shows Online Free" />
                <meta name="twitter:description" content="Browse popular movies and trending shows. Watch free online in HD." />
                <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
                
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
                
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
                    {
                      "@context": "https://schema.org",
                      "@type": "WebSite",
                      "name": "DhavaFlix",
                      "url": "${SITE_URL}",
                      "potentialAction": {
                        "@type": "SearchAction",
                        "target": "${SITE_URL}/search?q={search_term_string}",
                        "query-input": "required name=search_term_string"
                      }
                    }
                `}} />
                 <style dangerouslySetInnerHTML={{ __html: `
                    :root {
                        --background-dark: #0c0c0f;
                        --surface-dark: #121217;
                        --text-primary-dark: #e5e7eb;
                        --text-secondary-dark: #9ca3af;
                        --electric-blue: #0072F5;
                        --electric-blue-light: #3694FF;
                    }
                    html.light {
                        --background-dark: #f0f2f5;
                        --surface-dark: #ffffff;
                        --text-primary-dark: #111827;
                        --text-secondary-dark: #4b5563;
                    }
                `}} />
            </Head>
            <div className="bg-[var(--background-dark)] text-[var(--text-primary-dark)] font-['Poppins',_sans-serif] min-h-screen">
                <Header isScrolled={isHeaderScrolled} onNavClick={updateView} currentView={currentView} onSearchClick={() => setIsSearchOpen(true)} onThemeToggle={toggleTheme} theme={theme} onMobileMenuClick={() => setIsMobileMenuOpen(o => !o)} />
                <MobileMenu isOpen={isMobileMenuOpen} onNavClick={updateView} currentView={currentView} />
                <main className="pt-20">
                    <MainContent currentView={currentView} isLoading={isLoading} heroItem={heroItem} contentData={contentData} myList={myList} onPlayNow={handlePlayNow} />
                </main>
                <Footer onNavClick={updateView} />
                <BottomNav onNavClick={updateView} currentView={currentView} />
                <AnimatePresence>
                    {isSearchOpen && <SearchOverlay onClose={() => setIsSearchOpen(false)} onSearch={debouncedSearch} results={searchResults} onPlayNow={handlePlayNow} />}
                    {streamingItem && <StreamingPlayer item={streamingItem} onClose={() => setStreamingItem(null)} />}
                </AnimatePresence>
            </div>
        </>
    );
}
// --- Sub-Components ---
function MainContent({ currentView, isLoading, heroItem, contentData, myList, onPlayNow }) {
    if (isLoading && !['mylist', 'profile'].includes(currentView)) {
        return <><div className="relative min-h-[50vh] md:min-h-[calc(85vh-5rem)] flex items-center justify-center bg-[var(--surface-dark)] shimmer"></div><div className="py-8 md:py-12 space-y-8 md:space-y-12"><SkeletonLoader /></div></>;
    }
    if (currentView === 'mylist') return <ListPage title="My List" items={myList} onPlayNow={onPlayNow} />;
    if (currentView === 'profile') return <ProfilePage />;
    return <><AnimatePresence>{heroItem && <HeroSection key={heroItem.id} item={heroItem} onPlayNow={onPlayNow}/>}</AnimatePresence><div className="py-8 md:py-12 space-y-8 md:space-y-12">{contentData.map(row => <ContentRow key={row.title} row={row} onPlayNow={onPlayNow}/>)}</div></>;
}
function ListPage({ title, items, onPlayNow }) {
    return (<div className="px-4 sm:px-6 lg:px-8 pt-8 min-h-screen"><h1 className="text-2xl md:text-4xl font-bold mb-6">{title}</h1><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">{items.length > 0 ? items.map(item => <ItemCard key={item.id} item={item} onPlayNow={onPlayNow} />) : <p className="col-span-full text-[var(--text-secondary-dark)] text-center py-10">🎬 This list is empty.</p>}</div></div>);
}
function Header({ isScrolled, onNavClick, currentView, onSearchClick, onThemeToggle, theme, onMobileMenuClick }) {
    return (<header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[var(--background-dark)]/80 backdrop-blur-sm shadow-lg' : 'bg-transparent'}`}><div className="container mx-auto px-4 sm:px-6 lg:px-8"><div className="flex items-center justify-between h-20"><div className="flex items-center space-x-8"><button onClick={() => onNavClick('home')} aria-label="DhavaFlix Home"><svg width="150" height="38" viewBox="0 0 150 38" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--electric-blue-light)"/><stop offset="100%" stopColor="var(--electric-blue)"/></linearGradient></defs><text x="0" y="29" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="800" fill="url(#logo-gradient)">DHAVA</text><text x="95" y="29" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="800" fill="var(--text-primary-dark)">FLIX</text></svg></button><nav className="hidden md:flex space-x-6 text-sm font-medium">{[{v:'home', t:'Home'}, {v:'tv', t:'TV Shows'}, {v:'movies', t:'Movies'}, {v:'mylist', t:'My List'}].map(({v, t}) => <button key={v} onClick={() => onNavClick(v)} className={`relative text-[var(--text-secondary-dark)] transition-colors duration-300 hover:text-[var(--text-primary-dark)] ${currentView === v ? 'text-[var(--text-primary-dark)] font-semibold' : ''}`}>{t}{currentView === v && <motion.div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-electric-blue" layoutId="underline"></motion.div>}</button>)}</nav></div><div className="flex items-center space-x-2 sm:space-x-4"><button onClick={onThemeToggle} className="p-2 rounded-full text-[var(--text-secondary-dark)] hover:bg-[var(--surface-dark)] transition-colors" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>{theme === 'light' ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.95a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zm.464-10.607a1 1 0 00-1.414 1.414l.707.707a1 1 0 101.414-1.414l-.707-.707zM3 11a1 1 0 100-2H2a1 1 0 100 2h1z" clipRule="evenodd" /></svg>}</button><button onClick={onSearchClick} className="p-2 rounded-full text-[var(--text-secondary-dark)] hover:bg-[var(--surface-dark)] transition-colors" aria-label="Search"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button><button onClick={() => onNavClick('profile')} className="hidden md:block" aria-label="Profile"><img src="https://placehold.co/40x40/0072F5/FFFFFF?text=D" alt="User Profile" className="w-8 h-8 rounded-md"/></button><div className="md:hidden"><button onClick={onMobileMenuClick} className="p-2 rounded-full text-[var(--text-secondary-dark)] hover:bg-[var(--surface-dark)] transition-colors" aria-label="Open Menu"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg></button></div></div></div></div></header>);
}
function HeroSection({ item, onPlayNow }) {
    const itemType = item.media_type || (item.title ? 'movie' : 'tv');
    const fullItem = {...item, type: itemType, title: item.title || item.name };
    const detailUrl = `/${itemType}/${item.id}`;
    const variants = {
        hidden: { opacity: 0, y: 20 },
        visible: i => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
    };
    return (<motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative min-h-[50vh] md:min-h-[calc(85vh-5rem)] flex items-end md:items-center pb-12 md:pb-0"><div className="absolute inset-0"><img src={`${IMAGE_BASE_URL}original${item.backdrop_path}`} className="w-full h-full object-cover object-top" alt={fullItem.title} /><div className="absolute inset-0 bg-gradient-to-t from-[var(--background-dark)] via-[var(--background-dark)]/70 to-transparent"></div></div><div className="relative z-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8"><div className="max-w-xl">
        <motion.h1 custom={0} initial="hidden" animate="visible" variants={variants} className="text-3xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400" style={{textShadow:'0 2px 10px rgba(0,0,0,0.5)'}}>{fullItem.title}</motion.h1>
        <motion.p custom={1} initial="hidden" animate="visible" variants={variants} className="mt-4 text-sm md:text-base max-w-lg text-[var(--text-secondary-dark)] line-clamp-2 md:line-clamp-3" style={{textShadow:'0 1px 4px rgba(0,0,0,0.5)'}}>{item.overview}</motion.p>
        <motion.div custom={2} initial="hidden" animate="visible" variants={variants} className="mt-6 flex space-x-4"><button onClick={() => onPlayNow(fullItem)} className="bg-white text-black font-semibold py-2.5 px-6 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-transform duration-300 hover:scale-105 shadow-lg"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6.3 5.18a1.6 1.6 0 012.5.17l8.2 9.6a1.5 1.5 0 01-1.2 2.5H8a1.5 1.5 0 01-1.5-1.5V6.3a1.2 1.2 0 01-.2-1.12z"/></svg><span>Play</span></button>
        <Link href={detailUrl} className="bg-gray-700/60 text-white font-semibold py-2.5 px-6 rounded-lg flex items-center space-x-2 hover:bg-gray-600/70 transition-transform duration-300 hover:scale-105 backdrop-blur-sm"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>More Info</span></Link>
        </motion.div></div></div></motion.section>);
}
function ContentRow({ row, onPlayNow }) {
    const rowRef = useRef(null);
    const scroll = (amount) => rowRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
    return (<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.5 }} className="group/row"><h2 className="text-lg sm:text-2xl font-bold mb-3 md:mb-4 px-4 sm:px-6 lg:px-8">{row.title}</h2><div className="relative"><div ref={rowRef} className="flex overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-6 lg:px-8 -mx-2">{row.items.map(item => item.poster_path && <ItemCard key={item.id} item={item} onPlayNow={onPlayNow}/>)}</div><button onClick={() => scroll(-rowRef.current.clientWidth + 100)} className="absolute left-0 top-0 bottom-4 w-16 bg-gradient-to-r from-[var(--background-dark)] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 hidden md:flex items-center justify-start z-20 pl-4 text-2xl" aria-label="Scroll Left"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg></button><button onClick={() => scroll(rowRef.current.clientWidth - 100)} className="absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-[var(--background-dark)] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 hidden md:flex items-center justify-end z-20 pr-4 text-2xl" aria-label="Scroll Right"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg></button></div></motion.div>);
}
function ItemCard({ item, onPlayNow }) {
    const itemType = item.media_type || (item.title ? 'movie' : 'tv') || item.type || 'movie';
    const fullItem = {...item, type: itemType, title: item.title || item.name };
    const detailUrl = `/${itemType}/${item.id}`;
    return (<motion.div whileHover="hover" initial="rest" animate="rest" className="group/card flex-shrink-0 w-36 sm:w-48 md:w-56 relative px-2"><div className="w-full aspect-[2/3] bg-[var(--surface-dark)] rounded-lg overflow-hidden relative shadow-lg transition-transform duration-300 group-hover/card:scale-105"><img src={`${IMAGE_BASE_URL}w500${item.poster_path}`} alt={fullItem.title} className="w-full h-full object-cover" loading="lazy" /></div><motion.div variants={{ rest:{opacity:0, y:"100%"}, hover:{opacity:1, y:0} }} transition={{ type:"tween", duration:0.3 }} className="absolute inset-0 bg-black/70 rounded-lg flex flex-col items-center justify-center p-2 text-center z-20"><h3 className="font-bold text-sm mb-3">{fullItem.title}</h3><button onClick={() => onPlayNow(fullItem)} className="w-full bg-white text-black text-sm font-semibold py-2 rounded mb-2 transition hover:scale-105">▶ Play</button><Link href={detailUrl} className="w-full bg-gray-700/80 text-sm font-semibold py-2 rounded transition hover:scale-105 block">ℹ More Info</Link></motion.div></motion.div>);
}
function StreamingPlayer({ item, onClose }) {
    const playerUrl = item.type === 'movie' ? `https://embed.vidsrc.pk/movie/${item.id}` : `https://embed.vidsrc.pk/tv/${item.id}`;
    useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = 'auto'; }; }, []);
    return (<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-4"><div className="w-full max-w-6xl"><div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-white">{item.title}</h3><button onClick={onClose} className="text-white text-4xl leading-none hover:text-electric-blue-light transition-colors">&times;</button></div><div className="aspect-video w-full"><iframe src={playerUrl} title={`Watch ${item.title}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full rounded-lg shadow-2xl bg-black"></iframe></div></div></motion.div>);
}
function SearchOverlay({ onClose, onSearch, results, onPlayNow }) {
    return (<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[60] bg-[var(--background-dark)]/90 backdrop-blur-md"><div className="container mx-auto px-4 pt-24"><button onClick={onClose} className="absolute top-8 right-8 text-4xl text-[var(--text-secondary-dark)] hover:text-white">&times;</button><input type="text" onChange={(e) => onSearch(e.target.value)} className="w-full bg-transparent border-b-2 border-electric-blue text-2xl md:text-5xl focus:outline-none" placeholder="Search movies, TV shows..." autoFocus /><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8 max-h-[70vh] overflow-y-auto scrollbar-hide">{results.map(item => <ItemCard key={item.id} item={item} onPlayNow={onPlayNow} />)}</div></div></motion.div>);
}
function MobileMenu({ isOpen, onNavClick, currentView }) {
    return (<div className={`fixed top-0 left-0 h-full w-64 bg-[var(--background-dark)]/90 backdrop-blur-md z-40 transform transition-transform md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}><nav className="mt-24 flex flex-col space-y-6 px-6">{[{v:'home', t:'Home'}, {v:'tv', t:'TV Shows'}, {v:'movies', t:'Movies'}, {v:'mylist', t:'My List'}, {v:'profile', t:'Profile'}].map(({v,t}) => <button key={v} onClick={() => onNavClick(v)} className={`text-lg text-left ${currentView === v ? 'text-electric-blue font-semibold' : 'text-[var(--text-secondary-dark)]'} ${v === 'profile' ? 'mt-4 border-t border-gray-700 pt-4' : ''}`}>{t}</button>)}</nav></div>);
}
function BottomNav({ onNavClick, currentView }) {
    return (<div className="fixed bottom-0 left-0 right-0 bg-[var(--background-dark)]/80 backdrop-blur-sm flex justify-around py-2 md:hidden z-50 border-t border-gray-700/50">{[{v:'home', t:'Home', i:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'}, {v:'tv', t:'TV', i:'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'}, {v:'movies', t:'Movies', i:'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'}, {v:'mylist', t:'My List', i:'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'}].map(({v,t,i}) => <button key={v} onClick={() => onNavClick(v)} className={`flex flex-col items-center text-xs transition-colors ${currentView === v ? 'text-electric-blue' : 'text-[var(--text-secondary-dark)]'}`}><svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={i} /></svg><span>{t}</span></button>)}</div>);
}
function Footer({ onNavClick }) {
    return (<footer className="bg-[var(--surface-dark)] text-[var(--text-secondary-dark)] py-10 sm:py-12 px-4 sm:px-6 lg:px-8 text-sm"><div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left"><div className="md:col-span-1"><svg width="150" height="38" viewBox="0 0 150 38" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto md:mx-0 mb-4"><defs><linearGradient id="logo-gradient-footer" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--electric-blue-light)"/><stop offset="100%" stopColor="var(--electric-blue)"/></linearGradient></defs><text x="0" y="29" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="800" fill="url(#logo-gradient-footer)">DHAVA</text><text x="95" y="29" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="800" fill="var(--text-primary-dark)">FLIX</text></svg><p>Your ultimate entertainment destination. Watch anywhere. Cancel anytime.</p></div><div className="space-y-3">
        <h4 className="font-bold text-[var(--text-primary-dark)]">Browse</h4>
        <button onClick={() => onNavClick('home')} className="block w-full hover:text-electric-blue transition-colors">Home</button>
        <button onClick={() => onNavClick('movies')} className="block w-full hover:text-electric-blue transition-colors">Movies</button>
        <button onClick={() => onNavClick('tv')} className="block w-full hover:text-electric-blue transition-colors">TV Shows</button>
      </div><div className="space-y-3">
        <h4 className="font-bold text-[var(--text-primary-dark)]">About</h4>
        <button onClick={() => onNavClick('privacy')} className="block w-full hover:text-electric-blue transition-colors">Privacy Policy</button>
        <button onClick={() => onNavClick('about')} className="block w-full hover:text-electric-blue transition-colors">About Us</button>
        <button onClick={() => onNavClick('contact')} className="block w-full hover:text-electric-blue transition-colors">Contact</button>
      </div><div className="space-y-3">
        <h4 className="font-bold text-[var(--text-primary-dark)]">Follow Us</h4><div className="flex justify-center md:justify-start space-x-4">
          <a href="#" aria-label="Twitter" className="hover:text-electric-blue transition-colors"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.77.35-1.6.58-2.46.67.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98-3.56-.18-6.73-1.89-8.84-4.48-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.22-1.95-.55v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"></path></svg></a>
          <a href="#" aria-label="Instagram" className="hover:text-electric-blue transition-colors"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.85s.012-3.584.07-4.85c.149-3.225 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163zm0 1.802C8.843 3.965 8.5 3.977 7.232 4.032c-2.711.124-3.921 1.33-4.045 4.045-.055 1.268-.067 1.603-.067 4.921s.012 3.653.067 4.921c.124 2.715 1.334 3.921 4.045 4.045 1.268.055 1.603.067 4.921.067s3.653-.012 4.921-.067c2.715-.124 3.921-1.33 4.045-4.045.055-1.268.067-1.603.067-4.921s-.012-3.653-.067-4.921c-.124-2.715-1.33-3.921-4.045-4.045-1.268-.055-1.603-.067-4.921-.067zm0 10.842a5.1 5.1 0 1 1 0-10.2 5.1 5.1 0 0 1 0 10.2zm0-8.397a3.297 3.297 0 1 0 0 6.594 3.297 3.297 0 0 0 0-6.594zm6.505-1.785a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"></path></svg></a>
        </div></div></div><div className="mt-8 pt-6 border-t border-gray-700/50 text-center"><p>© 2025 DhavaFlix. All Rights Reserved. For educational purposes only.</p></div></footer>);
}
function ProfilePage() {
    const [cw, setCw] = useState([]);
    useEffect(() => { setCw(JSON.parse(localStorage.getItem('dhavaflixContinueWatching')) || []); }, []);
    const clearList = (key, setter) => { localStorage.removeItem(key); setter([]); };
    return (<div className="px-4 sm:px-6 lg:px-8 pt-8 min-h-screen max-w-7xl mx-auto"><h1 className="text-3xl font-bold mb-6">Profile & Settings</h1><ProfileSection title="Continue Watching" items={cw} onClear={() => clearList('dhavaflixContinueWatching', setCw)} emptyText="No viewing history." /></div>);
}
function ProfileSection({ title, items, onClear, emptyText }) {
    return (<div className="mb-10"><div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-semibold">{title}</h2><button onClick={onClear} className="text-sm hover:text-electric-blue text-[var(--text-secondary-dark)]">Clear List</button></div><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">{items.length > 0 ? items.map(item => <img key={item.id} src={`${IMAGE_BASE_URL}w500${item.poster_path}`} alt={item.title} className="w-full aspect-[2/3] bg-[var(--surface-dark)] rounded-lg object-cover" />) : <p className="col-span-full text-[var(--text-secondary-dark)]">{emptyText}</p>}</div></div>);
}
function SkeletonLoader() {
    return (Array.from({ length: 4 }).map((_, i) => (<div key={i} className="px-4 sm:px-6 lg:px-8"><div className="h-8 w-1/3 bg-[var(--surface-dark)] shimmer rounded-lg mb-4"></div><div className="flex space-x-4 overflow-hidden">{Array.from({ length: 6 }).map((_, j) => (<div key={j} className="flex-shrink-0 w-36 sm:w-48 md:w-56"><div className="w-full aspect-[2/3] bg-[var(--surface-dark)] shimmer rounded-lg"></div></div>))}</div></div>)));
}

