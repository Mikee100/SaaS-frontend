# SaaS Platform Frontend

Next.js frontend for the SaaS Platform. This app now supports manifest-driven tenant composition and superadmin blueprint operations.

## Current Blueprint Rollout Status

This frontend currently includes:

- Effective manifest client integration
- Manifest-driven navigation rendering with fallback behavior
- Manifest-driven quick actions
- Blueprint dashboard widget registry and rendering
- Superadmin tenant blueprint management UI
- Superadmin blueprint preview and rollback controls

Roadmap and ticket tracking are in [../docs/BUSINESS_OS_BLUEPRINT_EXECUTION_BACKLOG.md](../docs/BUSINESS_OS_BLUEPRINT_EXECUTION_BACKLOG.md).

## Blueprint-Related UI Areas

Core shell composition:

- [src/components/UserContext.tsx](src/components/UserContext.tsx)
- [src/components/PlanBasedNav.tsx](src/components/PlanBasedNav.tsx)
- [src/app/QuickActions.tsx](src/app/QuickActions.tsx)
- [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx)
- [src/components/dashboard/BlueprintWidgetRegistry.tsx](src/components/dashboard/BlueprintWidgetRegistry.tsx)

Superadmin tenant operations:

- [src/app/(admin)/superadmin/tenants/[id]/page.tsx](src/app/(admin)/superadmin/tenants/[id]/page.tsx)

## Local Development

Install and run:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## API Dependencies for Blueprint Flow

The frontend expects the backend endpoints below:

- GET /tenant/configurations/manifest/effective
- GET /admin/blueprints
- GET /admin/tenants/:id/blueprint
- PUT /admin/tenants/:id/blueprint
- POST /admin/tenants/:id/blueprint/preview
- POST /admin/tenants/:id/blueprint/rollback

## Branch Promotion Flow

Frontend repository flow:

- feature/* -> staging -> master

Use compare links in GitHub to create PRs between each stage.
