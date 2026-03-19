# ADR-004: Project Structure

## Status: Proposed

## Context

The MVP is a client-side React + TypeScript application following ports-and-adapters (hexagonal) architecture per ADR-001 Principle 7. We need a directory layout that:

1. Enforces the dependency rule: domain logic never imports from infrastructure/adapters.
2. Makes module boundaries explicit and visible in the file system.
3. Is simple enough for a ~5-component MVP without premature abstraction.
4. Is predictable for AI agents to navigate and extend. (Principle 4)

The application has four identified ports from the Gate 1 architect review:
- **FileValidator** -- validates format, size, and duration constraints.
- **AudioDecoder** -- decodes audio files to PCM sample data.
- **PitchAnalyzer** -- extracts a pitch time-series from PCM samples.
- **Visualization** -- renders a pitch contour chart from pitch data.

## Decision

### Directory Layout

```
vocal-visualizer/
|-- public/                          # Static assets served as-is
|   |-- favicon.ico
|-- src/
|   |-- domain/                      # Domain layer: types, ports, pure logic
|   |   |-- types.ts                 # Core data types (PitchDataPoint, AudioMetadata, etc.)
|   |   |-- ports.ts                 # Port interfaces (FileValidator, AudioDecoder, etc.)
|   |   |-- pitch-utils.ts           # Pure functions: Hz-to-note conversion, contour filtering
|   |
|   |-- adapters/                    # Adapter layer: implementations of ports
|   |   |-- file-validator.ts        # FileValidator implementation (format, size, duration checks)
|   |   |-- web-audio-decoder.ts     # AudioDecoder implementation (Web Audio API)
|   |   |-- yin-pitch-analyzer.ts    # PitchAnalyzer implementation (pitchfinder + YIN)
|   |   |-- chartjs-visualization.ts # Visualization data preparation (Chart.js dataset formatting)
|   |
|   |-- components/                  # React UI components
|   |   |-- App.tsx                  # Root component, state machine, orchestration
|   |   |-- App.module.css
|   |   |-- UploadArea.tsx           # File upload (file picker + drag-and-drop)
|   |   |-- UploadArea.module.css
|   |   |-- ProcessingStatus.tsx     # Analysis-in-progress feedback
|   |   |-- ProcessingStatus.module.css
|   |   |-- PitchContour.tsx         # Chart.js pitch contour chart
|   |   |-- PitchContour.module.css
|   |   |-- ErrorMessage.tsx         # Error display with retry action
|   |   |-- ErrorMessage.module.css
|   |
|   |-- main.tsx                     # Entry point: renders App into DOM
|   |-- vite-env.d.ts               # Vite type declarations
|
|-- tests/                           # Test files (mirrors src/ structure)
|   |-- domain/
|   |   |-- pitch-utils.test.ts
|   |   |-- ports.test.ts           # Contract tests for port interfaces
|   |-- adapters/
|   |   |-- file-validator.test.ts
|   |   |-- yin-pitch-analyzer.test.ts
|   |-- components/
|   |   |-- App.test.tsx
|   |   |-- UploadArea.test.tsx
|   |   |-- PitchContour.test.tsx
|   |   |-- ErrorMessage.test.tsx
|
|-- index.html                       # Vite entry HTML
|-- package.json
|-- tsconfig.json
|-- tsconfig.node.json               # TypeScript config for Vite config file
|-- vite.config.ts
|-- vitest.config.ts                 # Or vitest section in vite.config.ts
|-- biome.json                       # Linting and formatting configuration (Biome)
|-- .gitignore
|-- README.md
```

### Module Boundaries and Dependency Rules

```
  components/ ──imports──> domain/
       |                      ^
       |                      |
       +──imports──> adapters/ ──imports──> domain/
```

**The dependency rule:**

| Layer | May Import From | Must Not Import From |
|-------|----------------|---------------------|
| `domain/` | Nothing (no imports from other layers) | `adapters/`, `components/`, external libraries |
| `adapters/` | `domain/` (for types and port interfaces) | `components/` |
| `components/` | `domain/` (for types), `adapters/` (for adapter instances) | -- |

**Key constraint:** The `domain/` directory has zero imports from `adapters/`, `components/`, or third-party libraries. It contains only TypeScript types, interfaces, and pure functions. This is the innermost ring of the hexagonal architecture.

Adapters import the port interfaces from `domain/ports.ts` and implement them using specific libraries (Web Audio API, pitchfinder, Chart.js). Components wire adapters to ports at the application boundary (`App.tsx`).

### Why This Structure

**Flat, not nested.** Three top-level directories under `src/` (`domain/`, `adapters/`, `components/`) rather than a deeper hierarchy. For an MVP with ~10 source files, deeper nesting (e.g., `src/core/domain/ports/audio/`) adds navigation overhead with no organizational benefit. (Principle 1 -- simplest structure that enforces the dependency rule.)

**Tests outside src/.** Tests live in a parallel `tests/` directory rather than co-located with source files. This keeps the `src/` directory clean and makes it easy to exclude tests from production builds. The directory structure within `tests/` mirrors `src/` for easy navigation.

**One file per port, one file per adapter.** Each port interface is defined in `domain/ports.ts` (a single file -- there are only four interfaces). Each adapter is a separate file in `adapters/`. This makes port-to-adapter mapping explicit and visible.

**Components are flat.** All components live directly in `components/` rather than in nested subdirectories. For ~5 components, a flat layout is simpler to navigate. If the component count grows beyond ~10, subdirectories can be introduced.

### Adapter Wiring

Adapters are instantiated and wired to ports in `App.tsx`. There is no dependency injection framework. The wiring is explicit:

```typescript
// In App.tsx (simplified)
import { validateFile } from '../adapters/file-validator';
import { decodeAudio } from '../adapters/web-audio-decoder';
import { analyzePitch } from '../adapters/yin-pitch-analyzer';

// Use adapters directly -- no DI container, no factory pattern.
// The port interfaces ensure type safety at compile time.
```

This is the simplest wiring approach. A DI container or factory pattern would be premature abstraction for four adapters. If the adapter count grows or we need to swap implementations at runtime (e.g., client-side vs. server-side pitch analysis), we can introduce a simple factory at that point. (Rule of Three -- ADR-001 Principle 1.)

### File Naming Conventions

| Convention | Example | Rationale |
|-----------|---------|-----------|
| Kebab-case for all files | `pitch-utils.ts`, `file-validator.ts` | Consistent, filesystem-safe, no case-sensitivity issues |
| `.tsx` for files with JSX | `App.tsx`, `PitchContour.tsx` | TypeScript convention |
| `.ts` for non-JSX files | `ports.ts`, `types.ts` | TypeScript convention |
| `.module.css` for scoped styles | `App.module.css` | Vite CSS Modules convention |
| `.test.ts` / `.test.tsx` for tests | `pitch-utils.test.ts` | Vitest default pattern |
| PascalCase for React components | `UploadArea.tsx` | React convention |
| camelCase for non-component files | `pitch-utils.ts` | Standard TypeScript convention |

Note: React component files use PascalCase (`UploadArea.tsx`) because this is the universal React convention that AI agents expect. All non-component files use kebab-case.

## Consequences

### Positive

- The dependency rule is enforced by directory structure -- a developer (or AI agent) can verify correctness by checking imports.
- The flat structure is easy to navigate for an MVP with ~10 source files.
- Port interfaces in `domain/` are the stable core; adapters can be swapped without touching domain logic.
- File naming is predictable and consistent, making it easy for AI agents to find and create files. (Principle 4)

### Negative

- All port interfaces in a single `ports.ts` file may feel crowded if the interface count grows beyond ~8. Acceptable for four interfaces. Split when needed.
- The flat `components/` directory does not scale beyond ~10 components. Acceptable for MVP scope.
- Tests in a separate `tests/` directory require developers to navigate between two locations. Mitigated by the parallel directory structure.

### Neutral

- This structure is conventional for small-to-medium React applications. It will look familiar to any developer or AI agent that has worked with React projects.
