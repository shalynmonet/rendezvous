// Server-only Qloo taste graph client (hackathon environment).
const BASE = "https://hackathon.api.qloo.com";

export type TasteCategory = "artist" | "film" | "tv" | "restaurant" | "cuisine" | "place" | "book" | "brand";
export type TasteItem = { category: TasteCategory; label: string; entity_id?: string | undefined; name?: string | undefined };

export const CATEGORY_TYPE: Record<TasteCategory, string> = {
  artist: "urn:entity:artist",
  film: "urn:entity:movie",
  tv: "urn:entity:tv_show",
  restaurant: "urn:entity:place",
  cuisine: "urn:entity:place",
  place: "urn:entity:place",
  book: "urn:entity:book",
  brand: "urn:entity:brand",
};

export const PLACE_KIND_TAG: Record<string, string> = {
  dinner: "urn:tag:category:place:restaurant",
  restaurant: "urn:tag:category:place:restaurant",
  activity: "urn:tag:category:place:museum",
  museum: "urn:tag:category:place:museum",
  nightcap: "urn:tag:category:place:bar",
  bar: "urn:tag:category:place:bar",
  cocktail_bar: "urn:tag:category:place:cocktail_bar",
};

function key() {
  const k = process.env["QLOO_API_KEY"];
  if (!k) throw new Error("QLOO_API_KEY is not configured");
  return k;
}

async function qloo(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { "X-Api-Key": key() } });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Qloo ${path} failed [${res.status}]: ${body.slice(0, 300)}`);
    throw new Error(`Qloo request failed [${res.status}]`);
  }
  return res.json() as Promise<any>;
}

export type Entity = { id: string; name: string; type?: string | undefined; affinity?: number | undefined; address?: string | undefined; tags?: string[] | undefined; image?: string | undefined; description?: string | undefined };

function mapEntity(e: any): Entity {
  return {
    id: e.entity_id,
    name: e.name,
    type: e.subtype ?? e.types?.[0],
    affinity: e.query?.affinity ? Math.round(e.query.affinity * 100) / 100 : undefined,
    address: e.properties?.address ?? undefined,
    tags: (e.tags ?? []).map((t: any) => t.name).filter(Boolean).slice(0, 6),
    image: e.properties?.image?.url ?? e.properties?.images?.[0]?.url,
    description: e.properties?.short_description ?? e.properties?.description,
  };
}

export async function searchEntities(query: string, category: TasteCategory, take = 5): Promise<Entity[]> {
  const d = await qloo("/search", { query, types: CATEGORY_TYPE[category], take });
  return (d.results ?? []).map(mapEntity);
}

/** Fill entity_id for any taste items that don't have one yet. */
export async function resolveItems(items: TasteItem[]): Promise<TasteItem[]> {
  return Promise.all(
    items.map(async (it) => {
      if (it.entity_id) return it;
      try {
        const [hit] = await searchEntities(it.label, it.category, 1);
        return hit ? { ...it, entity_id: hit.id, name: hit.name } : it;
      } catch {
        return it;
      }
    }),
  );
}

export async function insights(opts: { type: string; entityIds: string[]; location?: string | undefined; tag?: string | undefined; take?: number | undefined }): Promise<Entity[]> {
  if (!opts.entityIds.length) return [];
  const d = await qloo("/v2/insights", {
    "filter.type": opts.type,
    "signal.interests.entities": opts.entityIds.slice(0, 25).join(","),
    "filter.location.query": opts.location,
    "filter.tags": opts.tag,
    take: opts.take ?? 8,
  });
  return (d.results?.entities ?? []).map(mapEntity).filter((e: Entity) => e.name !== opts.location);
}

export async function tasteTags(entityIds: string[], take = 12): Promise<{ name: string; affinity?: number }[]> {
  if (!entityIds.length) return [];
  const d = await qloo("/v2/insights", {
    "filter.type": "urn:tag",
    "signal.interests.entities": entityIds.slice(0, 25).join(","),
    take,
  });
  return (d.results?.tags ?? []).map((t: any) => ({ name: t.name, affinity: t.query?.affinity }));
}

export const ids = (items: TasteItem[]) => items.map((i) => i.entity_id).filter((x): x is string => !!x);

/** Deterministic overlap analysis between two people. */
export async function compareTastes(a: TasteItem[], b: TasteItem[]) {
  const ia = ids(a), ib = ids(b);
  const types = ["urn:entity:artist", "urn:entity:movie", "urn:entity:tv_show"];
  const [aRecs, bRecs, joint, aTags, bTags] = await Promise.all([
    Promise.all(types.map((t) => insights({ type: t, entityIds: ia, take: 15 }).catch(() => []))),
    Promise.all(types.map((t) => insights({ type: t, entityIds: ib, take: 15 }).catch(() => []))),
    Promise.all(types.map((t) => insights({ type: t, entityIds: [...ia, ...ib], take: 6 }).catch(() => []))),
    tasteTags(ia, 25).catch(() => []),
    tasteTags(ib, 25).catch(() => []),
  ]);
  const fa = aRecs.flat(), fb = bRecs.flat();
  const bNames = new Set(fb.map((e) => e.name));
  const overlap = fa.filter((e) => bNames.has(e.name)).map((e) => e.name);
  const bTagNames = new Set(bTags.map((t) => t.name));
  const sharedTags = aTags.filter((t) => bTagNames.has(t.name)).map((t) => t.name);
  return {
    shared_recommendations: overlap.slice(0, 10),
    shared_taste_tags: sharedTags.slice(0, 10),
    bridges_for_both: joint.flat().slice(0, 12).map((e) => ({ name: e.name, type: e.type, affinity: e.affinity })),
    person_a_only: fa.filter((e) => !bNames.has(e.name)).slice(0, 6).map((e) => e.name),
    person_b_only: fb.filter((e) => !overlap.includes(e.name)).slice(0, 6).map((e) => e.name),
  };
}
