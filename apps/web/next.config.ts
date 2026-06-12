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
      { source: '/dashboard/service-providers', destination: '/settings/team', permanent: true },
      { source: '/dashboard/availability', destination: '/settings', permanent: true },
      { source: '/dashboard/settings', destination: '/settings', permanent: true },
      { source: '/availability', destination: '/settings/business-hours', permanent: true },

      // --- /team moved under /settings ---
      { source: '/team', destination: '/settings/team', permanent: true },

      // --- transitional /mobile/* redirects ---
      { source: '/mobile', destination: '/home', permanent: true },
      { source: '/mobile/home', destination: '/home', permanent: true },
      { source: '/mobile/calendar', destination: '/calendar', permanent: true },
      { source: '/mobile/customers', destination: '/customers', permanent: true },
      { source: '/mobile/services', destination: '/services', permanent: true },
      { source: '/mobile/team', destination: '/settings/team', permanent: true },
    ];
  },
};

export default nextConfig;
