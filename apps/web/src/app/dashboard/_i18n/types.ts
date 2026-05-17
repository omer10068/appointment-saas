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

  businessSwitcher: {
    noActiveBusiness: string;
    selectBusiness: string;
    currentBusiness: string;
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
    selectedBusiness: string;
    businessStatus: string;
    yourRole: string;
    dashboardShowsDataFor: string;
    noBusinessAssigned: string;
    contactAdmin: string;
  };

  pages: {
    appointments: { title: string; description: string; emptyTitle: string; emptyDescription: string; managesFor: string };
    calendar: { title: string; description: string; emptyTitle: string; emptyDescription: string; managesFor: string };
    customers: { title: string; description: string; emptyTitle: string; emptyDescription: string; managesFor: string };
    services: { title: string; description: string; emptyTitle: string; emptyDescription: string; managesFor: string };
    staff: { title: string; description: string; emptyTitle: string; emptyDescription: string; managesFor: string };
    availability: { title: string; description: string; emptyTitle: string; emptyDescription: string; managesFor: string };
    businessProfile: { title: string; description: string; emptyTitle: string; emptyDescription: string; managesFor: string };
    settings: { title: string; description: string; emptyTitle: string; emptyDescription: string; managesFor: string };
    notifications: { title: string; description: string; emptyTitle: string; emptyDescription: string; managesFor: string };
    reports: { title: string; description: string; emptyTitle: string; emptyDescription: string; managesFor: string };
  };

  servicesList: {
    serviceName: string;
    description: string;
    duration: string;
    price: string;
    active: string;
    inactive: string;
    free: string;
    minutes: string;
    noServicesYet: string;
    noServicesDescription: string;
    bufferBefore: string;
    bufferAfter: string;
    actions: string;
    addService: string;
  };

  serviceForm: {
    addService: string;
    editService: string;
    serviceName: string;
    description: string;
    durationMinutes: string;
    priceIls: string;
    bufferBefore: string;
    bufferAfter: string;
    isActive: string;
    save: string;
    cancel: string;
    activate: string;
    deactivate: string;
    createdSuccess: string;
    updatedSuccess: string;
    saveError: string;
    loadError: string;
  };

  customersList: {
    customerName: string;
    email: string;
    phone: string;
    status: string;
    notes: string;
    noCustomersYet: string;
    noCustomersDescription: string;
    statusActive: string;
    statusBlocked: string;
    statusArchived: string;
    actions: string;
    addCustomer: string;
  };

  customerForm: {
    addCustomer: string;
    editCustomer: string;
    customerName: string;
    email: string;
    phone: string;
    notes: string;
    save: string;
    cancel: string;
    blockCustomer: string;
    activateCustomer: string;
    archiveCustomer: string;
    createdSuccess: string;
    updatedSuccess: string;
    saveError: string;
    loadError: string;
  };

  staffList: {
    staffName: string;
    active: string;
    inactive: string;
    noStaffYet: string;
    noStaffDescription: string;
    actions: string;
    addStaffMember: string;
  };

  staffForm: {
    addStaffMember: string;
    editStaffMember: string;
    staffName: string;
    isActive: string;
    save: string;
    cancel: string;
    activate: string;
    deactivate: string;
    createdSuccess: string;
    updatedSuccess: string;
    saveError: string;
    loadError: string;
  };

  comingSoon: string;
}
