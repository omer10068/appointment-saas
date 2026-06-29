import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@appointment/contracts'],

  async redirects() {
    return [
      // --- current flat app routes → /app/* ---
      { source: '/home',              destination: '/app/home',                    permanent: true },
      { source: '/calendar',          destination: '/app/calendar',                permanent: true },
      { source: '/customers',         destination: '/app/customers',               permanent: true },
      { source: '/services',          destination: '/app/services',                permanent: true },
      { source: '/settings',          destination: '/app/settings',                permanent: true },
      { source: '/settings/:path*',   destination: '/app/settings/:path*',         permanent: true },

      // --- legacy /team and /availability → /app/* ---
      { source: '/team',              destination: '/app/settings/team',           permanent: true },
      { source: '/availability',      destination: '/app/settings/business-hours', permanent: true },

      // --- legacy /dashboard/* → /app/* (direct, no chains) ---
      { source: '/dashboard',                   destination: '/app/home',           permanent: true },
      { source: '/dashboard/appointments',      destination: '/app/calendar',       permanent: true },
      { source: '/dashboard/calendar',          destination: '/app/calendar',       permanent: true },
      { source: '/dashboard/customers',         destination: '/app/customers',      permanent: true },
      { source: '/dashboard/services',          destination: '/app/services',       permanent: true },
      { source: '/dashboard/service-providers', destination: '/app/settings/team',  permanent: true },
      { source: '/dashboard/availability',      destination: '/app/settings',       permanent: true },
      { source: '/dashboard/settings',          destination: '/app/settings',       permanent: true },

      // --- legacy /mobile/* → /app/* (direct, no chains) ---
      { source: '/mobile',            destination: '/app/home',                    permanent: true },
      { source: '/mobile/home',       destination: '/app/home',                    permanent: true },
      { source: '/mobile/calendar',   destination: '/app/calendar',                permanent: true },
      { source: '/mobile/customers',  destination: '/app/customers',               permanent: true },
      { source: '/mobile/services',   destination: '/app/services',                permanent: true },
      { source: '/mobile/team',       destination: '/app/settings/team',           permanent: true },

      // --- admin root → admin businesses ---
      { source: '/admin',             destination: '/admin/businesses',            permanent: false },
    ];
  },
};

export default nextConfig;
