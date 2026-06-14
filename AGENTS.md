# DashTab Development Guidelines

## Project Shape

DashTab is a private Chrome Extension that replaces the New Tab page with an Angular dashboard.

- Use Angular standalone components.
- Keep the app Angular-first, TypeScript-first, and Manifest V3-compatible.
- Do not add SSR/server code.
- Keep Chrome permissions minimal and only add permissions when a feature needs them.
- Load the unpacked extension from the built browser output folder containing `manifest.json`.

## Architecture

- Put feature-owned UI and state under `src/app/features/<feature>/`.
- Put shell composition under `src/app/layout/`.
- Keep layout components focused on placement and composition.
- Do not put feature business logic in layout components.
- Use services for stateful feature logic, timers, persistence, and derived state.
- Components should mostly handle presentation and user actions.
- Prefer explicit state transitions over generic toggles for important behavior.

## State And Persistence

- Start local-first.
- Store small local state in `localStorage` through feature services.
- Keep persistence behind services so it can later move to `chrome.storage.sync`.
- Do not add Firebase/backend sync until the feature truly needs larger cross-device data.
- Store related state as one JSON object under one key where practical.
- Use timestamp-based timers instead of decrementing counters when time accuracy matters.

## Styling

- Use Tailwind utility classes where they keep templates readable.
- Keep semantic CSS classes for complex widgets, repeated visual systems, animations, and custom geometry.
- A healthy mix is preferred over forcing every style into the template.
- Avoid huge utility strings that make templates hard to scan.
- Use component SCSS for widget-specific shapes, transitions, keyframes, and CSS variables.
- If using Tailwind `@apply` in component SCSS with Tailwind v4, add a proper `@reference` to `src/styles.scss`.
- Keep UI controls compact and dashboard-like, not landing-page-like.
- Preserve existing visual behavior unless a change explicitly asks for redesign.

## Feature Conventions

- Timer features should survive tab reloads, browser throttling, and sleep where practical.
- Timer services should model statuses explicitly, such as `idle`, `running`, `paused`, `waiting`, or `complete`.
- Widgets should use concise labels when the icon/context already explains the feature.
- Keep controls minimal; avoid duplicate information in multiple places.
- Acknowledgement-based flows should not silently advance if user action is expected.

## Settings

- Put dashboard settings in `SettingsService`.
- Keep settings local-first for now.
- Settings should cover configurable values such as focus duration and move durations.
- Avoid settings for things that are personal constants in this private extension unless requested.

## Verification

- Run `ng build` after meaningful code/template/style changes.
- Angular 22 requires Node `^22.22.3`, `^24.15.0`, or `>=26.0.0`.
- If the available Node is too old, use a temporary supported Node only for verification and remove it afterward.
- It is acceptable for the existing Sass `@import "tailwindcss"` deprecation warning to remain until intentionally addressed.
