/** @type {import('next').NextConfig} */
const nextConfig = {
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
