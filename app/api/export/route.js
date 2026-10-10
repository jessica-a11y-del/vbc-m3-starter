import { loadRequests, sortNewestFirst, toCsvField } from "../../lib/requests";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "id",
  "created_at",
  "requester_name",
  "location",
  "description",
  "priority",
  "status",
];

// Spreadsheet apps run a cell that starts with = + - or @ as a formula, so a
// description like "=HYPERLINK(...)" could do something unexpected when the
// file is opened. A leading apostrophe makes Excel and Sheets show plain text.
function asPlainText(value) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

// GET /api/export — every request, newest first, as a CSV download.
export async function GET() {
  try {
    const requests = sortNewestFirst(await loadRequests());

    const lines = [
      COLUMNS.join(","),
      ...requests.map((request) =>
        COLUMNS.map((column) => toCsvField(asPlainText(request[column]))).join(",")
      ),
    ];

    return new Response(lines.join("\r\n") + "\r\n", {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="morrowlane-requests.csv"',
      },
    });
  } catch (error) {
    console.error("GET /api/export failed:", error);
    return Response.json(
      { error: "Could not export the requests. Please try again." },
      { status: 500 }
    );
  }
}
