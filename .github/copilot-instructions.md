# Copilot Instructions for tracking-expenses-vehicles

## Project Overview
- This is a React + Vite web application for fleet and workshop management ("FleetFlow").
- Main features: vehicle expenses, costing, workshop jobs, rentals, SLAs, reports, maintenance, user authentication/authorization.
- UI uses Radix UI, Tailwind CSS, and custom components in `src/components/ui`.
- Data is managed via Supabase (`@supabase/supabase-js`), with user profiles and permissions in the `approved_users` table.

## Architecture & Patterns
- Routing is handled in `src/App.jsx` using `react-router-dom`, with route guards (`ProtectedRoute`, `AdminRoute`) enforcing permissions.
- Auth context is provided by `src/contexts/SupabaseAuthContext.jsx`.
- Layout is managed by `src/components/layouts/DashboardLayout.jsx` (sidebar navigation, permission-based links).
- Pages are in `src/pages/`, grouped by domain (rental, sla, etc.).
- Utility functions for export (PDF/CSV) in `src/lib/exportUtils.js`.
- Tailwind utility merging via `src/lib/utils.js` (`cn` function).
- Custom Vite plugins for visual editing in `plugins/visual-editor/` (used in dev mode).

## Developer Workflows
- **Start dev server:** `npm run dev`
- **Build:** `npm run build` (runs `tools/generate-llms.js` before Vite build)
- **Preview:** `npm run preview`
- **Export page metadata:** `tools/generate-llms.js` (extracts Helmet info from pages, outputs to `public/llms.txt`)
- **Auth:** Use Supabase credentials; super admin is `erich.oberholzer@gmail.com` (full access).

## Conventions & Integration
- Use `@` alias for `src/` in imports (see Vite config).
- Permission checks: `userProfile.is_admin` or `userProfile.permissions` array.
- All navigation and page access is permission-driven; update `navItems` in `DashboardLayout.jsx` for new sections.
- Data export: use `downloadAsPdf` and `downloadAsCsv` from `exportUtils.js`.
- UI: Prefer Radix UI and custom components in `src/components/ui`.
- Environment variables for Supabase: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Key Files & Directories
- `src/App.jsx` — Routing, guards
- `src/contexts/SupabaseAuthContext.jsx` — Auth logic
- `src/components/layouts/DashboardLayout.jsx` — Main layout/navigation
- `src/lib/exportUtils.js` — Export utilities
- `tools/generate-llms.js` — Page metadata extraction
- `plugins/visual-editor/` — Dev-only visual editing plugins

## Example Patterns
- **Permission check:**
  ```js
  userProfile.is_admin || userProfile.permissions.includes('costing')
  ```
- **Export PDF:**
  ```js
  downloadAsPdf('Report', headers, data)
  ```
- **Route guard usage:**
  ```jsx
  <ProtectedRoute requiredPermission="rental" element={<ViewRentalExpenses />} />
  ```

---

If any section is unclear or missing, please specify what needs improvement or additional detail.
