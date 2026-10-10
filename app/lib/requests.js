import { appendFile, readFile } from "fs/promises";
import path from "path";

const SEED_FILE = path.join(process.cwd(), "data", "seed-requests.csv");

// Split CSV text into rows of fields, honoring quoted fields that contain
// commas, escaped quotes (""), or line breaks.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((value) => value.trim() !== ""));
}

// Load every request from the seed CSV. Ids are assigned in chronological
// order (oldest = 1), since the CSV has no id column.
export async function loadRequests() {
  const text = await readFile(SEED_FILE, "utf8");
  const [header, ...rows] = parseCsv(text);
  const columns = header.map((name) => name.trim());

  return rows
    .map((values) => {
      const request = {};
      columns.forEach((column, index) => {
        request[column] = (values[index] ?? "").trim();
      });
      return request;
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((request, index) => ({
      id: index + 1,
      created_at: request.created_at,
      requester_name: request.requester_name,
      location: request.location,
      description: request.description,
      priority: request.priority,
      status: request.status,
    }));
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

// Append a new request to the CSV with status "New" and return it.
// It is the newest request, so its id is one more than the current count.
export async function addRequest({ requester_name, location, description, priority }) {
  const existing = await loadRequests();
  const request = {
    id: existing.length + 1,
    created_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    requester_name,
    location,
    description,
    priority,
    status: "New",
  };

  const row = [
    request.created_at,
    request.requester_name,
    request.location,
    request.description,
    request.priority,
    request.status,
  ]
    .map(toCsvField)
    .join(",");

  await appendFile(SEED_FILE, row + "\r\n", "utf8");
  return request;
}

// Newest first, as the front end expects.
export function sortNewestFirst(requests) {
  return [...requests].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}
