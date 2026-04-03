import TopicService from "../services/topic.service";

const TARGET_LANGUAGES = ["en", "it", "fr", "es", "de"] as const;
type TargetLanguage = (typeof TARGET_LANGUAGES)[number];

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

export { fetchLanguageLinks, TARGET_LANGUAGES };
export type { TargetLanguage };
