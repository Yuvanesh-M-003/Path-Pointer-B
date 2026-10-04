# Project Structure - path-pointer-backend-implementation

## Root Files
- `.env.local` - Environment variables (Supabase configuration)
- `drizzle.config.json` - Drizzle ORM configuration
- `eslint.config.mjs` - ESLint configuration
- `next.config.ts` - Next.js configuration
- `next-env.d.ts` - Next.js TypeScript definitions
- `package.json` - NPM dependencies and scripts
- `package-lock.json` - Locked dependency versions
- `postcss.config.mjs` - PostCSS configuration
- `tsconfig.json` - TypeScript configuration
- `vitest.config.ts` - Vitest testing framework configuration

## Source Directory (`src/`)

### `src/app/` - Next.js App Router
- `globals.css` - Global styles
- `layout.tsx` - Root layout component
- `page.tsx` - Home page

#### API Routes (`src/app/api/`)
- `dashboard/route.ts` - Dashboard data endpoint
- `goals/route.ts` - Goals list/create endpoint
- `goals/[id]/route.ts` - Goal detail/update endpoint
- `health/route.ts` - Health check endpoint
- `mastery/route.ts` - Mastery tracking endpoint
- `notifications/route.ts` - Notifications list endpoint
- `notifications/[id]/read/route.ts` - Mark notification as read
- `notifications/read-all/route.ts` - Mark all notifications as read
- `onboarding/route.ts` - User onboarding endpoint
- `problems/route.ts` - Problems list endpoint
- `problems/[id]/route.ts` - Problem detail endpoint
- `problems/[id]/solve/route.ts` - Submit problem solution
- `profile/route.ts` - User profile endpoint
- `progress/route.ts` - User progress tracking endpoint
- `recommendations/route.ts` - Personalized recommendations endpoint
- `roadmap/route.ts` - Learning roadmap endpoint
- `top150/route.ts` - Top 150 problems endpoint
- `topics/route.ts` - Topics list endpoint

### `src/db/` - Database
- `index.ts` - Database connection setup
- `schema.ts` - Drizzle ORM schema definitions
- `seed.ts` - Database seeding script

### `src/lib/` - Shared Libraries

#### Authentication (`src/lib/auth/`)
- `getCurrentUser.ts` - Get authenticated user and profile
- `isProfileComplete.ts` - Check if user profile is complete

#### API Utilities (`src/lib/api/`)
- `handler.ts` - Route handler helpers (authentication guards, rate limiting)

#### Business Logic Engines (`src/lib/engines/`)
- `analytics.ts` - Analytics calculations
- `dailyProgress.ts` - Daily progress tracking
- `dashboard.ts` - Dashboard data aggregation
- `goals.ts` - Goal logic and algorithms
- `goalsCrud.ts` - Goal CRUD operations
- `mastery.ts` - Mastery level calculations
- `notifications.ts` - Notification management
- `onboarding.ts` - User onboarding flow
- `problems.ts` - Problem management and filtering
- `profile.ts` - User profile management
- `recommendation.ts` - Recommendation algorithm
- `roadmap.ts` - Learning roadmap generation
- `solve.ts` - Problem solution handling
- `solvedStats.ts` - Statistics for solved problems
- `streak.ts` - Streak tracking and calculation
- `top150.ts` - Top 150 problems logic
- `topics.ts` - Topic management
- `weakTopics.ts` - Weak topic identification

#### Supabase Integration (`src/lib/supabase/`)
- `admin.ts` - Supabase admin client (service role)
- `client.ts` - Supabase browser client (public anon key)
- `server.ts` - Supabase server client with auth utilities

#### Type Definitions (`src/lib/types/`)
- `index.ts` - Shared TypeScript interfaces and types

#### Utilities (`src/lib/utils/`)
- `calculations.ts` - Mathematical calculations and algorithms
- `dates.ts` - Date/time utilities
- `errors.ts` - Custom error classes and error handling
- `rateLimit.ts` - Rate limiting utilities
- `response.ts` - API response formatting

#### Validation (`src/lib/validation/`)
- `common.ts` - Common validation schemas (Zod)
- `goals.ts` - Goal validation schemas
- `onboarding.ts` - Onboarding validation schemas
- `problems.ts` - Problem validation schemas
- `profile.ts` - Profile validation schemas
- `roadmap.ts` - Roadmap validation schemas

---

## Key Architecture Features

### Authentication
- Uses Supabase Auth with JWT tokens
- Server-side auth via `getServerAuthUser()`
- Route guards: `withAuth()` and `withOnboardedAuth()`
- User profiles stored in PostgreSQL with `auth_user_id` reference

### Database
- PostgreSQL via Supabase
- ORM: Drizzle (typed, lightweight)
- Schema-first approach with migration support

### API Structure
- Next.js App Router with Route Handlers
- Rate limiting on sensitive endpoints
- Centralized error handling with custom AppError
- JSON request/response serialization

### Business Logic
- Modular "engines" for each feature domain
- Separation of concerns (CRUD, algorithms, calculations)
- Reusable validation schemas (Zod)

### Frontend Integration Notes
- Client uses `PublicSupabaseConfig` (anon key only)
- All data access routed through backend API
- No direct browser-to-database connections
- Comment references: "Google OAuth sign-in" capability (requires Supabase configuration)

---

## Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_[KEY]
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

## Dependencies Summary
- **Framework**: Next.js 16.2.6
- **Database**: PostgreSQL (via Supabase), Drizzle ORM
- **Auth**: Supabase Auth, SSR support
- **Validation**: Zod
- **UI**: React 19, Tailwind CSS
- **Testing**: Vitest
- **Tooling**: TypeScript, ESLint, PostCSS
