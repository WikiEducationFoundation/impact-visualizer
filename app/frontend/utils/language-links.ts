import TopicService from "../services/topic.service";

const TARGET_LANGUAGES = ["en", "it", "fr", "es", "de"] as const;
type TargetLanguage = (typeof TARGET_LANGUAGES)[number];

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  it: "Italian",
  fr: "French",
  es: "Spanish",
  de: "German",
};

const LANG_LINKS_BATCH_SIZE = 50;

function getTranslateUrl(
  articleTitle: string,
  sourceLang: string,
  targetLang: string,
): string {
  const encoded = encodeURIComponent(articleTitle.replace(/ /g, "_"));
  return `https://${targetLang}.wikipedia.org/wiki/Special:ContentTranslation?page=${encoded}&from=${sourceLang}&to=${targetLang}`;
}

function mergeInto(
  target: Map<string, Set<string>>,
  raw: Record<string, string[]>,
) {
  for (const [title, langs] of Object.entries(raw)) {
    target.set(title, new Set(langs));
  }
}

export type LangLinksProgress = { done: number; total: number };

async function fetchLanguageLinks(
  topicId: string | number,
  articles?: string[],
  onProgress?: (progress: LangLinksProgress) => void,
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();

  if (!articles || articles.length === 0) {
    const data = await TopicService.getLanguageLinks(topicId);
    mergeInto(result, data);
    return result;
  }

  const batches: string[][] = [];
  for (let i = 0; i < articles.length; i += LANG_LINKS_BATCH_SIZE) {
    batches.push(articles.slice(i, i + LANG_LINKS_BATCH_SIZE));
  }

  const total = articles.length;
  onProgress?.({ done: 0, total });

  for (let i = 0; i < batches.length; i++) {
    const data = await TopicService.getLanguageLinks(topicId, batches[i]);
    mergeInto(result, data);
    onProgress?.({
      done: Math.min((i + 1) * LANG_LINKS_BATCH_SIZE, total),
      total,
    });
  }

  return result;
}

export {
  fetchLanguageLinks,
  TARGET_LANGUAGES,
  LANGUAGE_LABELS,
  getTranslateUrl,
};
export type { TargetLanguage };
