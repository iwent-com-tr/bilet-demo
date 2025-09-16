# Element/Utility Memory (Lightweight)

This document tracks commonly needed UI elements/utilities to keep implementation consistent and discoverable.

## Core Utilities

- api client: `src/frontend/src/shared/apiClient.ts` (axios instance w/ baseURL + auth header)
- auth guard/hook: present (`src/frontend/src/context/AuthContext.tsx`)
- toast/notifications: present via `react-toastify`
- form validation: present via `yup`/`formik`

## UI Primitives (scaffolded)

- Button: `src/frontend/src/components/ui/Button.tsx`
- Input: `src/frontend/src/components/ui/Input.tsx`

Tests (smoke):
- `src/frontend/src/components/ui/Button.test.tsx`
- `src/frontend/src/components/ui/Input.test.tsx`

## Suggested Next Primitives

- Modal: accessible modal wrapper (focus trap, ESC close)
- Select: styled native/select-headless wrapper
- TextArea: standard spacing and error state
- Badge/Chip: statuses (success/warn/error)
- Spinner: small/large loading indicators
- Toast wrapper: project-specific presets around react-toastify

## Suggested Patterns

- Centralize all network calls via `apiClient` to simplify auth and error handling
- Use `baseUrl: "src"` absolute imports consistently (already configured in FE tsconfig)
- Keep design tokens in Tailwind config; consider extracting shared colors/spacing if needed

