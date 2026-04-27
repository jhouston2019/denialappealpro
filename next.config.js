/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.resolve.symlinks = false;
    return config;
  },
  async redirects() {
    return [
      { source: "/success", destination: "/welcome", permanent: false },
      { source: "/appeal-form", destination: "/start", permanent: false },
      { source: "/upload", destination: "/start", permanent: false },
    ];
  },
};

module.exports = nextConfig;
