import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/";

// --- The Final "God Level" Movie Page with Integrated Player ---
export default function MovieDetailsPage() {
    const router = useRouter();
    const { id } = router.query;
    const [details, setDetails] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const fetchDetails = async () => {
            setIsLoading(true);
            try {
                const detailsPromise = fetch(`/api/tmdb?path=movie/${id}&append_to_response=videos,credits`);
                const recsPromise = fetch(`/api/tmdb?path=movie/${id}/recommendations`);
                const [detailsRes, recsRes] = await Promise.all([detailsPromise, recsPromise]);
                if (!detailsRes.ok) throw new Error('Failed to fetch movie details');
                const detailsData = await detailsRes.json();
                setDetails(detailsData);
                if (recsRes.ok) {
                    const recsData = await recsRes.json();
                    setRecommendations(recsData.results || []);
                }
            } catch (error) { console.error("Error fetching movie data:", error); }
            finally { setIsLoading(false); }
        };
        fetchDetails();
    }, [id]);

    if (isLoading || !details) { 
        return <div className="themed-bg min-h-screen flex items-center justify-center"><div className="w-16 h-16 border-4 border-t-electric-blue border-gray-700 rounded-full animate-spin"></div></div>; 
    }

    const playerUrl = `https://www.2embed.cc/embed/${id}?sv=player4u`;

    return (
        <>
            <Head>
                <title>{details.title} – DhavaFlix</title>
                <meta name="description" content={details.overview.substring(0, 160) + '...'} />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
            </Head>
            <div className="themed-bg min-h-screen">
                {/* --- Integrated Player --- */}
                <div className="w-full aspect-video bg-black">
                     <iframe src={playerUrl} title={`Watch ${details.title}`} frameBorder="0" allowFullScreen className="w-full h-full"></iframe>
                </div>
                
                {/* --- Details & Recommendations --- */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                     <Link href="/"><a className="text-gray-400 hover:text-white transition-colors mb-4 inline-block">&larr; Back to Home</a></Link>
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Left Column: Poster & Info */}
                        <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
                            {details.poster_path && <Image src={`${IMAGE_BASE_URL}w500${details.poster_path}`} alt={`Poster for ${details.title}`} width={500} height={750} className="rounded-lg shadow-2xl"/>}
                            <h1 className="text-3xl font-bold mt-4">{details.title}</h1>
                             <div className="flex flex-wrap items-center gap-x-3 gap-y-1 my-2 text-gray-400 text-sm">
                                <span>{(details.release_date || 'N/A').substring(0, 4)}</span> • <span>{details.runtime || "N/A"} min</span> • 
                                <span className="flex items-center"><svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>{details.vote_average?.toFixed(1)}</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-4">{details.overview}</p>
                        </div>

                        {/* Right Column: Recommendations */}
                        <div className="w-full md:w-2/3 lg:w-3/4">
                             <h2 className="text-2xl font-bold mb-4">More Like This</h2>
                             {recommendations.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {recommendations.slice(0, 12).map(movie => movie.poster_path && (
                                        <Link key={movie.id} href={`/movie/${movie.id}`}>
                                            <a className="group">
                                                <Image src={`${IMAGE_BASE_URL}w500${movie.poster_path}`} width={500} height={750} className="rounded-lg group-hover:scale-105 transition-transform duration-300" alt={movie.title}/>
                                            </a>
                                        </Link>
                                    ))}
                                </div>
                             ) : (
                                 <p className="text-gray-400">No recommendations found.</p>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}


