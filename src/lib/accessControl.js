/**
 * ACCESS CONTROL CONFIGURATION
 * 
 * FULL ACCESS PRINCIPALS — can do everything, everywhere:
 *   super_admin role  +  named users: Lane, Scott, Jeff (matched by email or name)
 *
 * SECTION ADMINS — admin of a specific department only:
 *   feedlot_admin     → Feedlot/Ranch operations
 *   trucking_admin    → Trucking/Logistics/Load board
 *   maintenance_admin → Maintenance/Facilities
 *   financial_admin   → Financial/Entity/Corporate
 *   market_admin      → Market data, ROI, programs, playbook
 *   staff_admin       → Staff portal, HR management
 *   field_admin       → Field reps, marketplace, submissions
 */

// ─── NAMED FULL-ACCESS USERS ────────────────────────────────────────────────
// These users get super_admin access regardless of their assigned role.
// Match by email prefix (case-insensitive) or full name.
export const FULL_ACCESS_USERS = [
  'lane',
  'scott',
  'jeff',
];

// ─── SECTION ADMIN ROLE DEFINITIONS ─────────────────────────────────────────
export const SECTION_ADMIN_SECTIONS = {
  feedlot_admin: {
    label: 'Feedlot Admin',
    description: 'Manage feedlot operations, lot performance, feed & health, and feedlot staff',
    pages: [
      '/lots', '/feedlot-ops', '/lot-performance', '/feed-health',
      '/ai-feed-planner', '/staff-portal', '/',
    ],
    managesRoles: ['cowboy', 'feed_mill', 'feed_truck', 'field_rep'],
  },
  trucking_admin: {
    label: 'Trucking Admin',
    description: 'Manage trucking operations, load board, dispatch, and drivers',
    pages: [
      '/load-board', '/trucking', '/staff-portal', '/',
    ],
    managesRoles: ['truck_driver', 'truck_owner', 'dispatch', 'hauler'],
  },
  maintenance_admin: {
    label: 'Maintenance Admin',
    description: 'Manage maintenance tickets, facilities, and maintenance staff',
    pages: [
      '/maintenance', '/staff-portal', '/',
    ],
    managesRoles: ['welder', 'maintenance'],
  },
  financial_admin: {
    label: 'Financial Admin',
    description: 'Manage financial intelligence, entity financials, corporate structure',
    pages: [
      '/entity-financials', '/financial-intelligence', '/corporate-structure',
      '/approvals', '/attorney-portal', '/staff-portal', '/',
    ],
    managesRoles: ['accountant', 'attorney_cpa', 'investor', 'banker'],
  },
  market_admin: {
    label: 'Market Admin',
    description: 'Manage market inputs, ROI, playbook, programs, and analytics',
    pages: [
      '/market', '/roi-ladder', '/purchase-calculator', '/cutout', '/enterprise',
      '/playbook', '/programs', '/sensitivity', '/global', '/trade-analytics',
      '/carcass-quality', '/',
    ],
    managesRoles: ['sales_rep', 'field_rep'],
  },
  staff_admin: {
    label: 'Staff Admin',
    description: 'Manage all staff records, HR, and employee directory',
    pages: [
      '/staff-portal', '/approvals', '/',
    ],
    managesRoles: Object.keys({}).concat([
      'cowboy', 'feed_mill', 'feed_truck', 'field_rep', 'sales_rep',
      'truck_driver', 'truck_owner', 'dispatch', 'welder', 'maintenance',
      'office_manager', 'manager',
    ]),
  },
  field_admin: {
    label: 'Field Admin',
    description: 'Manage field submissions, marketplace, listings, and field reps',
    pages: [
      '/field-rep', '/marketplace', '/my-listings', '/lots', '/lot-performance', '/',
    ],
    managesRoles: ['field_rep', 'sales_rep', 'buyer', 'seller'],
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the user is a full-access principal:
 * super_admin role, OR named user (Lane/Scott/Jeff)
 */
export function isFullAccess(user) {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  const nameLC = (user.full_name || '').toLowerCase();
  const emailLC = (user.email || '').toLowerCase();
  return FULL_ACCESS_USERS.some(n =>
    nameLC.startsWith(n) || emailLC.startsWith(n)
  );
}

/**
 * Returns true if user can access a given page path.
 * Full-access users: always yes.
 * Section admins: yes for their section pages.
 * Others: falls through to role-based nav config.
 */
export function canAccessPage(user, path) {
  if (!user) return false;
  if (isFullAccess(user)) return true;
  const section = SECTION_ADMIN_SECTIONS[user.role];
  if (section) return section.pages.includes(path);
  return null; // let role-based nav decide
}

/**
 * Returns list of roles this user is allowed to manage (assign/edit).
 * Full-access: all roles.
 * Section admin: their managesRoles list.
 * Others: empty.
 */
export function getManagedRoles(user) {
  if (!user) return [];
  if (isFullAccess(user)) return 'all';
  const section = SECTION_ADMIN_SECTIONS[user.role];
  if (section) return section.managesRoles;
  return [];
}

/**
 * Returns a human-readable access level label.
 */
export function getAccessLabel(user) {
  if (!user) return 'No Access';
  if (isFullAccess(user)) return 'Full Platform Access';
  const section = SECTION_ADMIN_SECTIONS[user.role];
  if (section) return section.label;
  return user.role;
}