# Café Stock & Sales Management App

## Overview

A lightweight web application for managing daily sales, stock, and revenue targets for a small café. The primary business goal is to track and achieve NPR 200,000 revenue per quarter. The app features a dashboard with sales metrics, sales entry forms, menu item management, and inventory tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, bundled via Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for page transitions and UI interactions
- **Charts**: Recharts for dashboard visualizations

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Design**: REST endpoints defined in `shared/routes.ts` with Zod schemas for validation
- **Build System**: esbuild for server bundling, Vite for client

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Tables**: 
  - `items` - Menu items with cost/selling prices
  - `sales` - Transaction records with item references
  - `stock` - Inventory tracking with opening/closing balances

### Key Design Patterns
- **Shared Types**: Schema and route definitions in `shared/` directory used by both client and server
- **Type-safe API**: Zod schemas validate both request inputs and response shapes
- **Monorepo Structure**: Client code in `client/`, server in `server/`, shared types in `shared/`
- **Currency Handling**: Prices stored as integers (cents/paisa) to avoid floating-point issues

### File Structure
```
├── client/src/          # React frontend
│   ├── pages/           # Route components (dashboard, sales, menu, stock)
│   ├── components/      # Reusable UI components
│   └── hooks/           # React Query hooks for API calls
├── server/              # Express backend
│   ├── routes.ts        # API endpoint handlers
│   ├── storage.ts       # Database operations
│   └── db.ts            # Database connection
└── shared/              # Shared types and schemas
    ├── schema.ts        # Drizzle table definitions
    └── routes.ts        # API route contracts with Zod
```

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and migrations
- **drizzle-kit**: Schema push with `npm run db:push`

### Third-Party Libraries
- **date-fns**: Date manipulation for sales/stock date filtering
- **Recharts**: Dashboard charts and sales trend visualizations
- **Framer Motion**: Smooth animations and page transitions
- **shadcn/ui**: Pre-built accessible UI components (dialogs, forms, tables)

### Development Tools
- **Vite**: Development server with HMR
- **Replit Plugins**: Runtime error overlay and cartographer for Replit environment