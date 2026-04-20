# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Working Style

### 1. Plan Before Building
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: save a memory with the pattern
- Write rules for yourself that prevent the same mistake
- Check memory at session start for relevant lessons

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Run `npm run check` after TypeScript changes
- Test Edge Functions logic before deploying
- Ask yourself: "Would a staff engineer approve this?"

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: step back and implement the proper solution
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user

### 7. Task Management
1. Write plan with checkable items for non-trivial work
2. Check in with user before starting implementation
3. Track progress — mark items complete as you go
4. High-level summary at each milestone
5. Capture lessons in memory after corrections

### Core Principles
- **Simplicity First**: Make every change as simple as possible. Minimal code impact
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards

---

## Project Overview

DeskPlanner (OhMyDesk) is a SaaS React SPA for managing coworking desk bookings. It provides a calendar interface for tracking desk availability, person assignments, meeting room bookings, flex plans, and revenue across multiple coworking spaces.

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run check

# Lint (type check without emit)
npm run lint
```

Deployment is automatic — Cloudflare Pages auto-builds and deploys on every push to `main` via the GitHub integration.

## Routing — trailing slash convention

`astro.config.mjs` sets `trailingSlash: 'ignore'`. Both `/path` and `/path/` work. **All internal hrefs should consistently use a trailing slash** (e.g. `href="/features/"`) — this keeps refresh-safety explicit and avoids active-nav comparison bugs.

- Static hrefs: `href="/features/"`, `href="/pricing/"`, `href="/signup/"`, `href="/login/"`, `href="/podcast/"`, `href="/compare/"`
- Dynamic hrefs: `href={`/features/${slug}/`}`, `href={`/compare/${slug}/`}`
- **Also applies to React Router**: `<Link to="/login/">`, `<Navigate to="/login/" />`, `navigate('/login/')`. Client-side navigation works without a slash, but refreshing the URL hits Astro's catchall and 404s.
- **The landing page has 3 link arrays to check** in `client/src/pages/landing.tsx`: desktop sticky nav, mobile drawer menu, and `pricingTiers` (the CTA `href` field). Grepping only `src/` misses all three.
- SPA-backed routes (`/signup/`, `/login/`) pass through `src/pages/[...slug].astro`; they still need the trailing slash for refresh-safety.
- Sitemap `<loc>` entries in `public/sitemap.xml` must also end with `/`.
- When computing active nav state by comparing current path to href, normalize (strip trailing slash from the href) before comparing. See `src/components/MarketingNav.astro`'s `isCurrent` for the pattern.

Grep pattern for regressions:
- `href="/(features|pricing|compare|login|signup|podcast)"` — double-quoted hrefs
- `'/(features|pricing|compare|login|signup|podcast)'` — single-quoted (data arrays, `navigate()`, `<Link to=>`)

## Architecture & Key Design Patterns

### Tech Stack
- **Marketing shell**: Astro 5 (SSG) at `src/pages/index.astro`, mounts the React landing as a `client:load` island
- **App**: React 18 + TypeScript + react-router-dom SPA in `client/src/`, mounted via `src/pages/[...slug].astro` as a `client:only` island
- **Build tool**: Vite (driven by Astro)
- **State**: TanStack Query
- **UI Components**: shadcn/ui (47 components in `/client/src/components/ui/`)
- **Backend**: Supabase (Auth, Postgres with RLS, Edge Functions)
- **Email**: Resend via Supabase Edge Functions
- **Validation**: Zod schemas in `/shared/schema.ts`
- **Deployment**: Cloudflare Pages (auto-deploy on push to `main`)

### Core Architectural Decisions

1. **Storage Abstraction Pattern**: All data operations go through `IDataStore` interface with implementations for:
   - LocalStorage (`/client/src/lib/dataStore.ts`) - for offline/demo use
   - Supabase (`/client/src/lib/supabaseDataStore.ts`) - for production use
   - Storage type is determined by `VITE_STORAGE_TYPE` environment variable

2. **Multi-Tenancy**: Organizations with RLS policies. `scopeQuery<T>` filters all queries by `org_id`. `public.get_user_org_ids()` SECURITY DEFINER function avoids RLS recursion.

3. **Organization Context Chain**: `OrganizationProvider` -> `OrgGate` -> `DataStoreProvider`. All data queries scoped by `organization_id`.

4. **Shared Schema**: Type definitions and Zod schemas in `/shared/schema.ts` ensure type safety and data validation throughout the application.

5. **Component Architecture**:
   - Business components in `/client/src/components/` (Calendar, BookingActions, etc.)
   - UI primitives from shadcn/ui in `/client/src/components/ui/`
   - All components use TypeScript interfaces for props

6. **Calendar System**:
   - Supports weekly/monthly views with desk availability tracking
   - Three booking statuses: Available, Booked, Assigned
   - Bulk operations via Ctrl+click and range selection
   - Real-time statistics calculation

7. **Role-Based Access**: `currentRole` exposed via `OrganizationContext`. Roles: `owner`, `admin`, `member`. Revenue/expenses hidden for non-owners. Team management owner-only.

### Data Model

```typescript
// Core entities (defined in /shared/schema.ts)
- DeskBooking: Complete booking with person, dates, pricing, title
- Desk: Room and desk number
- WaitingListEntry: Queue management for desk requests
- Client: Persistent member records with flex plan support
- Organization: Multi-tenant workspace with rooms, desks, settings
- OrganizationMember: User-org link with role (owner/admin/member)
```

### Path Aliases

The project uses these import aliases:
- `@/` -> `/client/src/`
- `@shared/` -> `/shared/`

### Key Files for Understanding Architecture

- `/client/src/lib/supabaseDataStore.ts` - Supabase data store with org-scoped queries
- `/client/src/contexts/OrganizationContext.tsx` - Org context with role, rooms, desks
- `/client/src/pages/desk-calendar.tsx` - Main calendar page with complex interaction logic
- `/shared/schema.ts` - All type definitions and validation schemas
- `/client/src/hooks/use-organization.ts` - Org CRUD hooks and membership queries
- `/client/src/hooks/use-team-members.ts` - Team invite/remove hooks
- `/client/src/router.tsx` - Route gating with auth/org/slug gates
- `/client/src/layouts/DashboardLayout.tsx` - Sidebar with role-based filtering

### Edge Functions

Located in `supabase/functions/`. Pattern: CORS handling, service role key for DB access, Resend for email.
- `flex-email` - Flex plan lifecycle emails
- `invite-manager` - Creates user account, adds to org, sends credentials

## Linear MCP

Linear is available via MCP (`mcp__linear-server__*`). Key usage:

- **List issues**: `list_issues` — filter by `state`, `priority` (1=Urgent, 2=High, 3=Normal, 4=Low), `team`
- **Get issue**: `get_issue` with issue ID (e.g. `DES-48`)
- **Create/update issue**: `save_issue` — use `state` (not `status`/`stateId`) to set status, e.g. `state: "Done"`
- **List statuses**: `list_issue_statuses` with `team: "Deskplanner"` to get state IDs and names
- **Team name**: `"Deskplanner"` (used in `team` param)
- **Mark done**: `save_issue` with `id: "DES-XX"` and `state: "Done"`

The MCP server can disconnect — if tools are unavailable, ask the user to run `/mcp` to reconnect.

## Testing

No test framework is currently configured. When implementing tests, consider the calendar interaction logic and data store abstraction as priority areas for coverage.
