# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style

- Comment only complex or non-obvious logic. Do not narrate straightforward code.

## Commands

```bash
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest unit/component tests
npm run setup        # Install deps + run DB migrations
npm run db:reset     # Reset SQLite database
```

To run a single test file: `npx vitest run src/path/to/file.test.ts`

## Stack

- **Next.js 15** App Router, **React 19**, **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**
- **Vercel AI SDK** (`ai`, `@ai-sdk/anthropic`) for streaming Claude responses
- **Prisma + SQLite** for users and projects (schema: `prisma/schema.prisma`)
- **Monaco Editor** for in-app code editing
- **Vitest + React Testing Library** for tests

## Architecture

UIGen is an AI-powered React component generator. Users describe components in a chat interface; Claude generates/edits code files in real-time with an instant live preview.

### Virtual File System

All files are stored **in memory** — no writes to disk. `src/lib/file-system.ts` implements an in-memory tree with CRUD and rename operations. The tree serializes to JSON and is persisted in the Prisma `Project.data` field. This is the core data model.

### AI Code Generation Flow

1. User message → `POST /api/chat` (Next.js route handler)
2. Route calls Claude via `streamText` with two tools: `str_replace_editor` (create/edit files) and `file_manager` (rename/delete)
3. Tool call results stream to the client
4. `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) handles incoming tool calls and applies mutations to the virtual FS
5. Preview iframe re-renders automatically

### Dual Context System

- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`): Owns the AI conversation, streaming state, and passes tool calls downstream
- **`FileSystemContext`**: Owns the virtual file tree, handles tool execution, notifies preview

These two contexts are the primary state layer — most components read from one of them.

### Live Preview

`src/lib/transform/jsx-transformer.ts` uses Babel (in-browser) to transpile JSX/TSX to plain JS, creates blob URLs, injects an import map, and loads the result into an `<iframe>`. Entry point lookup order: `App.jsx → App.tsx → index.jsx → index.tsx`. Only Tailwind CSS is supported — no CSS module imports.

### AI Provider

`src/lib/provider.ts` returns a real `@ai-sdk/anthropic` model if `ANTHROPIC_API_KEY` is set, otherwise falls back to a `MockLanguageModel` that returns a static component. Useful for offline development.

### Authentication

JWT sessions (7-day, httpOnly cookie), BCrypt password hashing. Middleware (`src/middleware.ts`) protects `/api/*` routes. Anonymous users can create and work on projects without an account; projects created anonymously have no `userId`.

## Key Files

| File | Role |
|------|------|
| `src/lib/file-system.ts` | In-memory virtual file tree |
| `src/lib/contexts/chat-context.tsx` | AI conversation state + streaming |
| `src/lib/contexts/file-system-context.tsx` | File state + tool call execution |
| `src/app/api/chat/route.ts` | AI endpoint: tools, streaming, DB persistence |
| `src/lib/transform/jsx-transformer.ts` | Babel JSX→JS transform + iframe preview |
| `src/lib/provider.ts` | Real vs. mock Anthropic model |
| `src/lib/tools/str-replace.ts` | `str_replace_editor` tool definition |
| `src/lib/tools/file-manager.ts` | `file_manager` tool definition |
| `src/lib/prompts/` | System prompt instructing Claude to use Tailwind, `@/` imports, create `App.jsx` first |
| `src/app/main-content.tsx` | Split-pane layout (chat | editor/preview) |
