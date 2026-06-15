import { NextRequest } from "next/server";

// Remotive provides a clean, key-less JSON API for remote jobs across many
// freelance/remote platforms. We proxy it server-side to avoid CORS and to
// normalize the shape the client consumes.
const REMOTIVE_URL = "https://remotive.com/api/remote-jobs";

export interface JobItem {
  id: string;
  title: string;
  company: string;
  category: string;
  type: string;
  location: string;
  salary: string;
  url: string;
  date: string;
  tags: string[];
  description: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";

  const params = new URLSearchParams({ limit: "50" });
  if (search) params.set("search", search);
  if (category) params.set("category", category);

  try {
    const res = await fetch(`${REMOTIVE_URL}?${params.toString()}`, {
      headers: { "User-Agent": "BayuDashboard/1.0 (freelancer tools)" },
      // Cache for 10 minutes — job feeds don't change second-to-second.
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      return Response.json({ error: `Gagal mengambil data (${res.status})`, jobs: [] }, { status: 502 });
    }
    const data = (await res.json()) as { jobs?: Record<string, unknown>[] };
    const jobs: JobItem[] = (data.jobs ?? []).map((j) => {
      const desc = stripHtml(String(j.description ?? ""));
      return {
        id: String(j.id ?? crypto.randomUUID()),
        title: String(j.title ?? "Untitled"),
        company: String(j.company_name ?? "Unknown"),
        category: String(j.category ?? ""),
        type: String(j.job_type ?? ""),
        location: String(j.candidate_required_location ?? "Remote"),
        salary: String(j.salary ?? ""),
        url: String(j.url ?? ""),
        date: String(j.publication_date ?? ""),
        tags: Array.isArray(j.tags) ? (j.tags as string[]).slice(0, 6) : [],
        description: desc.slice(0, 1200),
      };
    });
    return Response.json({ jobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message, jobs: [] }, { status: 500 });
  }
}
