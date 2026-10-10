import { loadRequests } from "../../lib/requests";

export const dynamic = "force-dynamic";

// "YYYY-MM" in UTC, so the month doesn't shift with the server's time zone.
function monthKey(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 7);
}

// GET /api/summary — the counts behind the three tiles.
export async function GET() {
  try {
    const requests = await loadRequests();
    const open = requests.filter((request) => request.status !== "Complete");

    // "This month" means the month of the most recent request in the data,
    // not today's month, so the tile stays meaningful whenever the app runs.
    let completedThisMonth = 0;
    if (requests.length > 0) {
      const latest = requests.reduce((newest, request) =>
        new Date(request.created_at) > new Date(newest.created_at)
          ? request
          : newest
      );
      const latestMonth = monthKey(latest.created_at);
      completedThisMonth = requests.filter(
        (request) =>
          request.status === "Complete" &&
          monthKey(request.created_at) === latestMonth
      ).length;
    }

    return Response.json({
      open_requests: open.length,
      urgent_open: open.filter((request) => request.priority === "Urgent")
        .length,
      completed_this_month: completedThisMonth,
    });
  } catch (error) {
    console.error("GET /api/summary failed:", error);
    return Response.json(
      { error: "Could not load the summary. Please try again." },
      { status: 500 }
    );
  }
}
