import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/";

// --- The Final "God Level" TV Page with Netflix-style Episode List ---
export default function TvDetailsPage() {
    const router = useRouter();
    const { id } = router.query;
    const [details, setDetails] = useState(null);
    const [seasonDetails, setSeasonDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Player state now managed here
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(1);

    // Fetch main show details once
    useEffect(() => {
        if (!id) return;
        const fetchShowDetails = async () => {
            setIsLoading(true);
            try {
                const detailsData = await fetch(`/api/tmdb?path=tv/${id}`).then(res => res.json());
                setDetails(detailsData);
            } catch (error) { console.error("Error fetching TV show data:", error); }
        };
        fetchShowDetails();
    }, [id]);

    // Fetch details for the selected season whenever it changes
    useEffect(() => {
        if (!id || !details) return;
        const fetchSeasonData = async () => {
            try {
                const seasonData = await fetch(`/api/tmdb?path=tv/${id}/season/${selectedSeason}`).then(res => res.json());
                setSeasonDetails(seasonData);
            } catch (error) { console.error("Error fetching season data:", error); } 
            finally { setIsLoading(false); }
        };
        fetchSeasonData();
    }, [id, details, selectedSeason]);
    
    const handleSeasonChange = (e) => {
        setSelectedSeason(Number(e.target.value));
        setSelectedEpisode(1); // Reset to first episode when season changes
    };

    if (isLoading || !details) { 
        return <div className="themed-bg min-h-screen flex items-center justify-center"><div className="w-16 h-16 border-4 border-t-electric-blue border-gray-700 rounded-full animate-spin"></div></div>; 
    }

    const playerUrl = `https://www.2embed.cc/embedtv/${id}?s=${selectedSeason}&e=${selectedEpisode}&sv=player4u`;
    const title = `${details.name} - S${selectedSeason} E${selectedEpisode}`;

    return (
        <>
            <Head>
                <title>{details.name} – DhavaFlix</title>
                <meta name="description" content={details.overview.substring(0, 160) + '...'} />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
            </Head>
            <div className="themed-bg min-h-screen">
                {/* --- Integrated Player --- */}
                <div className="w-full aspect-video bg-black">
                     <iframe src={playerUrl} title={`Watch ${title}`} frameBorder="0" allowFullScreen className="w-full h-full"></iframe>
                </div>
                
                {/* --- Details & Episode List --- */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                     <Link href="/"><a className="text-gray-400 hover:text-white transition-colors mb-4 inline-block">&larr; Back to Home</a></Link>
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Left Column: Poster & Info */}
                        <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
                            {details.poster_path && <Image src={`${IMAGE_BASE_URL}w500${details.poster_path}`} alt={`Poster for ${details.name}`} width={500} height={750} className="rounded-lg shadow-2xl"/>}
                            <h1 className="text-3xl font-bold mt-4">{details.name}</h1>
                             <div className="flex flex-wrap items-center gap-x-3 gap-y-1 my-2 text-gray-400 text-sm">
                                <span>{details.first_air_date?.substring(0, 4)}</span> • <span>{details.number_of_seasons} Season(s)</span> • 
                                <span className="flex items-center"><svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>{details.vote_average?.toFixed(1)}</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-4">{details.overview}</p>
                        </div>

                        {/* Right Column: Episode List */}
                        <div className="w-full md:w-2/3 lg:w-3/4">
                             <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold">Episodes</h2>
                                {details.seasons && (
                                    <select value={selectedSeason} onChange={handleSeasonChange} className="bg-gray-800/50 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-electric-blue">
                                        {details.seasons.filter(s => s.season_number > 0 && s.episode_count > 0).map(s => <option key={s.id} value={s.season_number}>{s.name}</option>)}
                                    </select>
                                )}
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                {seasonDetails?.episodes?.map(ep => (
                                    <button 
                                        key={ep.id} 
                                        onClick={() => setSelectedEpisode(ep.episode_number)}
                                        className={`w-full text-left p-3 rounded-lg transition-colors duration-200 flex gap-4 items-center ${selectedEpisode === ep.episode_number ? 'bg-electric-blue/20' : 'bg-gray-800/30 hover:bg-gray-800/60'}`}
                                    >
                                        <div className="font-bold text-gray-400 text-xl">{ep.episode_number}</div>
                                        <div className="relative w-32 h-20 flex-shrink-0">
                                            {ep.still_path ? (
                                                <Image src={`${IMAGE_BASE_URL}w300${ep.still_path}`} layout="fill" objectFit="cover" className="rounded" alt={`Still from ${ep.name}`}/>
                                            ) : (
                                                <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <h3 className={`font-bold ${selectedEpisode === ep.episode_number ? 'text-electric-blue-light' : 'text-white'}`}>{ep.name}</h3>
                                                <span className="text-xs text-gray-400 flex-shrink-0 ml-4">{ep.runtime} min</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{ep.overview}</p>
                                        </div>
                                    </button>
                                ))}
                                {!seasonDetails && <div className="text-center p-8">Loading episodes...</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}


