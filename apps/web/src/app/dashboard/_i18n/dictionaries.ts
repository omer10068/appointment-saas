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

  themeSwitcher: {
    label: 'מצב תצוגה',
    switchToLight: 'החלף למצב בהיר',
    switchToDark: 'החלף למצב כהה',
  },

  businessSwitcher: {
    noActiveBusiness: 'אין עסק פעיל',
    selectBusiness: 'בחר עסק',
    currentBusiness: 'העסק הנוכחי',
  },

  overview: {
    title: 'סקירה כללית',
    description: 'הדאשבורד מציג נתונים עבור העסק הנבחר.',
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
    selectedBusiness: 'העסק הנוכחי',
    businessStatus: 'סטטוס עסק',
    yourRole: 'התפקיד שלך בעסק',
    dashboardShowsDataFor: 'הדאשבורד מציג נתונים עבור העסק הנבחר',
    noBusinessAssigned: 'כדי להשתמש בדאשבורד, מנהל מערכת צריך לשייך אותך לעסק.',
    contactAdmin: 'פנה למנהל המערכת',
  },

  pages: {
    appointments: {
      title: 'תורים',
      description: 'נהל תורים, אשר בקשות וצפה בלוח הזמנים שלך.',
      emptyTitle: 'ניהול תורים בקרוב',
      emptyDescription: 'קבע, אשר ועקוב אחר תורים עם לקוחות שלך ממקום אחד.',
      managesFor: 'אזור זה ינהל תורים עבור',
    },
    calendar: {
      title: 'לוח שנה',
      description: 'צפה בתורים שלך בתצוגת לוח שנה יומית, שבועית או חודשית.',
      emptyTitle: 'תצוגת לוח שנה בקרוב',
      emptyDescription: 'ראה את לוח הזמנים שלך בתצוגה יומית, שבועית וחודשית.',
      managesFor: 'אזור זה יציג לוח שנה עבור',
    },
    customers: {
      title: 'לקוחות',
      description: 'נהל את ספר הלקוחות שלך והיסטוריית הפגישות שלהם.',
      emptyTitle: 'ניהול לקוחות בקרוב',
      emptyDescription: 'עקוב אחר פרטי לקוחות, היסטוריית תורים והעדפות.',
      managesFor: 'אזור זה ינהל לקוחות עבור',
    },
    services: {
      title: 'שירותים',
      description: 'הגדר את השירותים שאתה מציע, מחירים ומשך זמן.',
      emptyTitle: 'ניהול שירותים בקרוב',
      emptyDescription: 'הוסף שירותים, הגדר מחירים, משך זמן וצוות משויך.',
      managesFor: 'אזור זה ינהל שירותים עבור',
    },
    staff: {
      title: 'צוות',
      description: 'נהל את חברי הצוות שלך, לוחות זמנים והרשאות.',
      emptyTitle: 'ניהול צוות בקרוב',
      emptyDescription: 'הוסף חברי צוות, הגדר לוחות זמנים וניהול הרשאות.',
      managesFor: 'אזור זה ינהל אנשי צוות עבור',
    },
    availability: {
      title: 'זמינות',
      description: 'הגדר שעות פעילות וזמינות לעסק ולצוות שלך.',
      emptyTitle: 'הגדרות זמינות בקרוב',
      emptyDescription: 'הגדר שעות פתיחה, לוחות זמנים לצוות, הפסקות וחסימת זמנים.',
      managesFor: 'אזור זה ינהל זמינות עבור',
    },
    businessProfile: {
      title: 'פרופיל עסקי',
      description: 'עדכן את פרטי העסק, פרטי קשר ופרופיל ציבורי.',
      emptyTitle: 'עורך פרופיל עסקי בקרוב',
      emptyDescription: 'ערוך שם עסק, תיאור, מיקום, אזור זמן ופרטי קשר.',
      managesFor: 'אזור זה ינהל פרופיל עסקי עבור',
    },
    settings: {
      title: 'הגדרות',
      description: 'הגדר העדפות עסקיות והגדרות חשבון.',
      emptyTitle: 'הגדרות עסקיות בקרוב',
      emptyDescription: 'נהל כללי הזמנות, מדיניות ביטולים, העדפות התראות ואינטגרציות.',
      managesFor: 'אזור זה ינהל הגדרות עבור',
    },
    notifications: {
      title: 'התראות',
      description: 'הישאר מעודכן עם בקשות הזמנות, תזכורות והודעות מלקוחות.',
      emptyTitle: 'מרכז התראות בקרוב',
      emptyDescription: 'קבל התראות על הזמנות חדשות, ביטולים והודעות לקוחות במקום אחד.',
      managesFor: 'אזור זה יציג התראות עבור',
    },
    reports: {
      title: 'דוחות',
      description: 'צפה בסיכומי פעילות, מגמות הזמנות ותובנות עסקיות.',
      emptyTitle: 'דוחות ותובנות בקרוב',
      emptyDescription: 'עקוב אחר תורים לאורך זמן, מגמות הכנסה, שימור לקוחות וניצול צוות.',
      managesFor: 'אזור זה יציג דוחות עבור',
    },
  },

  servicesList: {
    serviceName: 'שם השירות',
    description: 'תיאור',
    duration: 'משך',
    price: 'מחיר',
    active: 'פעיל',
    inactive: 'לא פעיל',
    free: 'חינם',
    minutes: 'דקות',
    noServicesYet: 'אין שירותים עדיין',
    noServicesDescription: 'עדיין לא נוספו שירותים לעסק הזה.',
    bufferBefore: 'חוצץ לפני',
    bufferAfter: 'חוצץ אחרי',
  },

  customersList: {
    customerName: 'שם לקוח',
    email: 'אימייל',
    phone: 'טלפון',
    status: 'סטטוס',
    notes: 'הערות',
    noCustomersYet: 'אין לקוחות עדיין',
    noCustomersDescription: 'עדיין לא נוספו לקוחות לעסק הזה.',
    statusActive: 'פעיל',
    statusBlocked: 'חסום',
    statusArchived: 'ארכיון',
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

  themeSwitcher: {
    label: 'Theme',
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
  },

  businessSwitcher: {
    noActiveBusiness: 'No active business',
    selectBusiness: 'Select business',
    currentBusiness: 'Current business',
  },

  overview: {
    title: 'Overview',
    description: 'The dashboard shows data for the selected business.',
    todayAppointments: "Today's Appointments",
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
    selectedBusiness: 'Current business',
    businessStatus: 'Business status',
    yourRole: 'Your role in this business',
    dashboardShowsDataFor: 'The dashboard shows data for the selected business',
    noBusinessAssigned: 'To use the dashboard, an admin needs to assign you to a business.',
    contactAdmin: 'Contact your administrator',
  },

  pages: {
    appointments: {
      title: 'Appointments',
      description: 'Manage appointments, confirm requests, and view your schedule.',
      emptyTitle: 'Appointment management coming soon',
      emptyDescription: 'Schedule, confirm, and track appointments with your customers from one place.',
      managesFor: 'This section will manage appointments for',
    },
    calendar: {
      title: 'Calendar',
      description: 'View your appointments in a daily, weekly, or monthly calendar view.',
      emptyTitle: 'Calendar view coming soon',
      emptyDescription: 'See your schedule in daily, weekly, and monthly views.',
      managesFor: 'This section will show the calendar for',
    },
    customers: {
      title: 'Customers',
      description: 'Manage your customer book and their appointment history.',
      emptyTitle: 'Customer management coming soon',
      emptyDescription: 'Track customer details, appointment history, and preferences.',
      managesFor: 'This section will manage customers for',
    },
    services: {
      title: 'Services',
      description: 'Define the services you offer, pricing, and duration.',
      emptyTitle: 'Service management coming soon',
      emptyDescription: 'Add services, set prices, duration, and assigned staff.',
      managesFor: 'This section will manage services for',
    },
    staff: {
      title: 'Staff',
      description: 'Manage your team members, schedules, and permissions.',
      emptyTitle: 'Staff management coming soon',
      emptyDescription: 'Add team members, set schedules, and manage permissions.',
      managesFor: 'This section will manage staff members for',
    },
    availability: {
      title: 'Availability',
      description: 'Set working hours and availability for your business and staff.',
      emptyTitle: 'Availability settings coming soon',
      emptyDescription: 'Define open hours, staff schedules, breaks, and block unavailable time slots.',
      managesFor: 'This section will manage availability for',
    },
    businessProfile: {
      title: 'Business Profile',
      description: 'Update your business information, contact details, and public profile.',
      emptyTitle: 'Business profile editor coming soon',
      emptyDescription: 'Edit your business name, description, location, timezone, and contact information.',
      managesFor: 'This section will manage the business profile for',
    },
    settings: {
      title: 'Settings',
      description: 'Configure your business preferences and account settings.',
      emptyTitle: 'Business settings coming soon',
      emptyDescription: 'Manage booking rules, cancellation policies, notification preferences, and integrations.',
      managesFor: 'This section will manage settings for',
    },
    notifications: {
      title: 'Notifications',
      description: 'Stay on top of booking requests, reminders, and messages from customers.',
      emptyTitle: 'Notifications coming soon',
      emptyDescription: 'Receive alerts for new bookings, cancellations, and customer messages in one place.',
      managesFor: 'This section will show notifications for',
    },
    reports: {
      title: 'Reports',
      description: 'View activity summaries, booking trends, and business insights.',
      emptyTitle: 'Reports and insights coming soon',
      emptyDescription: 'Track appointments over time, revenue trends, customer retention, and staff utilization.',
      managesFor: 'This section will show reports for',
    },
  },

  servicesList: {
    serviceName: 'Service name',
    description: 'Description',
    duration: 'Duration',
    price: 'Price',
    active: 'Active',
    inactive: 'Inactive',
    free: 'Free',
    minutes: 'min',
    noServicesYet: 'No services yet',
    noServicesDescription: 'No services have been added to this business yet.',
    bufferBefore: 'Buffer before',
    bufferAfter: 'Buffer after',
  },

  customersList: {
    customerName: 'Customer name',
    email: 'Email',
    phone: 'Phone',
    status: 'Status',
    notes: 'Notes',
    noCustomersYet: 'No customers yet',
    noCustomersDescription: 'No customers have been added to this business yet.',
    statusActive: 'Active',
    statusBlocked: 'Blocked',
    statusArchived: 'Archived',
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
