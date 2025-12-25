# Deployment Guide

This guide explains how to deploy the TimeHarbor Next.js application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com).
2. **GitHub Repository**: Push this code to a GitHub repository.
3. **Supabase Project**: You need your Supabase URL and Anon Key.

## Steps

1. **Import Project to Vercel**:
   - Go to your Vercel dashboard.
   - Click "Add New..." -> "Project".
   - Select your GitHub repository.

2. **Configure Project**:
   - **Framework Preset**: Next.js (should be auto-detected).
   - **Root Directory**: `nextjs-app` (since the Next.js app is in a subdirectory).

3. **Environment Variables**:
   - Add the following environment variables in the Vercel project settings:
     - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
     - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Your VAPID Public Key (for push notifications).
     - `VAPID_PRIVATE_KEY`: Your VAPID Private Key.
     - `VAPID_SUBJECT`: `mailto:your-email@example.com`.

4. **Deploy**:
   - Click "Deploy".
   - Vercel will build and deploy your application.

## Post-Deployment

1. **Update Supabase Auth Settings**:
   - Go to Supabase Dashboard -> Authentication -> URL Configuration.
   - Add your Vercel deployment URL (e.g., `https://timeharbor.vercel.app`) to "Site URL" and "Redirect URLs".

2. **Update Mobile App**:
   - If you are building the mobile app, update `capacitor.config.ts` with the production URL if you want to point to the live server (though usually Capacitor apps bundle the web assets).
   - If using live reload for dev, keep it as is. For production build, run `npm run build` and `npx cap sync`.

## CI/CD

Vercel automatically sets up CI/CD. Every push to the `main` branch will trigger a new deployment.
