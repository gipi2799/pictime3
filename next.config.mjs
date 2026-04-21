/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    /** Avoid blocking production builds on lint drift in CI / Railway */
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
