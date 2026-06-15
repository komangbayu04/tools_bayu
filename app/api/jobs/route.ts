import { NextRequest } from "next/server";

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
  source: "remotive" | "linkedin";
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

// ─── Remotive ─────────────────────────────────────────────────────
async function fetchRemotive(search: string, category: string): Promise<JobItem[]> {
  const params = new URLSearchParams({ limit: "30" });
  if (search) params.set("search", search);
  if (category) params.set("category", category);

  const res = await fetch(`https://remotive.com/api/remote-jobs?${params}`, {
    headers: { "User-Agent": "BayuDashboard/1.0" },
    next: { revalidate: 600 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { jobs?: Record<string, unknown>[] };
  return (data.jobs ?? []).map((j) => ({
    id: `remotive-${j.id}`,
    title: String(j.title ?? ""),
    company: String(j.company_name ?? ""),
    category: String(j.category ?? ""),
    type: String(j.job_type ?? ""),
    location: String(j.candidate_required_location ?? "Remote"),
    salary: String(j.salary ?? ""),
    url: String(j.url ?? ""),
    date: String(j.publication_date ?? ""),
    tags: Array.isArray(j.tags) ? (j.tags as string[]).slice(0, 6) : [],
    description: stripHtml(String(j.description ?? "")).slice(0, 1200),
    source: "remotive" as const,
  }));
}

// ─── LinkedIn guest search (scraper) ──────────────────────────────
// LinkedIn has no public jobs API, so we scrape the guest-facing job search
// endpoint that powers their logged-out search results page and parse the
// returned HTML job cards. Rate-limited and cached server-side.
async function fetchLinkedIn(search: string, location: string): Promise<JobItem[]> {
  if (!search.trim()) return [];

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://www.linkedin.com/jobs",
    "X-Requested-With": "XMLHttpRequest",
  };

  const jobs: JobItem[] = [];
  const seen = new Set<string>();

  // Fetch a couple of pages (each ~25 cards) for a fuller list.
  for (const start of [0, 25]) {
    const params = new URLSearchParams({
      keywords: search,
      location: location || "Remote",
      start: String(start),
      f_TPR: "r604800", // posted in the past week
    });
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`;

    let html = "";
    try {
      const res = await fetch(url, { headers, next: { revalidate: 600 } });
      if (!res.ok) break;
      html = await res.text();
    } catch {
      break;
    }

    // Split on each card wrapper — guest cards use <li> or a div.base-card.
    const cards = html.split(/<li[^>]*>/i).slice(1);
    if (cards.length === 0) break;

    for (const card of cards) {
      const idMatch =
        card.match(/data-entity-urn="urn:li:jobPosting:(\d+)"/) ||
        card.match(/jobs\/view\/[^"/?]*?-(\d+)(?:[/?"])/) ||
        card.match(/currentJobId=(\d+)/);
      const linkMatch = card.match(/href="(https:\/\/[a-z.]*linkedin\.com\/jobs\/view\/[^"]+)"/);

      const titleMatch =
        card.match(/class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\//) ||
        card.match(/class="[^"]*sr-only[^"]*"[^>]*>([\s\S]*?)<\//);
      const companyMatch = card.match(/class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/[a-z0-9]+>/i);
      const locationMatch = card.match(/class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/);
      const dateMatch = card.match(/datetime="([^"]+)"/);

      const title = stripHtml(titleMatch?.[1] ?? "").trim();
      const company = stripHtml(companyMatch?.[1] ?? "").trim();
      if (!title || !company) continue;

      const rawUrl = linkMatch?.[1] ?? "";
      const cleanUrl = rawUrl.split("?")[0];
      const id = `linkedin-${idMatch?.[1] || cleanUrl || crypto.randomUUID()}`;
      if (seen.has(id)) continue;
      seen.add(id);

      jobs.push({
        id,
        title,
        company,
        category: "",
        type: "",
        location: stripHtml(locationMatch?.[1] ?? location).trim(),
        salary: "",
        url: cleanUrl || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(search)}&location=${encodeURIComponent(location || "")}`,
        date: dateMatch?.[1] ?? "",
        tags: [],
        description: "",
        source: "linkedin" as const,
      });

      if (jobs.length >= 30) break;
    }

    if (jobs.length >= 30) break;
  }

  return jobs;
}

// ─── Handler ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const sources = (searchParams.get("sources") ?? "remotive,linkedin").split(",");
  const linkedinLocation = searchParams.get("linkedinLocation")?.trim() ?? "Remote";

  try {
    const fetches: Promise<JobItem[]>[] = [];
    if (sources.includes("remotive")) fetches.push(fetchRemotive(search, category));
    if (sources.includes("linkedin")) fetches.push(fetchLinkedIn(search, linkedinLocation));

    const results = await Promise.allSettled(fetches);
    const jobs: JobItem[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") jobs.push(...r.value);
    }

    // Sort by date desc, interleave sources
    jobs.sort((a, b) => (b.date > a.date ? 1 : -1));

    return Response.json({ jobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message, jobs: [] }, { status: 500 });
  }
}
