/**
 * ACCESS CONTROL — 3-TIER MODEL
 *
 * TIER 1 — SUPER ADMIN (Jeff, Lane, Scott):
 *   Full, unrestricted access to every page, every entity, every tool.
 *   Identified by super_admin role OR matching named users below.
 *
 * TIER 2 — DIVISION/ENTITY ADMINS (Section Admins):
 *   Assigned to a division/entity by a super admin.
 *   Can access only their division's pages and tools.
 *   Can assign roles to employees within their division (managesRoles).
 *   Cannot see other divisions' data or tools.
 *
 * TIER 3 — EMPLOYEES:
 *   Assigned a role by their division admin.
 *   Can only see the specific pages and tools required to do their job.
 *   No ability to manage users or assign roles.
 */

// ─── TIER 1: NAMED SUPER ADMIN USERS ────────────────────────────────────────
// Match by email prefix OR full name prefix (case-insensitive).
// These three individuals + anyone with role=super_admin get ALL access.
export const FULL_ACCESS_USERS = [
  'jeff',
  'lane',
  'scott',
];

// ─── TIER 2: DIVISION/ENTITY ADMIN DEFINITIONS ──────────────────────────────
// Each section admin role maps to:
//   pages       → the routes they (and their employees) can access
//   tools       → human-readable tool names for display
//   managesRoles→ which employee roles they can assign within their division
//   entity      → which operating entity/division they manage (optional label)
export const SECTION_ADMIN_SECTIONS = {

  feedlot_admin: {
    label: 'Feedlot Division Admin',
    entity: 'Feedlot / Ranch Operations',
    description: 'Manages feedlot operations, cattle lots, feed & health, and ranch staff',
    pages: [
      '/',
      '/lots',
      '/feedlot-ops',
      '/lot-performance',
      '/feed-health',
      '/ai-feed-planner',
      '/ai-ops-advisor',
      '/staff-portal',
      '/maintenance',
    ],
    managesRoles: ['cowboy', 'feed_mill', 'feed_truck', 'field_rep', 'maintenance', 'welder'],
  },

  trucking_admin: {
    label: 'Trucking Division Admin',
    entity: 'Trucking / Logistics',
    description: 'Manages trucking operations, load board, dispatch, and drivers',
    pages: [
      '/',
      '/load-board',
      '/trucking',
      '/staff-portal',
      '/maintenance',
    ],
    managesRoles: ['truck_driver', 'truck_owner', 'dispatch', 'hauler'],
  },

  maintenance_admin: {
    label: 'Maintenance Division Admin',
    entity: 'Maintenance / Facilities',
    description: 'Manages maintenance tickets, facilities, and maintenance staff',
    pages: [
      '/',
      '/maintenance',
      '/staff-portal',
    ],
    managesRoles: ['welder', 'maintenance'],
  },

  financial_admin: {
    label: 'Financial Division Admin',
    entity: 'Financial / Legal',
    description: 'Manages financial intelligence, entity financials, and corporate structure',
    pages: [
      '/',
      '/entity-financials',
      '/financial-intelligence',
      '/corporate-structure',
      '/approvals',
      '/attorney-portal',
      '/document',
      '/staff-portal',
    ],
    managesRoles: ['accountant', 'attorney_cpa', 'investor', 'banker'],
  },

  market_admin: {
    label: 'Market Division Admin',
    entity: 'Market & Analytics',
    description: 'Manages market inputs, ROI, playbook, programs, and analytics',
    pages: [
      '/',
      '/market',
      '/roi-ladder',
      '/purchase-calculator',
      '/cutout',
      '/enterprise',
      '/playbook',
      '/programs',
      '/sensitivity',
      '/global',
      '/trade-analytics',
      '/carcass-quality',
      '/lots',
      '/staff-portal',
    ],
    managesRoles: ['sales_rep', 'field_rep', 'manager'],
  },

  staff_admin: {
    label: 'HR / Staff Admin',
    entity: 'Human Resources',
    description: 'Manages all staff records, HR, onboarding, and approvals',
    pages: [
      '/',
      '/staff-portal',
      '/approvals',
    ],
    managesRoles: [
      'cowboy', 'feed_mill', 'feed_truck', 'field_rep', 'sales_rep',
      'truck_driver', 'truck_owner', 'dispatch', 'welder', 'maintenance',
      'office_manager', 'manager',
    ],
  },

  field_admin: {
    label: 'Field Operations Admin',
    entity: 'Field / Marketplace',
    description: 'Manages field submissions, marketplace, listings, and field reps',
    pages: [
      '/',
      '/field-rep',
      '/marketplace',
      '/my-listings',
      '/lots',
      '/lot-performance',
      '/staff-portal',
    ],
    managesRoles: ['field_rep', 'sales_rep', 'buyer', 'seller'],
  },
};

// ─── TIER 3: EMPLOYEE ROLE → ALLOWED PAGES ──────────────────────────────────
// Each employee role maps to only the pages they need to do their job.
// Division admin assigns the role; this defines what that employee can see.
export const EMPLOYEE_ROLE_PAGES = {
  // Management
  manager:        ['/', '/market', '/roi-ladder', '/purchase-calculator', '/cutout', '/enterprise', '/playbook', '/programs', '/lots', '/lot-performance', '/feedlot-ops', '/feed-health', '/ai-feed-planner', '/ai-ops-advisor', '/trucking', '/load-board', '/marketplace', '/field-rep', '/staff-portal', '/corporate-structure', '/financial-intelligence', '/trade-analytics', '/carcass-quality', '/sensitivity', '/global'],
  office_manager: ['/', '/market', '/lots', '/document', '/staff-portal', '/trucking', '/approvals'],

  // Financial / Legal
  accountant:    ['/', '/entity-financials', '/financial-intelligence', '/corporate-structure', '/document', '/attorney-portal'],
  attorney_cpa:  ['/attorney-portal', '/document', '/entity-financials', '/corporate-structure'],
  investor:      ['/', '/roi-ladder', '/entity-financials', '/financial-intelligence', '/lots', '/programs'],
  banker:        ['/', '/lots', '/entity-financials'],

  // Trucking
  dispatch:      ['/', '/load-board', '/trucking', '/staff-portal'],
  truck_owner:   ['/', '/load-board', '/trucking', '/staff-portal'],
  truck_driver:  ['/load-board', '/staff-portal'],
  hauler:        ['/load-board'],

  // Feedlot / Ranch
  cowboy:        ['/lot-performance', '/lots', '/feedlot-ops', '/staff-portal'],
  feed_mill:     ['/feedlot-ops', '/feed-health', '/staff-portal'],
  feed_truck:    ['/feedlot-ops', '/staff-portal'],
  field_rep:     ['/field-rep', '/lots', '/lot-performance', '/staff-portal'],
  sales_rep:     ['/marketplace', '/field-rep', '/lots', '/playbook', '/staff-portal'],

  // Maintenance
  welder:        ['/maintenance', '/staff-portal'],
  maintenance:   ['/maintenance', '/staff-portal'],

  // External
  buyer:         ['/marketplace'],
  seller:        ['/my-listings'],

  // Fallback
  user:          ['/', '/market', '/lots'],
  pending:       [],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * TIER 1 check: Returns true if user is a super admin (Jeff, Lane, Scott or super_admin role).
 * These users bypass ALL restrictions.
 */
export function isFullAccess(user) {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  const nameLC  = (user.full_name || '').toLowerCase();
  const emailLC = (user.email    || '').toLowerCase();
  return FULL_ACCESS_USERS.some(n =>
    nameLC.startsWith(n) || emailLC.startsWith(n)
  );
}

/**
 * TIER 2 check: Returns the section admin config if user is a division admin, else null.
 */
export function getSectionAdmin(user) {
  if (!user) return null;
  return SECTION_ADMIN_SECTIONS[user.role] || null;
}

/**
 * Returns true if user can access a given page path.
 *   Tier 1 (super admin): always yes.
 *   Tier 2 (division admin): yes if path is in their section's pages.
 *   Tier 3 (employee): yes if path is in their role's allowed pages.
 */
export function canAccessPage(user, path) {
  if (!user) return false;
  if (isFullAccess(user)) return true;

  const section = SECTION_ADMIN_SECTIONS[user.role];
  if (section) return section.pages.includes(path);

  const employeePages = EMPLOYEE_ROLE_PAGES[user.role];
  if (employeePages) return employeePages.includes(path);

  return false;
}

/**
 * Returns the list of pages a user is allowed to see in the nav.
 *   Tier 1: 'all'
 *   Tier 2: their section's pages array
 *   Tier 3: their role's pages array
 */
export function getAllowedPagePaths(user) {
  if (!user) return [];
  if (isFullAccess(user)) return 'all';

  const section = SECTION_ADMIN_SECTIONS[user.role];
  if (section) return section.pages;

  return EMPLOYEE_ROLE_PAGES[user.role] || [];
}

/**
 * Returns the list of roles this user can assign to employees.
 *   Tier 1: 'all'
 *   Tier 2: their section's managesRoles
 *   Tier 3: [] (cannot manage anyone)
 */
export function getManagedRoles(user) {
  if (!user) return [];
  if (isFullAccess(user)) return 'all';
  const section = SECTION_ADMIN_SECTIONS[user.role];
  if (section) return section.managesRoles;
  return [];
}

/**
 * Returns true if the user can manage other users (assign roles, approve accounts).
 */
export function canManageUsers(user) {
  if (!user) return false;
  if (isFullAccess(user)) return true;
  return !!SECTION_ADMIN_SECTIONS[user.role];
}

/**
 * Returns a human-readable access level label.
 */
export function getAccessLabel(user) {
  if (!user) return 'No Access';
  if (isFullAccess(user)) return '⭐ Super Admin — Full Platform Access';
  const section = SECTION_ADMIN_SECTIONS[user.role];
  if (section) return `${section.label} — ${section.entity}`;
  return user.role?.replace(/_/g, ' ') || 'Employee';
}