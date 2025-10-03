/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 👇 The array must be returned from inside this function
  async redirects() {
    return [
      {
        source: '/movies',
        destination: 'https://dhavaflix.qzz.io/movies',
        permanent: true,
      },
      {
        source: '/tv-shows',
        destination: 'https://dhavaflix.qzz.io/tv-shows',
        permanent: true, // Added this line for correct SEO
      },
    ];
  },

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
