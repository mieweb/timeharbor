require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DATA_DIR = path.join(__dirname, 'data');
const ID_MAP_FILE = path.join(__dirname, 'id_map.json');

// Load existing ID map if available
let idMap = {};
if (fs.existsSync(ID_MAP_FILE)) {
  try {
    idMap = JSON.parse(fs.readFileSync(ID_MAP_FILE, 'utf8'));
  } catch (e) {
    console.warn('Could not read existing id_map.json, starting fresh.');
  }
}

function getUuid(mongoId) {
  if (!mongoId) return null;
  if (typeof mongoId !== 'string') return null; // Handle cases where ID might be missing
  
  if (idMap[mongoId]) {
    return idMap[mongoId];
  }
  
  const newId = uuidv4();
  idMap[mongoId] = newId;
  return newId;
}

function saveIdMap() {
  fs.writeFileSync(ID_MAP_FILE, JSON.stringify(idMap, null, 2));
}

function readJsonFile(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: File ${filename} not found. Skipping.`);
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error(`Error reading ${filename}:`, e);
    return [];
  }
}

function parseDate(dateVal) {
  if (!dateVal) return null;
  // MongoDB export might be {$date: "..."} or {$date: number} or just a string/number
  if (typeof dateVal === 'object' && dateVal.$date) {
    return new Date(dateVal.$date).toISOString();
  }
  if (typeof dateVal === 'number') {
    return new Date(dateVal).toISOString();
  }
  return new Date(dateVal).toISOString();
}

async function migrateUsers() {
  console.log('Migrating Users...');
  const users = readJsonFile('users.json');
  
  for (const user of users) {
    const mongoId = user._id?.$oid || user._id;
    const email = user.emails?.[0]?.address;
    const name = user.profile?.name || user.username || email?.split('@')[0] || 'User';
    const avatarUrl = user.profile?.avatar_url || null; // Adjust based on actual data

    if (!email) {
      console.warn(`Skipping user ${mongoId} without email.`);
      continue;
    }

    // Check if user exists in Supabase
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let supabaseUser = existingUsers.users.find(u => u.email === email);

    if (!supabaseUser) {
      // Create user
      const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { full_name: name, avatar_url: avatarUrl }
      });

      if (error) {
        console.error(`Error creating user ${email}:`, error.message);
        continue;
      }
      supabaseUser = data.user;
      console.log(`Created user: ${email}`);
    } else {
      console.log(`User already exists: ${email}`);
      // Update metadata if needed
      await supabase.auth.admin.updateUserById(supabaseUser.id, {
        user_metadata: { full_name: name, avatar_url: avatarUrl }
      });
    }

    // Map Mongo ID to Supabase User ID
    idMap[mongoId] = supabaseUser.id;
    
    // Ensure profile exists (trigger should handle it, but we can update it)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: supabaseUser.id,
        full_name: name,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      });
      
    if (profileError) {
      console.error(`Error updating profile for ${email}:`, profileError.message);
    }
  }
  saveIdMap();
}

async function migrateTeams() {
  console.log('Migrating Teams...');
  const teams = readJsonFile('teams.json');
  
  for (const team of teams) {
    const mongoId = team._id?.$oid || team._id;
    const newId = getUuid(mongoId);
    
    const createdByMongo = team.createdBy || team.leader; // Fallback
    const createdBy = getUuid(createdByMongo);

    const teamData = {
      id: newId,
      name: team.name,
      code: team.code || `TEAM-${newId.substring(0, 8)}`, // Ensure code exists
      created_at: parseDate(team.createdAt) || new Date().toISOString(),
      created_by: createdBy
    };

    const { error } = await supabase.from('teams').upsert(teamData);
    if (error) console.error(`Error inserting team ${team.name}:`, error.message);

    // Migrate Members
    const members = new Set();
    const admins = new Set(team.admins || []);
    const leader = team.leader;

    if (team.members) team.members.forEach(m => members.add(m));
    if (leader) members.add(leader);
    if (team.admins) team.admins.forEach(a => members.add(a));

    for (const memberMongoId of members) {
      const userId = getUuid(memberMongoId);
      if (!userId) continue;

      let role = 'member';
      if (memberMongoId === leader) role = 'leader';
      else if (admins.has(memberMongoId)) role = 'admin';

      const { error: memberError } = await supabase.from('team_members').upsert({
        team_id: newId,
        user_id: userId,
        role: role,
        joined_at: new Date().toISOString() // We don't have joinedAt in Mongo usually
      }, { onConflict: 'team_id,user_id' });

      if (memberError) console.error(`Error adding member ${userId} to team ${team.name}:`, memberError.message);
    }
  }
  saveIdMap();
}

async function migrateTickets() {
  console.log('Migrating Tickets...');
  const tickets = readJsonFile('tickets.json');

  for (const ticket of tickets) {
    const mongoId = ticket._id?.$oid || ticket._id;
    const newId = getUuid(mongoId);
    
    const teamId = getUuid(ticket.teamId);
    const createdBy = getUuid(ticket.createdBy);
    
    if (!teamId) {
      console.warn(`Skipping ticket ${mongoId} because teamId is missing or not mapped.`);
      continue;
    }

    const ticketData = {
      id: newId,
      team_id: teamId,
      title: ticket.title,
      github_url: ticket.githubUrl || null,
      accumulated_time: ticket.accumulatedTime || 0,
      status: ticket.status || 'open',
      created_by: createdBy,
      created_at: parseDate(ticket.createdAt) || new Date().toISOString(),
      updated_at: parseDate(ticket.updatedAt),
      // reviewed_by and reviewed_at might not be in Mongo export directly, check schema if needed
    };

    const { error } = await supabase.from('tickets').upsert(ticketData);
    if (error) console.error(`Error inserting ticket ${ticket.title}:`, error.message);
  }
  saveIdMap();
}

async function migrateClockEvents() {
  console.log('Migrating Clock Events...');
  const events = readJsonFile('clockevents.json');

  for (const event of events) {
    const mongoId = event._id?.$oid || event._id;
    const newId = getUuid(mongoId);
    
    const userId = getUuid(event.userId);
    const teamId = getUuid(event.teamId);
    
    if (!userId || !teamId) {
      console.warn(`Skipping clock event ${mongoId} due to missing user or team.`);
      continue;
    }

    const eventData = {
      id: newId,
      user_id: userId,
      team_id: teamId,
      start_timestamp: parseDate(event.startTimestamp),
      end_timestamp: parseDate(event.endTime), // Note: Mongo field is endTime
      accumulated_time: event.accumulatedTime || 0
    };

    const { error } = await supabase.from('clock_events').upsert(eventData);
    if (error) {
      console.error(`Error inserting clock event ${mongoId}:`, error.message);
      continue;
    }

    // Migrate Clock Event Tickets
    if (event.tickets && Array.isArray(event.tickets)) {
      for (const ticketEntry of event.tickets) {
        const ticketId = getUuid(ticketEntry.ticketId);
        if (!ticketId) continue;

        const entryData = {
          clock_event_id: newId,
          ticket_id: ticketId,
          start_timestamp: parseDate(ticketEntry.startTimestamp),
          accumulated_time: ticketEntry.accumulatedTime || 0
        };

        const { error: ticketError } = await supabase.from('clock_event_tickets').insert(entryData);
        if (ticketError) console.error(`Error inserting clock event ticket for event ${mongoId}:`, ticketError.message);
      }
    }
  }
  saveIdMap();
}

async function run() {
  try {
    await migrateUsers();
    await migrateTeams();
    await migrateTickets();
    await migrateClockEvents();
    console.log('Migration completed successfully!');
  } catch (e) {
    console.error('Migration failed:', e);
  }
}

run();
