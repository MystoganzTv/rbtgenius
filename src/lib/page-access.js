/**
 * Route-level gate for pages that only admins may open.
 *
 * This is defence in depth, not the actual protection. Every /api/admin route
 * is already behind `requireAdmin` on the server, which reads the role off the
 * session rather than off anything the client sends, and OwnerDashboard and
 * AdminMembers each re-check `user.role` before they render. What this adds is
 * that the component never mounts and its queries never fire for a non-admin
 * who types the URL. Keep all three; do not treat any one of them as the lock.
 *
 * The source of truth for "which pages are admin-only" is the navigation
 * config in src/components/layout/Sidebar.jsx, where those entries carry an
 * ADMIN or PRIVATE badge. That list is a React module full of JSX imports, so
 * it cannot be imported here without dragging the component tree into a plain
 * util. The set below is therefore a hand-kept mirror of it — if you add an
 * admin page to the sidebar, add it here too. `tests/page-access.test.js`
 * fails when the two drift apart.
 */
const ADMIN_ONLY_PAGES = new Set(["OwnerDashboard", "AdminMembers"]);

export function canAccessPage(pageKey, user) {
  return !ADMIN_ONLY_PAGES.has(pageKey) || user?.role === "admin";
}

export const ADMIN_ONLY_PAGE_KEYS = ADMIN_ONLY_PAGES;
