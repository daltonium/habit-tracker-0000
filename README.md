# Habit Tracker

A habit-tracking web application for managing daily routines, recording completions, viewing calendar activity, and generating short AI-powered consistency insights.

Built with Next.js App Router, TypeScript, Tailwind CSS, Supabase, and Cohere, with deployment on Vercel.

> This README describes the implementation shared during development. Confirm environment variable names, authentication behavior, and API configuration against your current source code.

## Features

- Email and password authentication using Supabase.
- Email confirmation, password recovery, and password update flows.
- Daily dashboard with a completed-habits summary.
- Create, edit, delete, archive, and restore habits.
- Customize habit colors and icons.
- Set a daily target for each habit.
- Mark or unmark daily habit completion.
- Individual habit calendar and heatmap views.
- Analytics showing completions and streaks within a 30-day reporting window.
- Short AI-generated habit insights through a server-side Cohere integration.
- Responsive navigation: desktop sidebar and mobile navigation bar.
- Red and purple gradient styling.

## Technology Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js App Router |
| UI | React, Tailwind CSS, reusable UI components |
| Language | TypeScript |
| Authentication and database | Supabase Auth and PostgreSQL |
| AI insights | Cohere Chat API |
| Hosting | Vercel |
| Package manager | npm |

Use package.json and package-lock.json as the source of truth for dependency versions.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/daltonium/habit-tracker-0000.git
cd habit-tracker-0000
```

If the application is inside a nested habit-tracker directory, enter it before continuing:

```bash
cd habit-tracker
```

Run all subsequent commands from the directory containing package.json.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create .env.local in the application root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
COHERE_API_KEY=your_cohere_api_key
```

Check lib/supabase/client.ts, lib/supabase/server.ts, and app/api/insights/route.ts for the exact names your current implementation uses. Some Supabase configurations use a publishable-key variable instead of an anon-key variable.

Never commit .env.local or expose the Cohere API key in client code. Supabase service-role or secret keys must never use the NEXT_PUBLIC_ prefix.

### 4. Configure Supabase

Use an existing Supabase project with the application's tables and authentication settings configured.

The shared application queries use these fields:

| Table | Referenced fields |
| --- | --- |
| habits | id, user_id, name, description, frequency, target_per_day, color, icon, is_archived, created_at |
| habit_completions | habit_id, completed_date |

Important database requirements:

- Completion upserts expect a unique constraint on (habit_id, completed_date).
- Enable Row Level Security and configure ownership policies for both tables.
- Users must only read or modify their own habits and associated completions.
- Configure deletion behavior for completions when a parent habit is deleted.
- Ensure habit defaults match the fields omitted by the creation form.

These field names are not a complete database migration. Apply your project's actual schema and policies before running the app.

Configure the Site URL, allowed redirect URLs, and email confirmation template to match your local and deployed authentication flow. Verify app/auth/confirm/route.ts and the signup email template agree on how confirmation tokens are processed.

### 5. Start development

```bash
npm run dev
```

Open http://localhost:3000.

The intended home-page behavior redirects / to /dashboard. Unauthenticated access depends on the project's proxy/session checks.

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build and TypeScript validation
npm run start    # Serve a completed production build locally
```

To test the production build locally:

```bash
npm run build
npm run start
```

## Routes

| Route | Purpose |
| --- | --- |
| / | Redirect to /dashboard |
| /dashboard | Today's habits and completion summary |
| /habits | Habit creation and management |
| /habits/[id]/calendar | Calendar activity for a specific habit |
| /analytics | Habit statistics and AI insights |
| /api/insights | POST endpoint for AI-generated insights |
| /auth/login | Sign in |
| /auth/sign-up | Create an account |
| /auth/sign-up-success | Signup confirmation information |
| /auth/confirm | Process email confirmation |
| /auth/error | Authentication error page |
| /auth/forgot-password | Request password recovery |
| /auth/update-password | Set a new password |

Replace [id] with an actual habit ID. The old /protected and /test-insights demo pages were removed during cleanup; do not retain redirects or imports pointing to them.

## Project Structure

```text
app/
  analytics/page.tsx
  api/insights/route.ts
  auth/
  dashboard/page.tsx
  habits/
    page.tsx
    [id]/calendar/
      page.tsx
      heatmap.tsx
  Sidebar.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  ui/
  login-form.tsx
  sign-up-form.tsx
  theme-provider.tsx
lib/
  supabase/
    client.ts
    server.ts
    proxy.ts
  utils.ts
proxy.ts
```

Other starter components may remain in the repository. Check imports before deleting any file.

## Daily Tracking and Analytics

Daily completion is currently binary: a habit is either done or not done for a date. Although target_per_day is displayed, the shared implementation does not track incremental progress toward targets greater than one.

The shared analytics implementation fetches the last 30 days of completions, so its longest streak is limited to that reporting window rather than an all-time record. Its current streak requires a completion today; a streak ending yesterday is shown as zero until today's completion is logged.

The shared date helpers use UTC date strings in several places. If local-day tracking is required, standardize date handling across the dashboard, calendar, and analytics before relying on local-midnight boundaries.

## AI Insights

The analytics page sends habit statistics to POST /api/insights. The server calls Cohere and returns an insight string for display.

Example response shape:

```json
{
  "insight": "Start with one small project task today and log it to begin building consistency."
}
```

The intended output is one short, plain-text sentence without Markdown markers. The route includes output cleanup and first-sentence selection; prompt instructions alone do not guarantee a strict word limit.

Before production use:

- Verify the Cohere model configured in the route is available to your account.
- Keep API credentials server-side.
- Authenticate requests and implement appropriate rate limiting and usage controls.
- Validate incoming statistics and check upstream HTTP errors.
- Do not treat fallback text as proof that the AI request succeeded.
- Review what habit data is sent to the AI provider and disclose this to users as appropriate.

## Deployment on Vercel

1. Push the application to GitHub.
2. Import the repository into Vercel.
3. Set Framework Preset to Next.js.
4. Set Root Directory to the folder containing package.json and app/.
5. Add the environment variables used by the application to the Production environment.
6. Leave Output Directory at the framework default; do not override it with public.
7. Deploy and verify the build completes.
8. Update Supabase authentication URLs for the deployed domain and redeploy if environment variables changed.

After deployment, test signup, email confirmation, login, password recovery, habit creation, completion persistence, calendar views, analytics, and logout. Also test that separate users cannot access each other's data.

## Troubleshooting

### Login redirects to /protected

Search authentication forms, confirmation handlers, and proxy logic for /protected. Replace obsolete destinations with /dashboard while preserving password-recovery destinations.

### Login succeeds but navigation stalls in production

Inspect the deployed browser Console and Network tabs, including navigation requests and redirects. Verify session cookies and proxy behavior. A full navigation using window.location.replace('/dashboard') after successful authentication can be used to diagnose or work around client-router issues; it does not replace fixing an underlying runtime or session error.

### Email rate limit exceeded

Review Supabase Auth logs and email delivery limits. Avoid repeated requests while throttled. For production email delivery, configure a suitable custom SMTP provider and review both provider and Supabase limits.

### Module not found after cleanup

Remove both imports and JSX references to deleted starter components. Run npm run build before pushing.

### Generated types reference deleted routes

Stop the development server, then clear the generated build directory in PowerShell:

```powershell
Remove-Item -Recurse -Force .next
npm run build
```

### AI insights are missing or generic

Check COHERE_API_KEY, the selected model, the request payload, and server logs. Ensure the client and route agree on the stats input and insight response field.

## Visual Theme

- Primary red: #F43B47
- Secondary purple: #453A94
- Dark background: #050509

## Development Checklist

- Run npm run build before deployment.
- Test mobile and desktop layouts.
- Check for obsolete /protected redirects.
- Verify email confirmation and password recovery on the deployed domain.
- Validate database ownership policies with multiple user accounts.
- Keep secrets out of Git and browser bundles.
- Test AI failure states, not just successful responses.

## License

No license is specified in this README. Add a LICENSE file if you intend to grant reuse or distribution rights.
