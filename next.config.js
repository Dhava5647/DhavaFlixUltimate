/** @type {import('next').NextConfig} */
const nextConfig = {
   async redirects() {
    return [
      {
        source: '/movies',                    // old path
        destination: 'https://dhavaflix.myvnc.com/movies',  // new path
        permanent: true,                      // makes it a 301 redirect
      },
      {
        source: '/tv-shows',
        destination: 'https://dhavaflix.myvnc.com/tv-shows',
  reactStrictMode: true,
  
  // This is the important part that fixes the images
  images: {
    domains: ['image.tmdb.org'],
  },

  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
};

module.exports = nextConfig;
