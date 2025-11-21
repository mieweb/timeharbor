# TimeHarbor (Next.js + Supabase)

A privacy-first time tracking and reflection tool, now rebuilt with Next.js, Supabase, and Capacitor for a modern, scalable, and mobile-ready experience.

## Overview

TimeHarbor empowers individuals to track, reflect on, and selectively share how they spend their time. It is designed as a personal assistant and coach, not a surveillance tool.

This repository contains the new version of TimeHarbor, migrated from Meteor to Next.js.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Realtime, Edge Functions)
- **Mobile**: Capacitor (iOS & Android)
- **Language**: TypeScript

## Directory Structure

- `nextjs-app/`: The main Next.js application.
- `supabase/`: Supabase configuration and schema.
- `migration/`: Scripts to migrate data from the old Meteor (MongoDB) app.
- `ios/`: (Old) Native iOS project (reference).
- `client/`, `server/`: (Old) Meteor application code (reference).

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase Project

### Setup

1. **Install Dependencies**:
   ```bash
   cd nextjs-app
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env.local` in `nextjs-app/` and fill in your Supabase credentials.
   ```bash
   cp .env.example .env.local
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Mobile Development

To run the app on iOS:

1. Build the web app:
   ```bash
   cd nextjs-app
   npm run build
   ```

2. Sync with Capacitor:
   ```bash
   npx cap sync
   ```

3. Open Xcode:
   ```bash
   npx cap open ios
   ```

## Migration

If you are migrating from the old Meteor version, please see the [Migration Guide](migration/README.md).

## Deployment

For deployment instructions, see [Deployment Guide](nextjs-app/DEPLOY.md).

## Legacy Code

The original Meteor application code is still present in the root directory (e.g., `client/`, `server/`) but is deprecated. See [README_METEOR.md](README_METEOR.md) for the old documentation.
