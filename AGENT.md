# Context for AI Assistant

## Summary of project 
The Neoxi project is a financial tracking system
designed to streamline the categorization and analysis of spending data.
The system utilizes advanced input methods,
accepting financial information both through natural language processing
of text messages and through the ingestion of external file "Artifacts"
limited to .txt and text-only .pdf formats.

Core functionality includes automatically generating categorized spending reports
and proactively suggesting new spending categories
to the user when a known expense type does not fit into an existing category structure.

## Tech Stack Rules:
- Use Drizzle ORM (no TypeORM).
- All database interactions must go through Repositories in `packages/database`.
- Use NestJS modules and Dependency Injection.
- Package Manager pnpm
- Monorepo Tool Turborepo
- ORM: Drizzle (Strictly no TypeORM)
- Database: PostgreSQL + pgvector
- Workflow: BullMQ for async AI processing

## Coding Standards and Rules
Database Interactions:
- Always use the Repository pattern located in `packages/database`.
- All schema changes must be done in `packages/database/src/schema.ts`.
- Use `drizzle-kit` for migrations.

AI and RAG Flow:
- AI logic resides strictly in `apps/api-ai`.
- Service 1 (`api-gateway`) only handles parsing (LangChain), user api and job creation.
- All embeddings generation and vector searches happen in `api-ai`.

Type Safety:
- Strict TypeScript.
- Use shared types from `packages/shared-types`.
- No `any` type usage. Use Zod for runtime validation of LLM outputs.

Communication:
- Use WebSockets for real-time AI status updates from `api-gateway` to Client.
- Use BullMQ for inter-service communication (Producer in Gateway, Consumer in AI-Worker).

## Project Map
- `apps/web`: Next.js frontend.
- `apps/api-gateway`: Main API, file upload, auth.
- `apps/api-ai`: Worker for LLM orchestration and RAG.
- `packages/database`: Drizzle schemas and Repository classes.
