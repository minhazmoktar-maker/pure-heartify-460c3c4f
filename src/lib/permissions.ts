/**
 * Centralized permission matrix for the entire application.
 *
 * This module is the SINGLE SOURCE OF TRUTH for authorization decisions.
 * UI components, hooks, and (via a mirrored copy) edge functions all
 * consult this file. Adding a new capability means adding a permission
 * string here and mapping it to one or more roles — never sprinkling
 * `if (isOwner)` checks throughout the codebase.
 *
 * Security model: DEFAULT DENY. If a permission is not explicitly listed
 * for a role, the role does not have it.
 */

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const ROLES = ["user", "moderator", "admin", "owner"] as const;
export type Role = (typeof ROLES)[number];

/** Numeric rank so we can express "at least X" for legacy call sites. */
export const ROLE_RANK: Record<Role, number> = {
  user: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
};

// ---------------------------------------------------------------------------
// Permissions (exhaustive, alphabetised within groups)
// ---------------------------------------------------------------------------

export const PERMISSIONS = [
  // Video lifecycle
  "delete_video",
  "restore_video",
  "hide_video",
  "unhide_video",
  "archive_video",
  "unarchive_video",
  "feature_video",
  "pin_video",
  "edit_video_metadata",
  "edit_halal_score",
  "override_ai_decision",
  "approve_content",
  "reject_content",
  "remove_from_surface",

  // Channels
  "manage_channels",
  "ban_channel",

  // Taxonomy
  "manage_categories",
  "manage_tags",

  // Users & roles
  "manage_users",
  "manage_roles",
  "manage_owners",

  // Platform
  "manage_platform_settings",
  "manage_feature_flags",
  "manage_api_keys",

  // Dashboards
  "access_admin_dashboard",
  "access_owner_dashboard",

  // Observability
  "view_analytics",
  "view_audit_logs",
  "view_moderation_history",
  "moderate_reports",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// ---------------------------------------------------------------------------
// Role → permissions matrix
// ---------------------------------------------------------------------------

/**
 * Permissions are additive down the hierarchy: each role INHERITS every
 * permission from the roles below it, plus any it adds explicitly.
 *
 * Owner is a special case: it receives every permission by construction.
 */
const USER_PERMISSIONS: Permission[] = [];

const MODERATOR_PERMISSIONS: Permission[] = [
  "hide_video",
  "unhide_video",
  "approve_content",
  "reject_content",
  "moderate_reports",
  "view_moderation_history",
];

const ADMIN_PERMISSIONS: Permission[] = [
  "delete_video",
  "restore_video",
  "archive_video",
  "unarchive_video",
  "feature_video",
  "pin_video",
  "edit_video_metadata",
  "edit_halal_score",
  "override_ai_decision",
  "remove_from_surface",
  "manage_channels",
  "ban_channel",
  "manage_categories",
  "manage_tags",
  "manage_users",
  "access_admin_dashboard",
  "view_analytics",
];

// Owner gets everything.
const OWNER_PERMISSIONS: Permission[] = [...PERMISSIONS];

/** Fully expanded role → Set<Permission> map (inheritance applied). */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  user: new Set(USER_PERMISSIONS),
  moderator: new Set([...USER_PERMISSIONS, ...MODERATOR_PERMISSIONS]),
  admin: new Set([
    ...USER_PERMISSIONS,
    ...MODERATOR_PERMISSIONS,
    ...ADMIN_PERMISSIONS,
  ]),
  owner: new Set(OWNER_PERMISSIONS),
};

// ---------------------------------------------------------------------------
// Authorization service (framework-agnostic, pure functions)
// ---------------------------------------------------------------------------

export interface Principal {
  id: string | null;
  role: Role;
}

export const ANONYMOUS: Principal = { id: null, role: "user" };

/** Does the principal hold `permission`? Default deny. */
export function can(principal: Principal | null, permission: Permission): boolean {
  if (!principal || !principal.id) return false;
  const perms = ROLE_PERMISSIONS[principal.role];
  return perms.has(permission);
}

/** Does the principal hold ALL of the listed permissions? */
export function canAll(
  principal: Principal | null,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((p) => can(principal, p));
}

/** Does the principal hold AT LEAST ONE of the listed permissions? */
export function canAny(
  principal: Principal | null,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((p) => can(principal, p));
}

/** Legacy tier check ("at least X"). Prefer `can()` where possible. */
export function hasMinRole(principal: Principal | null, min: Role): boolean {
  if (!principal || !principal.id) return false;
  return ROLE_RANK[principal.role] >= ROLE_RANK[min];
}

export class AuthorizationError extends Error {
  constructor(
    public readonly permission: Permission,
    public readonly principal: Principal | null,
  ) {
    super(
      `Permission denied: ${permission} for role=${principal?.role ?? "anonymous"}`,
    );
    this.name = "AuthorizationError";
  }
}

/** Throws AuthorizationError if the principal lacks the permission. */
export function requirePermission(
  principal: Principal | null,
  permission: Permission,
): asserts principal is Principal {
  if (!can(principal, permission)) {
    throw new AuthorizationError(permission, principal);
  }
}
