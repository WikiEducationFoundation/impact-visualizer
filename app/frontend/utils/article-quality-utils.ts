// Threshold and feature mapping ported from the Wikimedia microtask-generator:
// https://gitlab.wikimedia.org/toolforge-repos/microtask-generator/-/blob/main/main.py

export const QUALITY_THRESHOLD = 0.5;

export const QUALITY_CHECKS: { key: string; message: string }[] = [
  { key: "refs", message: "Add more references" },
  { key: "wikilinks", message: "Add more internal wikilinks" },
  { key: "headings", message: "Improve article section headings" },
  { key: "media", message: "Add images or other media" },
  { key: "infobox", message: "Add an infobox" },
  { key: "categories", message: "Add more relevant categories" },
  {
    key: "characters",
    message: "This article is too short, try to expand the content",
  },
];

export const MESSAGEBOX_MESSAGE = "Check article for a maintenance message";

type Normalized = Record<string, number | boolean | undefined>;
type Features = { normalized?: Normalized } | undefined | null;

export function getArticleNeeds(features: Features): string[] {
  const normalized = features?.normalized;
  if (!normalized) return [];

  const needs: string[] = [];

  for (const { key, message } of QUALITY_CHECKS) {
    const score = normalized[key];
    if (typeof score === "number" && score <= QUALITY_THRESHOLD) {
      needs.push(message);
    }
  }

  if (normalized.messagebox) {
    needs.push(MESSAGEBOX_MESSAGE);
  }

  return needs;
}

async function fetchLatestRevId(
  title: string,
  lang: string,
): Promise<number | null> {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?` +
    `action=query&format=json&prop=revisions&rvprop=ids` +
    `&titles=${encodeURIComponent(title.replace(/ /g, "_"))}` +
    `&redirects=1&normalize=1&origin=*`;

  const response = await fetch(url);
  const data = await response.json();
  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0] as
    | { revisions?: { revid?: number }[] }
    | undefined;
  return page?.revisions?.[0]?.revid ?? null;
}

async function fetchQualityFeatures(
  revId: number,
  lang: string,
): Promise<Features> {
  const response = await fetch(
    "https://api.wikimedia.org/service/lw/inference/v1/models/articlequality:predict",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rev_id: revId,
        lang,
        extended_output: "true",
      }),
    },
  );
  const data = await response.json();
  return data?.features ?? null;
}

export async function fetchArticleNeeds(
  title: string,
  lang: string,
): Promise<string[]> {
  try {
    const revId = await fetchLatestRevId(title, lang);
    if (revId == null) return [];
    const features = await fetchQualityFeatures(revId, lang);
    return getArticleNeeds(features);
  } catch {
    return [];
  }
}
