# TimeHarbor (Next.js + Supabase)

This is the rewritten version of TimeHarbor using Next.js and Supabase.

## Prerequisites

- Node.js 18+
- Supabase Project

## Setup

1.  Copy `.env.example` to `.env.local` and fill in your Supabase credentials.
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=your-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## Database Setup

Run the SQL script in `../supabase/schema.sql` in your Supabase SQL Editor to set up the tables and policies.

## Features Implemented

-   Authentication (Email/Password)
-   Team Management (Create, Join, List)
-   Clock In/Out (Per team)
-   Basic Dashboard

## Next Steps

-   Implement Tickets management
-   Implement Calendar view
-   Implement Timesheet view
-   Add Realtime updates
-   Mobile integration
