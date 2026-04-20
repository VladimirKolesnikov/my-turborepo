# Neoxi Monorepo

This repository uses `pnpm` workspaces and Turborepo for three apps:

- `apps/web`: Next.js frontend
- `apps/api-gateway`: NestJS API gateway
- `apps/api-ai`: NestJS AI worker

Shared code lives in `packages/*`.

## Workspace Rules

- Use `workspace:*` for internal dependencies.
- Do not import code from another app.
- Share reusable code through `packages/*`.
- Internal packages must expose built files from `dist`, not raw source files.
- Run repo-wide commands from the root through Turbo.

## Commands

```sh
pnpm install
pnpm dev
pnpm lint
pnpm check-types
pnpm build
pnpm test
```

Run a single workspace with a filter:

```sh
pnpm turbo run build --filter=api-gateway
pnpm turbo run dev --filter=web
```

## Shared Packages

- `@repo/ui`: shared React components for the frontend
- `@repo/database`: Drizzle schema and database factory helpers
- `@repo/redis`: Redis configuration helpers
- `@repo/eslint-config`: shared ESLint presets
- `@repo/typescript-config`: shared TypeScript baselines
