import { addRequest, loadRequests, sortNewestFirst } from "../../lib/requests";

export const dynamic = "force-dynamic";

// GET /api/requests — every request, newest first.
export async function GET() {
  try {
    const requests = await loadRequests();
    return Response.json({ requests: sortNewestFirst(requests) });
  } catch (error) {
    console.error("GET /api/requests failed:", error);
    return Response.json(
      { error: "Could not load requests. Please try again." },
      { status: 500 }
    );
  }
}

const LOCATIONS = ["Minneapolis", "Chicago", "Denver", "Austin"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const MIN_DESCRIPTION_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

const REQUIRED_FIELDS = [
  ["requester_name", "Requester name"],
  ["location", "Location"],
  ["description", "Description"],
  ["priority", "Priority"],
];

// "Minneapolis, Chicago, Denver, or Austin"
function listOptions(options) {
  return options.slice(0, -1).join(", ") + ", or " + options[options.length - 1];
}

// Check a submitted request against the rules in the API contract. Returns
// { fields } with trimmed values, or { error } naming the first field to fix.
// The form's dropdowns aren't a guarantee, since anyone can call this URL directly.
function validateRequest(body) {
  const fields = {};
  for (const [key, label] of REQUIRED_FIELDS) {
    const value = typeof body?.[key] === "string" ? body[key].trim() : "";
    if (!value) {
      return { error: `${label} is required.` };
    }
    fields[key] = value;
  }

  // \p{L} is any letter in any language, so "José" passes and "129" doesn't.
  if (!/\p{L}/u.test(fields.requester_name)) {
    return { error: "Requester name must include letters, not just numbers or symbols." };
  }
  if (!LOCATIONS.includes(fields.location)) {
    return { error: `Location must be ${listOptions(LOCATIONS)}.` };
  }
  if (!PRIORITIES.includes(fields.priority)) {
    return { error: `Priority must be ${listOptions(PRIORITIES)}.` };
  }
  if (fields.description.length < MIN_DESCRIPTION_LENGTH) {
    return {
      error: `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters (it's ${fields.description.length}). Add more detail about the problem.`,
    };
  }
  if (fields.description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer (it's ${fields.description.length}).`,
    };
  }

  return { fields };
}

// POST /api/requests — save a new request and return it.
export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "The request could not be read. Please try again." },
        { status: 400 }
      );
    }

    const { fields, error } = validateRequest(body);
    if (error) {
      return Response.json({ error }, { status: 400 });
    }

    const request = await addRequest(fields);
    return Response.json({ request }, { status: 201 });
  } catch (error) {
    console.error("POST /api/requests failed:", error);
    return Response.json(
      { error: "Could not save the request. Please try again." },
      { status: 500 }
    );
  }
}
