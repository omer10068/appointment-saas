export type Locale = 'he' | 'en';

export interface DashboardDictionary {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  lang: string;

  nav: {
    brand: string;
    overview: string;
    appointments: string;
    calendar: string;
    customers: string;
    services: string;
    staff: string;
    availability: string;
    businessProfile: string;
    settings: string;
    notifications: string;
    reports: string;
  };

  header: {
    signOut: string;
  };

  languageSwitcher: {
    label: string;
    he: string;
    en: string;
  };

  themeSwitcher: {
    label: string;
    switchToLight: string;
    switchToDark: string;
  };

  overview: {
    title: string;
    description: string;
    todayAppointments: string;
    todayAppointmentsDesc: string;
    upcomingAppointments: string;
    upcomingAppointmentsDesc: string;
    activeCustomers: string;
    activeCustomersDesc: string;
    services: string;
    servicesDesc: string;
    staffMembers: string;
    staffMembersDesc: string;
    monthlyBookings: string;
    monthlyBookingsDesc: string;
    yourBusinesses: string;
    noBusinesses: string;
    roleLabel: string;
    statusLabel: string;
  };

  pages: {
    appointments: { title: string; description: string; emptyTitle: string; emptyDescription: string };
    calendar: { title: string; description: string; emptyTitle: string; emptyDescription: string };
    customers: { title: string; description: string; emptyTitle: string; emptyDescription: string };
    services: { title: string; description: string; emptyTitle: string; emptyDescription: string };
    staff: { title: string; description: string; emptyTitle: string; emptyDescription: string };
    availability: { title: string; description: string; emptyTitle: string; emptyDescription: string };
    businessProfile: { title: string; description: string; emptyTitle: string; emptyDescription: string };
    settings: { title: string; description: string; emptyTitle: string; emptyDescription: string };
    notifications: { title: string; description: string; emptyTitle: string; emptyDescription: string };
    reports: { title: string; description: string; emptyTitle: string; emptyDescription: string };
  };

  comingSoon: string;
}
