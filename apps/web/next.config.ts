import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@appointment/contracts'],

  async redirects() {
    return [
      // --- legacy /dashboard/* redirects ---
      { source: '/dashboard', destination: '/home', permanent: true },
      { source: '/dashboard/appointments', destination: '/calendar', permanent: true },
      { source: '/dashboard/calendar', destination: '/calendar', permanent: true },
      { source: '/dashboard/customers', destination: '/customers', permanent: true },
      { source: '/dashboard/services', destination: '/services', permanent: true },
      { source: '/dashboard/service-providers', destination: '/team', permanent: true },
      // /dashboard/availability stays live until Phase C (provider hours) is complete.
      { source: '/availability', destination: '/settings/business-hours', permanent: true },

      // --- transitional /mobile/* redirects ---
      { source: '/mobile', destination: '/home', permanent: true },
      { source: '/mobile/home', destination: '/home', permanent: true },
      { source: '/mobile/calendar', destination: '/calendar', permanent: true },
      { source: '/mobile/customers', destination: '/customers', permanent: true },
      { source: '/mobile/services', destination: '/services', permanent: true },
      { source: '/mobile/team', destination: '/team', permanent: true },
    ];
  },
};

export default nextConfig;
