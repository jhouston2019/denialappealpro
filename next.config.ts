import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Windows build: `resolve.symlinks = false` avoids readlink issues on some setups.
   * If `next build` still fails with EISDIR readlink on `app/**/route.ts`, the project drive
   * is often exFAT or similar (use NTFS), or build on Linux CI — see Next.js discussion #77912.
   */
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
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

export default nextConfig;
