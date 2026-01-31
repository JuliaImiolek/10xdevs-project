# 10x Astro Starter

A modern, opinionated starter template for building fast, accessible, and AI-friendly web applications.

## Tech Stack

- [Astro](https://astro.build/) v5.5.5 - Modern web framework for building fast, content-focused websites
- [React](https://react.dev/) v19.0.0 - UI library for building interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4.0.17 - Utility-first CSS framework

### Testing

- **Unit tests**: [Vitest](https://vitest.dev/) — testy jednostkowe TypeScript/React (integracja z Vite/Astro, ESM, szybkie uruchomienie). [React Testing Library](https://testing-library.com/react) — testy komponentów React (zachowanie i dostępność). Opcjonalnie [MSW](https://msw.io/) (Mock Service Worker) lub `vi.fn()`/`vi.mock` do mockowania HTTP/API i `fetch`.
- **E2E tests**: [Playwright](https://playwright.dev/) — testy end-to-end w przeglądarce (wiele przeglądarek, trwałe sesje, cookies; dopasowanie do Astro SSR).
- **Coverage**: Vitest `--coverage` (v8/istanbul) dla raportu pokrycia (`src/lib`, `src/components`, `src/pages/api`).

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/przeprogramowani/10x-astro-starter.git
cd 10x-astro-starter
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

### Local development with Supabase (generations & flashcards)

Auth is not implemented; the app uses a default user ID. For generations and flashcards to save to the database:

1. Start Supabase locally: `npx supabase start`
2. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env` (from `npx supabase status` → Secret key)
3. Seed the default user once: `npm run seed:user`

After that, `DEFAULT_USER_ID` (from `.env` or fallback in code) will exist in `auth.users` and FK constraints will pass.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run seed:user` - Seed default user in Supabase auth (required once for generations and flashcards; needs `SUPABASE_SERVICE_ROLE_KEY` in `.env`)
- `npm run test` - Run unit tests (Vitest) once
- `npm run test:watch` - Run unit tests in watch mode
- `npm run test:ui` - Run Vitest UI (visual test runner)
- `npm run test:coverage` - Run unit tests with coverage report
- `npm run test:e2e` - Run E2E tests (Playwright, Chromium)
- `npm run test:e2e:ui` - Run E2E tests with Playwright UI

### Testing setup

- **Unit (Vitest)**: `npm run test`. Tests live in `src/**/*.test.{ts,tsx}` and `src/**/*.spec.{ts,tsx}`. Setup: `vitest.setup.ts`; config: `vitest.config.ts` (jsdom, React Testing Library).
- **E2E (Playwright)**: First time run `npx playwright install chromium`. Before E2E run `npm run build` (Playwright starts `preview` and uses `http://localhost:4321`). Tests and Page Objects: `e2e/`.

## Project Structure

```md
.
├── src/
│   ├── layouts/    # Astro layouts
│   ├── pages/      # Astro pages
│   │   └── api/    # API endpoints
│   ├── components/ # UI components (Astro & React)
│   └── assets/     # Static assets
├── public/         # Public assets
```

## AI Development Support

This project is configured with AI development tools to enhance the development experience, providing guidelines for:

- Project structure
- Coding practices
- Frontend development
- Styling with Tailwind
- Accessibility best practices
- Astro and React guidelines

### Cursor IDE

The project includes AI rules in `.cursor/rules/` directory that help Cursor IDE understand the project structure and provide better code suggestions.

### GitHub Copilot

AI instructions for GitHub Copilot are available in `.github/copilot-instructions.md`

### Windsurf

The `.windsurfrules` file contains AI configuration for Windsurf.

## Contributing

Please follow the AI guidelines and coding practices defined in the AI configuration files when contributing to this project.

## License

MIT
