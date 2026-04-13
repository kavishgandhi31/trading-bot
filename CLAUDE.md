# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Stack

- **Next.js 16** with App Router (`app/` directory)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4** (configured via `@tailwindcss/postcss` in `postcss.config.mjs`)

## Architecture

All routes live under `app/`. The App Router uses file-system routing — each folder with a `page.tsx` becomes a route.

- `app/layout.tsx` — root layout, sets up fonts (Geist) and global CSS
- `app/page.tsx` — home route (`/`)
- `app/globals.css` — global styles, Tailwind imports

Server Components are the default; add `"use client"` only when browser APIs or React hooks are needed.

## Rules

When I ask you any questions, don't just default to agreeing with it, I want you to be brutally blunt and honest about my approach and tell me if it's correct. If you think I'm wrong, then I want you to suggest better alternatives and talk through them with me. 