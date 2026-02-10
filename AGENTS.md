# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains plugin source code: entry (`src/index.ts`), API helpers (`src/api.ts`), shared utilities (`src/libs/`), and Svelte UI components (`src/libs/components/`, `src/*.svelte`).
- `public/i18n/` stores locale files (`en_US.json`, `zh_CN.json`) used at runtime.
- `scripts/` holds build and maintenance scripts (`make_dev_link.js`, `make_install.js`, `update_version.js`).
- Root metadata and build config live in `plugin.json`, `vite.config.ts`, `tsconfig*.json`, and `svelte.config.js`.
- `.github/workflows/release.yml` builds and publishes `package.zip` on `v*` tags.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies (Node 20+ recommended by CI).
- `pnpm dev`: watch build for local plugin development (`dev/` output with sourcemaps).
- `pnpm build`: production build via Vite.
- `pnpm make-link` / `pnpm make-link-win`: create symlink into a SiYuan workspace plugin directory.
- `pnpm make-install`: build and run install packaging script.
- `pnpm update-version`: sync version values before release.

## Coding Style & Naming Conventions
- Use TypeScript + Svelte with 4-space indentation (match existing files).
- Prefer `camelCase` for variables/functions, `PascalCase` for classes/components, and `UPPER_SNAKE_CASE` for constants.
- Keep module files focused: UI in `.svelte`, API wrappers in `src/api.ts`, shared logic in `src/libs/`.
- No dedicated formatter/linter is configured; keep imports ordered, types explicit on public functions, and avoid broad refactors in unrelated files.

## Testing Guidelines
- Automated tests are not set up yet (`test` script is absent).
- Before opening a PR, validate with `pnpm build` and manual checks in SiYuan (desktop and, if changed, mobile behavior).
- For future tests, place specs under `src/**/__tests__/` or alongside modules as `*.test.ts`.

## Commit & Pull Request Guidelines
- Current history is minimal (`Initial commit`), so use clear Conventional Commit style moving forward (for example: `feat: add reminder dialog validation`).
- Keep commits scoped and atomic; include config/version updates in the same commit only when required.
- PRs should include: purpose, key changes, manual test steps, linked issue (if any), and screenshots/GIFs for UI changes.

## Security & Plugin API Notes
- Do not use Node/Electron `fs` APIs for SiYuan `data/` content. Use kernel endpoints under `/api/file/*`.
- Keep `plugin.json` fields (`name`, `version`, `minAppVersion`, i18n display text) consistent with release artifacts.
