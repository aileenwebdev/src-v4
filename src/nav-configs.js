// src/nav-configs.js — Nav item arrays for each portal role

export const memberNav = [
  { id: 'dashboard',  icon: '🏠', label: 'Dashboard'       },
  { id: 'bookings',   icon: '📅', label: 'My Bookings'     },
  { id: 'profile',    icon: '👤', label: 'My Profile'      },
  { id: 'activity',   icon: '📋', label: 'Activity History' },
];

export const staffNav = [
  { id: 'dashboard',   icon: '🏠', label: 'Dashboard'        },
  { id: 'bookings',    icon: '📅', label: "Today's Bookings"  },
  { id: 'members',     icon: '👥', label: 'Member Search'     },
  { id: 'checkin',     icon: '✅', label: 'Check-in'          },
  { id: 'tickets',     icon: '🎫', label: 'Tickets'           },
];

export const managementNav = [
  { id: 'dashboard',   icon: '🏠', label: 'Dashboard'        },
  { id: 'analytics',   icon: '📊', label: 'Analytics'        },
  { id: 'staff',       icon: '👔', label: 'Staff Management'  },
  { id: 'config',      icon: '⚙️',  label: 'System Config'    },
  { id: 'bookings',    icon: '📅', label: 'All Bookings'      },
];
