import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/";

export default function TvDetailsPage() {
    const router = useRouter();
    const { id } = router.query;
    const [details, setDetails] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(1);
    const [videoKey, setVideoKey] = useState(null);

    useEffect(() => {
        if (!id) return;
        const fetchDetails = async () => {
            setIsLoading(true);
            try {
                const detailsPromise = fetch(`/api/tmdb?path=tv/${id}&append_to_response=videos,credits`);
                const recsPromise = fetch(`/api/tmdb?path=tv/${id}/recommendations`);
                const [detailsRes, recsRes] = await Promise.all([detailsPromise, recsPromise]);
                if (!detailsRes.ok) throw new Error('Failed to fetch TV show details');
                const detailsData = await detailsRes.json();
                setDetails(detailsData);
                if (recsRes.ok) {
                    const recsData = await recsRes.json();
                    setRecommendations(recsData.results || []);
                }
            } catch (error) { console.error("Error fetching TV data:", error); }
            finally { setIsLoading(false); }
        };
        fetchDetails();
    }, [id]);

    useEffect(() => {
        const isModalOpen = isPlayerOpen || videoKey;
        document.body.style.overflow = isModalOpen ? 'hidden' : 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [isPlayerOpen, videoKey]);
    
    const handleSeasonChange = (e) => {
        setSelectedSeason(Number(e.target.value));
        setSelectedEpisode(1);
    };
    
    const playTrailer = () => {
        const trailer = details.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        if (trailer) setVideoKey(trailer.key);
        else alert('Trailer not available for this show.');
    };

    if (isLoading || !details) { return <div className="themed-bg min-h-screen flex items-center justify-center"><div className="w-16 h-16 border-4 border-t-electric-blue border-gray-700 rounded-full animate-spin"></div></div>; }

    const currentSeasonData = details.seasons?.find(s => s.season_number === selectedSeason);

    return (
        <>
            <Head>
                <title>{details.name} – DhavaFlix</title>
                <meta name="description" content={details.overview.substring(0, 160) + '...'} />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />

                {/* --- Dynamic Open Graph Meta Tags for Link Previews --- */}
                <meta property="og:title" content={`${details.name} – DhavaFlix`} />
                <meta property="og:description" content={details.overview.substring(0, 160) + '...'} />
                <meta property="og:image" content={`${IMAGE_BASE_URL}w500${details.poster_path}`} />
                <meta property="og:url" content={`https://dhavaflix.vercel.app/tv/${id}`} />
            </Head>
            <div className="themed-bg min-h-screen">
                {/* ... rest of the component is the same */}
                <div className="relative h-[50vh] md:h-[60vh]">
                     {details.backdrop_path && <Image src={`${IMAGE_BASE_URL}w1280${details.backdrop_path}`} alt={details.name} layout="fill" objectFit="cover" className="opacity-40"/>}
                    <div className="absolute inset-0 bg-gradient-to-t from-midnight-bg"></div>
                     <Link href="/"><a className="absolute top-6 left-6 z-10 bg-black/50 text-white px-4 py-2 rounded-full hover:bg-electric-blue transition-colors duration-300">&larr; Back to Home</a></Link>
                </div>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-40 relative z-10 pb-20">
                    <div className="md:flex md:space-x-8">
                        <div className="flex-shrink-0 w-48 md:w-64 mx-auto md:mx-0">
                            {details.poster_path && <Image src={`${IMAGE_BASE_URL}w500${details.poster_path}`} alt={`Poster for ${details.name}`} width={500} height={750} className="rounded-lg shadow-2xl"/>}
                        </div>
                        <div className="pt-8 md:pt-0 text-center md:text-left">
                            <h1 className="text-3xl md:text-5xl font-bold hero-text-shadow">{details.name}</h1>
                            <div className="flex justify-center md:justify-start flex-wrap items-center gap-x-4 gap-y-2 my-4 text-gray-300">
                                <span>{details.first_air_date?.substring(0, 4)} - {details.in_production ? 'Present' : details.last_air_date?.substring(0, 4)}</span> • <span>{details.number_of_seasons} Season(s)</span> • 
                                <span className="flex items-center"><svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>{details.vote_average?.toFixed(1) || 'N/A'}</span>
                            </div>
                            <p className="text-base text-gray-300 max-w-2xl">{details.overview}</p>
                            <button onClick={playTrailer} className="mt-4 bg-gray-700/80 font-semibold py-2 px-5 rounded flex items-center hover:bg-gray-600/70 transition duration-300 hover:scale-105">Watch Trailer</button>
                            <div className="mt-6 p-4 themed-bg rounded-lg bg-gray-500/10">
                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                    <div className="flex-1 w-full"><label htmlFor="season-select" className="block text-sm font-medium text-gray-400 mb-1">Season</label><select id="season-select" value={selectedSeason} onChange={handleSeasonChange} className="w-full bg-gray-800/50 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-electric-blue">{details.seasons?.filter(s => s.season_number > 0).map(s => <option key={s.id} value={s.season_number}>{s.name}</option>)}</select></div>
                                    <div className="flex-1 w-full"><label htmlFor="episode-select" className="block text-sm font-medium text-gray-400 mb-1">Episode</label><select id="episode-select" value={selectedEpisode} onChange={(e) => setSelectedEpisode(Number(e.target.value))} className="w-full bg-gray-800/50 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-electric-blue">{currentSeasonData && Array.from({ length: currentSeasonData.episode_count }, (_, i) => i + 1).map(ep => <option key={ep} value={ep}>Episode {ep}</option>)}</select></div>
                                    <div className="w-full sm:w-auto self-end"><button onClick={() => setIsPlayerOpen(true)} className="w-full flex items-center justify-center bg-white text-black font-bold py-2 px-6 rounded-lg transition-transform duration-300 hover:scale-105 text-md"><svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg><span>Play</span></button></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {details.credits?.cast?.length > 0 && <div className="mt-12"><h2 className="text-2xl font-bold mb-4">Series Cast</h2><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">{details.credits.cast.slice(0, 8).map(person => person.profile_path && (<div key={person.id} className="text-center"><Image src={`${IMAGE_BASE_URL}w185${person.profile_path}`} width={185} height={278} className="rounded-lg" alt={person.name}/><p className="text-sm mt-2 font-bold">{person.name}</p><p className="text-xs text-gray-400">{person.character}</p></div>))}</div></div>}
                    {recommendations.length > 0 && <div className="mt-12"><h2 className="text-2xl font-bold mb-4">More Like This</h2><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">{recommendations.slice(0, 12).map(show => show.poster_path && (<Link key={show.id} href={`/tv/${show.id}`}><a className="group"><Image src={`${IMAGE_BASE_URL}w500${show.poster_path}`} width={500} height={750} className="rounded-lg group-hover:scale-105 transition-transform duration-300" alt={show.name}/></a></Link>))}</div></div>}
                </div>
            </div>
            {isPlayerOpen && (<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in p-4"><div className="w-full max-w-6xl"><div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-white">{details.name} (S{selectedSeason} E{selectedEpisode})</h3><button onClick={() => setIsPlayerOpen(false)} className="text-white text-4xl leading-none hover:text-electric-blue-light transition-colors">&times;</button></div><div className="aspect-video w-full"><iframe src={`https://embed.vidsrc.pk/tv/${details.id}?s=${selectedSeason}&e=${selectedEpisode}`} title={`Watch ${details.name}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full rounded-lg shadow-2xl bg-black"></iframe></div></div></div>)}
            {videoKey && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80" role="dialog" aria-modal="true"><div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden"><iframe className="w-full h-full" src={`https://www.youtube.com/embed/${videoKey}?autoplay=1`} title="YouTube video player" frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen></iframe><button onClick={() => setVideoKey(null)} className="absolute top-2 right-2 text-3xl text-white" aria-label="Close video">&times;</button></div></div>}
        </>
    );
}


