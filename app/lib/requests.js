import { createClient } from "@supabase/supabase-js";

// Requests live in a Supabase table. The app used to read and write
// data/seed-requests.csv, but a deployed site can't save to its own files,
// so new requests never stuck on Netlify.
const TABLE = "entries";

// Set in .env.local on your computer and under Environment variables in
// Netlify. The names match .env.example.
function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// "2026-08-27T15:40:00Z", the format the front end and README use.
// Supabase returns timestamps like "2026-08-27T15:40:00+00:00".
function formatTimestamp(value) {
  return new Date(value).toISOString().replace(/\.\d{3}Z$/, "Z");
}

// Shapes a table row into what the API returns.
function toRequest(row) {
  return {
    id: row.id,
    created_at: formatTimestamp(row.created_at),
    requester_name: row.requester_name,
    location: row.location,
    description: row.description,
    priority: row.priority,
    status: row.status,
  };
}

// Every request, oldest first.
export async function loadRequests() {
  const { data, error } = await getClient()
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    throw new Error("Supabase read failed: " + error.message);
  }
  return data.map(toRequest);
}

// Save a new request with status "New" and return it. Supabase fills in
// the id and created_at.
export async function addRequest({ requester_name, location, description, priority }) {
  const { data, error } = await getClient()
    .from(TABLE)
    .insert({ requester_name, location, description, priority, status: "New" })
    .select()
    .single();
  if (error) {
    throw new Error("Supabase insert failed: " + error.message);
  }
  return toRequest(data);
}

// Quote a value if it contains a comma, quote, or line break, so it reads
// back as a single field.
export function toCsvField(value) {
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

// Newest first, as the front end expects.
export function sortNewestFirst(requests) {
  return [...requests].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}
