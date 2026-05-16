import type { DashboardDictionary, Locale } from './types';
import { getDir, getLang } from './config';

const he: DashboardDictionary = {
  locale: 'he',
  dir: 'rtl',
  lang: 'he',

  nav: {
    brand: 'העסק שלי',
    overview: 'סקירה כללית',
    appointments: 'תורים',
    calendar: 'לוח שנה',
    customers: 'לקוחות',
    services: 'שירותים',
    staff: 'צוות',
    availability: 'זמינות',
    businessProfile: 'פרופיל עסקי',
    settings: 'הגדרות',
    notifications: 'התראות',
    reports: 'דוחות',
  },

  header: {
    signOut: 'התנתקות',
  },

  languageSwitcher: {
    label: 'שפה',
    he: 'עברית',
    en: 'English',
  },

  overview: {
    title: 'סקירה כללית',
    description: 'ברוך הבא. הנה סיכום פעילות העסק שלך.',
    todayAppointments: 'תורים להיום',
    todayAppointmentsDesc: 'תורים מתוכננים להיום',
    upcomingAppointments: 'תורים קרובים',
    upcomingAppointmentsDesc: '7 הימים הקרובים',
    activeCustomers: 'לקוחות פעילים',
    activeCustomersDesc: 'לקוחות עם פעילות אחרונה',
    services: 'שירותים',
    servicesDesc: 'השירותים שאתה מציע',
    staffMembers: 'אנשי צוות',
    staffMembersDesc: 'צוות פעיל',
    monthlyBookings: 'הזמנות חודשיות',
    monthlyBookingsDesc: 'הזמנות החודש',
    yourBusinesses: 'העסקים שלך',
    noBusinesses: 'אין עסקים משויכים לחשבון שלך עדיין.',
    roleLabel: 'תפקיד',
    statusLabel: 'סטטוס',
  },

  pages: {
    appointments: {
      title: 'תורים',
      description: 'נהל תורים, אשר בקשות וצפה בלוח הזמנים שלך.',
      emptyTitle: 'ניהול תורים בקרוב',
      emptyDescription: 'קבע, אשר ועקוב אחר תורים עם לקוחות שלך ממקום אחד.',
    },
    calendar: {
      title: 'לוח שנה',
      description: 'צפה בתורים שלך בתצוגת לוח שנה יומית, שבועית או חודשית.',
      emptyTitle: 'תצוגת לוח שנה בקרוב',
      emptyDescription: 'ראה את לוח הזמנים שלך בתצוגה יומית, שבועית וחודשית.',
    },
    customers: {
      title: 'לקוחות',
      description: 'נהל את ספר הלקוחות שלך והיסטוריית הפגישות שלהם.',
      emptyTitle: 'ניהול לקוחות בקרוב',
      emptyDescription: 'עקוב אחר פרטי לקוחות, היסטוריית תורים והעדפות.',
    },
    services: {
      title: 'שירותים',
      description: 'הגדר את השירותים שאתה מציע, מחירים ומשך זמן.',
      emptyTitle: 'ניהול שירותים בקרוב',
      emptyDescription: 'הוסף שירותים, הגדר מחירים, משך זמן וצוות משויך.',
    },
    staff: {
      title: 'צוות',
      description: 'נהל את חברי הצוות שלך, לוחות זמנים והרשאות.',
      emptyTitle: 'ניהול צוות בקרוב',
      emptyDescription: 'הוסף חברי צוות, הגדר לוחות זמנים וניהול הרשאות.',
    },
    availability: {
      title: 'זמינות',
      description: 'הגדר שעות פעילות וזמינות לעסק ולצוות שלך.',
      emptyTitle: 'הגדרות זמינות בקרוב',
      emptyDescription: 'הגדר שעות פתיחה, לוחות זמנים לצוות, הפסקות וחסימת זמנים.',
    },
    businessProfile: {
      title: 'פרופיל עסקי',
      description: 'עדכן את פרטי העסק, פרטי קשר ופרופיל ציבורי.',
      emptyTitle: 'עורך פרופיל עסקי בקרוב',
      emptyDescription: 'ערוך שם עסק, תיאור, מיקום, אזור זמן ופרטי קשר.',
    },
    settings: {
      title: 'הגדרות',
      description: 'הגדר העדפות עסקיות והגדרות חשבון.',
      emptyTitle: 'הגדרות עסקיות בקרוב',
      emptyDescription: 'נהל כללי הזמנות, מדיניות ביטולים, העדפות התראות ואינטגרציות.',
    },
    notifications: {
      title: 'התראות',
      description: 'הישאר מעודכן עם בקשות הזמנות, תזכורות והודעות מלקוחות.',
      emptyTitle: 'מרכז התראות בקרוב',
      emptyDescription: 'קבל התראות על הזמנות חדשות, ביטולים והודעות לקוחות במקום אחד.',
    },
    reports: {
      title: 'דוחות',
      description: 'צפה בסיכומי פעילות, מגמות הזמנות ותובנות עסקיות.',
      emptyTitle: 'דוחות ותובנות בקרוב',
      emptyDescription: 'עקוב אחר תורים לאורך זמן, מגמות הכנסה, שימור לקוחות וניצול צוות.',
    },
  },

  comingSoon: 'בקרוב',
};

const en: DashboardDictionary = {
  locale: 'en',
  dir: 'ltr',
  lang: 'en',

  nav: {
    brand: 'My Business',
    overview: 'Overview',
    appointments: 'Appointments',
    calendar: 'Calendar',
    customers: 'Customers',
    services: 'Services',
    staff: 'Staff',
    availability: 'Availability',
    businessProfile: 'Business Profile',
    settings: 'Settings',
    notifications: 'Notifications',
    reports: 'Reports',
  },

  header: {
    signOut: 'Sign out',
  },

  languageSwitcher: {
    label: 'Language',
    he: 'עברית',
    en: 'English',
  },

  overview: {
    title: 'Overview',
    description: 'Welcome back. Here\'s a summary of your business activity.',
    todayAppointments: 'Today\'s Appointments',
    todayAppointmentsDesc: 'Appointments scheduled for today',
    upcomingAppointments: 'Upcoming Appointments',
    upcomingAppointmentsDesc: 'Next 7 days',
    activeCustomers: 'Active Customers',
    activeCustomersDesc: 'Customers with recent activity',
    services: 'Services',
    servicesDesc: 'Services you offer',
    staffMembers: 'Staff Members',
    staffMembersDesc: 'Active staff',
    monthlyBookings: 'Monthly Bookings',
    monthlyBookingsDesc: 'Bookings this month',
    yourBusinesses: 'Your Businesses',
    noBusinesses: 'No businesses are assigned to your account yet.',
    roleLabel: 'Role',
    statusLabel: 'Status',
  },

  pages: {
    appointments: {
      title: 'Appointments',
      description: 'Manage appointments, confirm requests, and view your schedule.',
      emptyTitle: 'Appointment management coming soon',
      emptyDescription: 'Schedule, confirm, and track appointments with your customers from one place.',
    },
    calendar: {
      title: 'Calendar',
      description: 'View your appointments in a daily, weekly, or monthly calendar view.',
      emptyTitle: 'Calendar view coming soon',
      emptyDescription: 'See your schedule in daily, weekly, and monthly views.',
    },
    customers: {
      title: 'Customers',
      description: 'Manage your customer book and their appointment history.',
      emptyTitle: 'Customer management coming soon',
      emptyDescription: 'Track customer details, appointment history, and preferences.',
    },
    services: {
      title: 'Services',
      description: 'Define the services you offer, pricing, and duration.',
      emptyTitle: 'Service management coming soon',
      emptyDescription: 'Add services, set prices, duration, and assigned staff.',
    },
    staff: {
      title: 'Staff',
      description: 'Manage your team members, schedules, and permissions.',
      emptyTitle: 'Staff management coming soon',
      emptyDescription: 'Add team members, set schedules, and manage permissions.',
    },
    availability: {
      title: 'Availability',
      description: 'Set working hours and availability for your business and staff.',
      emptyTitle: 'Availability settings coming soon',
      emptyDescription: 'Define open hours, staff schedules, breaks, and block unavailable time slots.',
    },
    businessProfile: {
      title: 'Business Profile',
      description: 'Update your business information, contact details, and public profile.',
      emptyTitle: 'Business profile editor coming soon',
      emptyDescription: 'Edit your business name, description, location, timezone, and contact information.',
    },
    settings: {
      title: 'Settings',
      description: 'Configure your business preferences and account settings.',
      emptyTitle: 'Business settings coming soon',
      emptyDescription: 'Manage booking rules, cancellation policies, notification preferences, and integrations.',
    },
    notifications: {
      title: 'Notifications',
      description: 'Stay on top of booking requests, reminders, and messages from customers.',
      emptyTitle: 'Notifications coming soon',
      emptyDescription: 'Receive alerts for new bookings, cancellations, and customer messages in one place.',
    },
    reports: {
      title: 'Reports',
      description: 'View activity summaries, booking trends, and business insights.',
      emptyTitle: 'Reports and insights coming soon',
      emptyDescription: 'Track appointments over time, revenue trends, customer retention, and staff utilization.',
    },
  },

  comingSoon: 'Coming soon',
};

const dictionaries: Record<Locale, DashboardDictionary> = { he, en };

export function getDictionary(locale: Locale): DashboardDictionary {
  return dictionaries[locale];
}

export function getDictionaryWithDir(locale: Locale): DashboardDictionary {
  return {
    ...dictionaries[locale],
    dir: getDir(locale),
    lang: getLang(locale),
  };
}
