# Base44 Workspace Configuration

This directory contains the Base44 workspace configuration for the Continental Cattle Company Admin & Employee Portal.

## Structure

```
base44/
├── workspace.config.json      # Workspace configuration
├── modules/                   # Shared modules
└── plugins/                   # Custom plugins
```

## Workspace Modules

### UI Components (`src/components`)
Reusable React components based on Radix UI and Tailwind CSS.

### Hooks (`src/hooks`)
Custom React hooks for common patterns.

### Services (`src/services`)
API services and business logic.

### Utilities (`src/utils`)
Helper functions and utilities.

### Types (`src/types`)
TypeScript type definitions and interfaces.

## Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Type checking
npm run typecheck
```

## Dependencies

- **@base44/sdk** - Base44 SDK for app building
- **@base44/vite-plugin** - Vite plugin for Base44
- **React 18** - UI library
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Headless UI components
- **React Query** - Data fetching library
- **React Router** - Client-side routing

## Environment Setup

See parent directory `README.md` for setup instructions.
