// pages/index.js

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image'; // Using Next.js Image component for optimization

// --- Main Page Component ---
export default function Home() {
    // --- STATE MANAGEMENT (Replaces global variables) ---
    const [view, setView] = useState('home');
    const [heroItem, setHeroItem] = useState(null);
    const [contentRows, setContentRows] = useState([]);
    const [myList, setMyList] = useState([]);
    const [continueWatching, setContinueWatching] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // --- CONFIG (Keep your API keys here or move to .env.local) ---
    const apiKey = "0627e9682f6c3eca80da4e2a6217ce57"; // Your TMDB API Key
    const apiBaseUrl = "https://api.themoviedb.org/3";
    const imageBaseUrl = "https://image.tmdb.org/t/p/";

    // --- API & UTILITY HELPERS ---
    const fetchApi = async (path, params = "") => {
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
    };

    // --- DATA FETCHING & SIDE EFFECTS with useEffect ---

    // Effect for initializing state from localStorage on component mount
    useEffect(() => {
        setMyList(JSON.parse(localStorage.getItem('dhavaflixMyList')) || []);
        setContinueWatching(JSON.parse(localStorage.getItem('dhavaflixContinueWatching')) || []);
        setReminders(JSON.parse(localStorage.getItem('dhavaflixReminders')) || []);

        if (localStorage.getItem('theme') === 'light') {
            document.documentElement.classList.add('light');
        }
    }, []);

    // Effect for handling header scroll style
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 0);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll); // Cleanup
    }, []);

    // Effect for fetching data based on the current view
    useEffect(() => {
        const renderHomePage = async () => {
            const trendingData = await fetchApi('trending/all/week');
            if (trendingData?.results) {
                setHeroItem(trendingData.results[Math.floor(Math.random() * Math.min(10, trendingData.results.length))]);
            }

            const categories = [
                { title: "Trending This Week", endpoint: "trending/all/week" },
                { title: "Popular in India", endpoint: "discover/movie", params: "&region=IN&sort_by=popularity.desc&with_original_language=hi|te|ta" },
                { title: "Top Rated Movies", endpoint: "movie/top_rated" },
            ];

            const rows = await Promise.all(
                categories.map(async (cat) => {
                    const data = await fetchApi(cat.endpoint, cat.params);
                    return { title: cat.title, items: data?.results || [] };
                })
            );
            setContentRows(rows.filter(row => row.items.length > 0));
        };
        
        // ... add logic for other views like 'movies', 'tv' if needed
        
        window.scrollTo(0, 0);
        switch (view) {
            // Add other cases for 'tv', 'movies', etc.
            case 'home':
            default:
                renderHomePage();
                break;
        }
    }, [view]); // This effect re-runs whenever the 'view' state changes

    const handleNavClick = (newView) => {
        setView(newView);
        setIsMobileMenuOpen(false); // Close mobile menu on navigation
    };

    // --- RENDER LOGIC ---
    return (
        <>
            <Head>
                <title>DhavaFlix – Watch Movies & Webseries</title>
                <meta name="description" content="Stream and explore movies & webseries free. DhavaFlix looks like Netflix but is powered by the TMDB API." />
                <meta name="keywords" content="movies, webseries, streaming, netflix clone, tmdb, dhavaflix" />
                <meta name="robots" content="index, follow" />
                <meta property="og:title" content="DhavaFlix – Watch Movies & Webseries" />
                <meta property="og:description" content="A Netflix-style streaming site to explore the latest movies and TV shows, complete with trailers, ratings, and personalized lists." />
                <meta property="og:image" content="https://i.imgur.com/392o636.png" />
                <meta name="theme-color" content="#101010" />
            </Head>

            {/* HEADER */}
            <header id="main-header" className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'header-scrolled' : ''}`}>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center space-x-8">
                            <a href="#" onClick={() => handleNavClick('home')} aria-label="DhavaFlix Home" className="nav-link">
                                <svg width="150" height="38" viewBox="0 0 150 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs><linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--electric-blue-light)" /><stop offset="100%" stopColor="var(--electric-blue)" /></linearGradient></defs>
                                    <text x="0" y="29" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="800" fill="url(#logo-gradient)">DHAVA</text><text id="logo-text" x="95" y="29" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="800" fill="var(--text-primary-dark)">FLIX</text>
                                </svg>
                            </a>
                            <nav className="hidden md:flex space-x-6 text-sm font-medium">
                                <a href="#" onClick={() => handleNavClick('home')} className={`nav-link themed-text transition-transform duration-300 hover:scale-105 ${view === 'home' ? 'active' : ''}`}>Home</a>
                                {/* Add other nav links here */}
                            </nav>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* Theme Toggle, Search, Profile buttons would go here */}
                        </div>
                        <div className="md:hidden">
                            <button id="mobile-menu-button" className="themed-text" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            
            {/* MOBILE MENU */}
            <div id="mobile-menu" className={`fixed top-0 left-0 h-full w-64 z-40 transform md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                 <nav className="mt-24 flex flex-col space-y-6 px-6">
                    <a href="#" onClick={() => handleNavClick('home')} className={`nav-link themed-text text-lg ${view === 'home' ? 'active' : ''}`}>Home</a>
                    {/* Add other mobile nav links here */}
                 </nav>
            </div>


            <main id="main-content" className="pt-20">
                {/* HERO SECTION */}
                {view === 'home' && heroItem && (
                    <section id="hero-section" className="relative min-h-[50vh] md:min-h-[calc(85vh-5rem)] flex items-center justify-center">
                         <div className="absolute inset-0">
                            <Image
                                src={`${imageBaseUrl}w1280${heroItem.backdrop_path}`}
                                alt={heroItem.title || heroItem.name}
                                layout="fill"
                                objectFit="cover"
                                objectPosition="top"
                                priority // Load the hero image first
                            />
                            <div className="absolute inset-0 hero-gradient"></div>
                        </div>
                        <div className="relative z-10 flex flex-col justify-end h-full w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-10 md:pb-0 md:justify-center">
                            <div className="max-w-xl">
                                <h2 className="text-3xl md:text-6xl font-bold hero-text-shadow">{heroItem.title || heroItem.name}</h2>
                                <p className="mt-4 text-sm md:text-lg max-w-lg hero-text-shadow line-clamp-2 md:line-clamp-3">{heroItem.overview}</p>
                                <div className="mt-6 flex space-x-4">
                                    <button className="play-btn bg-white text-black font-semibold py-2 px-5 rounded flex items-center hover:bg-gray-200 transition duration-300 hover:scale-105">
                                        <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>Play Trailer
                                    </button>
                                    <button className="info-btn bg-gray-700/80 font-semibold py-2 px-5 rounded flex items-center hover:bg-gray-600/70 transition duration-300 hover:scale-105">More Info</button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* CONTENT ROWS */}
                <div id="content-rows-container" className="py-8 md:py-12 space-y-8 md:space-y-12">
                    {contentRows.map((row, index) => (
                        <div key={index} className="carousel-category">
                            <h2 className="text-lg sm:text-2xl font-bold mb-3 md:mb-4 px-4 sm:px-6 lg:px-8">{row.title}</h2>
                            <div className="carousel-container relative">
                                <div className="carousel-wrapper flex overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-6 lg:px-8 space-x-4">
                                    {row.items.map(item => item.poster_path && (
                                        <div key={item.id} className="group flex-shrink-0 w-36 sm:w-48 md:w-56 relative">
                                            <div className="movie-card w-full aspect-[2/3] themed-bg rounded-lg overflow-hidden relative">
                                                <Image
                                                    src={`${imageBaseUrl}w500${item.poster_path}`}
                                                    alt={item.title || item.name}
                                                    width={224}
                                                    height={336}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            {/* Add hover overlay here */}
                                        </div>
                                    ))}
                                </div>
                                {/* Add carousel arrows here */}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
            
            {/* FOOTER */}
            <footer className="themed-bg themed-text text-center py-6 mt-8 border-t border-gray-700/50 text-sm opacity-80">
                <p>© 2025 DhavaFlix. All Rights Reserved.</p>
                <div className="flex justify-center space-x-4 mt-2">
                    <a href="#" className="hover:underline">Privacy Policy</a><span>•</span>
                    <a href="#" className="hover:underline">About Us</a><span>•</span>
                    <a href="#" className="hover:underline">Contact</a>
                </div>
            </footer>

            {/* MODALS AND OVERLAYS would be conditionally rendered here based on state */}
        </>
    );
      }
                                                                                                               
