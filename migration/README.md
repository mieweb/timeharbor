# Data Migration Guide

This guide explains how to migrate data from the existing Meteor (MongoDB) application to the new Supabase (PostgreSQL) database.

## Prerequisites

1. **MongoDB Tools**: Ensure you have `mongoexport` installed.
2. **Node.js**: Ensure you have Node.js installed to run the migration script.
3. **Supabase Project**: You need the Supabase URL and Service Role Key.

## Step 1: Export Data from MongoDB

You need to export the following collections from your MongoDB database to JSON files.

Run the following commands (replace `YOUR_MONGO_URI` with your actual connection string, e.g., `mongodb://localhost:3001/meteor` for local Meteor):

```bash
# Create a data directory
mkdir -p data

# Export Users
mongoexport --uri="YOUR_MONGO_URI" --collection=users --out=data/users.json --jsonArray

# Export Teams
mongoexport --uri="YOUR_MONGO_URI" --collection=teams --out=data/teams.json --jsonArray

# Export Tickets
mongoexport --uri="YOUR_MONGO_URI" --collection=tickets --out=data/tickets.json --jsonArray

# Export Clock Events
mongoexport --uri="YOUR_MONGO_URI" --collection=clockevents --out=data/clockevents.json --jsonArray
```

## Step 2: Configure Migration Script

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in this directory with your Supabase credentials:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

## Step 3: Run Migration

Run the migration script:

```bash
node migrate.js
```

The script will:
1. Read the JSON files from the `data/` directory.
2. Map MongoDB `_id`s to Supabase UUIDs.
3. Create users in Supabase Auth (if they don't exist) or map to existing ones.
4. Insert data into `public.profiles`, `public.teams`, `public.team_members`, `public.tickets`, `public.clock_events`, and `public.clock_event_tickets`.
5. Log any errors or warnings.

## Notes

- **User Passwords**: Passwords cannot be migrated because they are hashed differently. Users will need to reset their passwords via the "Forgot Password" flow or you can send them invite emails.
- **IDs**: All MongoDB ObjectIDs (strings) are converted to UUIDs. A mapping file `id_map.json` will be generated to track these changes if you need to debug.
