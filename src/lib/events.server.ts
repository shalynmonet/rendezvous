// Real upcoming events (concerts, theater, comedy, exhibitions) via Parallel web search.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/parallel";

export type EventHit = { title: string; url: string; date: string | null; excerpt: string };

export async function findEvents(city: string, interests: string[], when?: string): Promise<EventHit[]> {
  const lovable = process.env["LOVABLE_API_KEY"];
  const key = process.env["PARALLEL_API_KEY"];
  if (!lovable || !key) return [];
  const today = new Date().toISOString().slice(0, 10);
  const focus = interests.slice(0, 4).join(", ");
  const res = await fetch(`${GATEWAY_URL}/v1/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      objective: `Find specific upcoming live events (concerts, theater, comedy, jazz, exhibitions) in ${city} happening ${when || "in the next few weeks"} after ${today}, ideally matching: ${focus || "date night"}. Prefer event or ticket pages with exact dates and venues.`,
      search_queries: [`${city} concerts this month`, `${city} theater shows tickets`, `${city} events this weekend`].map((q) => q.slice(0, 200)),
      mode: "fast",
      advanced_settings: { max_results: 8, excerpt_settings: { max_chars_per_result: 600 } },
    }),
  });
  if (!res.ok) {
    console.error(`Events search failed [${res.status}]: ${await res.text()}`);
    return [];
  }
  const body = (await res.json()) as { results?: { url: string; title?: string; publish_date?: string | null; excerpts?: string[] }[] };
  return (body.results ?? []).map((r) => ({
    title: r.title ?? r.url,
    url: r.url,
    date: r.publish_date ?? null,
    excerpt: (r.excerpts ?? []).join(" ").slice(0, 600),
  }));
}
