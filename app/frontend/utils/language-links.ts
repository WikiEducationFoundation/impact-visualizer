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

function getTranslateUrl(
  articleTitle: string,
  sourceLang: string,
  targetLang: string,
): string {
  const encoded = encodeURIComponent(articleTitle.replace(/ /g, "_"));
  return `https://${targetLang}.wikipedia.org/wiki/Special:ContentTranslation?page=${encoded}&from=${sourceLang}&to=${targetLang}`;
}

async function fetchLanguageLinks(
  topicId: string | number,
): Promise<Map<string, Set<string>>> {
  const data = await TopicService.getLanguageLinks(topicId);
  const result = new Map<string, Set<string>>();

  for (const [title, langs] of Object.entries(data)) {
    result.set(title, new Set(langs));
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
