# Project Rules & Instructions

- **Package Manager**: Always use `bun` (and `bunx`) instead of `npm`, `npx`, `yarn`, or `pnpm` for installing packages, running scripts, running tests, and executing commands (e.g., `bun run dev`, `bun test` or `bun run test`, `bun run typecheck`, `bun run lint`, `bun add <package>`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
