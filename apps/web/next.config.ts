import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@appointment/contracts'],
};

export default nextConfig;
