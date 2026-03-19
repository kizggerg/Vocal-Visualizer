# ADR-003: Frontend Technology Stack

## Status: Proposed

## Context

The MVP is a fully client-side application (no backend) that uploads an audio file, analyzes pitch in the browser, and renders a pitch contour visualization. Gate 1 established the client-side architecture, Chart.js for charting, and pitchfinder/YIN for pitch detection. This ADR formalizes the remaining technology decisions: language, framework, build tool, test runner, and CSS approach.

All decisions are evaluated against ADR-001 foundational principles, with Simplicity First (Principle 1) and AI-Agent Friendly (Principle 4) as the primary differentiators for this category of decision.

## Decisions

### Language: TypeScript (strict mode)

TypeScript is the only language considered. The alternatives (plain JavaScript, Flow) are strictly inferior for this project:

- **Type safety** catches bugs at compile time that would otherwise surface at runtime -- especially important for the data pipeline (audio samples, pitch arrays, chart data).
- **AI-agent code generation** is measurably better with TypeScript. AI models produce more correct code when types constrain the output.
- **IDE support** provides autocompletion and inline documentation for the port interfaces, which accelerates implementation.
- **Mainstream adoption** -- TypeScript is the default for new frontend projects. Well-documented, well-understood. (Principle 4)

Configuration: `strict: true` in `tsconfig.json`. No `any` escape hatches without a justifying comment.

### Framework: React 18+

| Option | Bundle Size (gzipped) | Ecosystem Size | AI Training Corpus | Learning Curve | Verdict |
|--------|----------------------|----------------|-------------------|----------------|---------|
| **React 18** | ~42 KB (react + react-dom) | Largest | Largest by significant margin | Low (for AI agents) | **Selected** |
| Preact | ~4 KB | Small | Small | Low | Rejected |
| Vue 3 | ~33 KB | Large | Large but smaller than React | Low | Rejected |
| Svelte 4 | ~2 KB (runtime) | Medium | Medium | Medium (compiler model) | Rejected |
| Vanilla TS | 0 KB | N/A | N/A | N/A | Rejected |

**Why React:**

1. **AI-agent friendliness is the decisive factor.** React has the largest representation in AI training data by a wide margin. AI agents generate more correct, more idiomatic React code than any alternative. For a project built entirely by AI agents (Principle 4), this is the single most important consideration.

2. **Ecosystem and documentation.** React's ecosystem (tooling, libraries, community answers) is unmatched. When an agent encounters an issue, the probability of finding a documented solution is highest with React.

3. **Chart.js integration.** The `react-chartjs-2` wrapper is the most widely used Chart.js integration, well-maintained and well-documented. Other frameworks have Chart.js bindings, but none as mature.

4. **Bundle size is acceptable.** At ~42 KB gzipped, React + ReactDOM fits comfortably within the 500 KB budget. The total estimated bundle is:
   - React + ReactDOM: ~42 KB
   - Chart.js + react-chartjs-2: ~65 KB
   - pitchfinder: ~15 KB
   - Application code: ~20-30 KB
   - **Total: ~145 KB gzipped** -- well under 500 KB.

**Why not the alternatives:**

- **Preact:** 10x smaller bundle, API-compatible with React. However, documentation and AI training data are a fraction of React's. The 38 KB savings (42 KB vs 4 KB) is immaterial when the total bundle is ~145 KB against a 500 KB budget. Saving bytes we do not need to save at the cost of AI-agent effectiveness violates Principle 1 (Simplicity First -- the simplest *development* path wins, not the smallest bundle).

- **Vue 3:** A strong framework with good documentation. Rejected because React's AI training corpus is larger, and there is no technical advantage Vue offers for this specific application. Choosing Vue would be a lateral move with slightly worse AI-agent support.

- **Svelte 4:** Smallest runtime, excellent performance. Rejected because its compiler-based model is less mainstream, has a smaller AI training corpus, and its patterns are less transferable. The performance advantage is irrelevant for an app rendering one chart.

- **Vanilla TypeScript (no framework):** The "simplest" option in terms of dependencies, but the most complex in terms of implementation. Without a framework, we must hand-roll component rendering, state management, DOM updates, and event handling. This shifts complexity from dependencies to application code, which is harder to maintain and harder for AI agents to generate correctly. For an application with multiple UI states (upload, processing, results, error), a component framework pays for itself immediately.

### Build Tool: Vite

Vite is selected for the following reasons:

- **Zero-config for React + TypeScript.** `npm create vite@latest -- --template react-ts` produces a working project in seconds. No webpack configuration, no babel configuration, no manual setup. (Principle 1)
- **Fast development server** with hot module replacement (HMR). Sub-second updates during development.
- **Optimized production builds** via Rollup under the hood. Tree-shaking, code splitting, and minification are automatic.
- **Native ESM** in development -- no bundling step during dev, which means instant server start.
- **Mainstream adoption.** Vite is the default build tool for React, Vue, and Svelte projects. Well-documented, well-supported by AI agents. (Principle 4)

Alternatives considered:
- **Webpack:** More mature but significantly more complex to configure. Vite's zero-config approach is superior for this project. (Principle 1)
- **esbuild (standalone):** Fastest bundler, but lacks Vite's dev server, HMR, and plugin ecosystem. Using esbuild directly requires more manual setup.
- **Parcel:** Zero-config like Vite, but smaller community and less AI training data.

### Test Runner: Vitest

Vitest is selected because:

- **Native Vite integration.** Uses the same configuration, the same transform pipeline, and the same module resolution as the application. No duplicate configuration. (Principle 1)
- **Jest-compatible API.** `describe`, `it`, `expect` -- the patterns AI agents know best. Migration to/from Jest is trivial.
- **Fast.** Runs tests in parallel with near-instant startup. Uses Vite's transform pipeline, so TypeScript and JSX work without additional setup.
- **Built-in features:** Mocking, code coverage (via v8 or istanbul), snapshot testing, DOM testing (via jsdom or happy-dom).

Alternatives considered:
- **Jest:** The incumbent standard. Requires separate TypeScript transform configuration (ts-jest or @swc/jest), which duplicates what Vite already does. More configuration for the same result. (Principle 1 -- Vitest is simpler when already using Vite.)

### CSS Approach: CSS Modules

CSS Modules are selected because:

- **Zero additional dependencies.** Vite supports CSS Modules natively -- any file named `*.module.css` is automatically scoped. No library to install, no configuration to write. (Principle 1)
- **Scoped by default.** Class names are locally scoped to the component, preventing style collisions without runtime overhead.
- **Standard CSS syntax.** AI agents generate correct CSS more reliably than utility-class frameworks. No custom syntax to learn.
- **Type safety.** With `typescript-plugin-css-modules` (dev dependency only), TypeScript can type-check CSS class references.

Alternatives considered:
- **Tailwind CSS:** Popular utility-first framework. Rejected because it adds a build step, a configuration file, a PostCSS dependency, and a non-standard authoring pattern. For an MVP with ~5 components, the overhead is not justified. (Principle 1)
- **Plain CSS (global):** Simpler than CSS Modules but risks style collisions as the application grows. CSS Modules add scoping at zero cost.
- **CSS-in-JS (styled-components, emotion):** Adds runtime overhead and bundle size for style generation. No benefit over CSS Modules for this application.

### Charting: Chart.js 4.x with react-chartjs-2

Already decided in Gate 1 architect review. Formalized here:

- **Chart.js 4.x** (~60 KB gzipped) for the charting engine.
- **react-chartjs-2** (~5 KB gzipped) as the React wrapper. This is the standard integration used in virtually all React + Chart.js examples, well-documented and well-supported.
- Supports line/scatter charts, custom Y-axis ticks (note names), time-based X-axis, `null` gaps for silence, and hover tooltips.

### Pitch Detection: pitchfinder with YIN algorithm

Already decided in Gate 1 architect review. Formalized here:

- **pitchfinder** (~15 KB gzipped) providing the YIN algorithm for monophonic vocal pitch detection.
- Pure JavaScript, no native dependencies, works directly with `Float32Array` from the Web Audio API.
- Maintenance risk acknowledged (single maintainer, infrequent releases). Mitigated by: the YIN algorithm is stable and well-understood (~200 lines), the library has no external dependencies, and it can be vendored or reimplemented if abandoned.

## Consequences

### Positive

- The entire technology stack is mainstream, well-documented, and optimally supported by AI agents.
- Total estimated bundle size (~145 KB gzipped) is well under the 500 KB budget, leaving room for growth.
- Zero-config development experience: `npm create vite`, install dependencies, start coding.
- All tools work together without configuration friction (Vite + Vitest + CSS Modules + TypeScript).
- Every technology choice can be justified by a single principle: it is the simplest, most mainstream option that meets the requirement.

### Negative

- React's 42 KB is larger than Preact's 4 KB. This is an acceptable trade-off given the 500 KB budget and the AI-agent productivity benefit.
- CSS Modules require one file per component for styles (as opposed to co-located styles in CSS-in-JS). For ~5 MVP components, this is immaterial.
- pitchfinder's maintenance status is a long-term risk. Acceptable for MVP; the port/adapter boundary allows a swap if needed.

### Neutral

- The stack is deliberately conventional. There is nothing novel or cutting-edge. This is intentional per ADR-001 Principle 1 (boring, proven technology).
