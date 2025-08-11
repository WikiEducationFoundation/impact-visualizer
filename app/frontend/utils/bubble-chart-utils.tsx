import { escapeCSVSpecialCharacters } from "./search-utils";
export function convertAnalyticsToCSV(
  rows: Array<{
    article: string;
    average_daily_views: number;
    prev_average_daily_views: number | null;
    article_size: number;
    prev_article_size: number | null;
    lead_section_size: number;
    talk_size: number;
    prev_talk_size: number | null;
  }>
): string {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent +=
    "Article,Average Daily Views,Average Daily Views (prev year),Article Size,Article Size (prev year),Lead Section Size,Talk Size,Talk Size (prev year)\n";
  rows.forEach((row) => {
    csvContent +=
      [
        escapeCSVSpecialCharacters(row.article),
        row.average_daily_views,
        row.prev_average_daily_views ?? "",
        row.article_size,
        row.prev_article_size ?? "",
        row.lead_section_size,
        row.talk_size,
        row.prev_talk_size ?? "",
      ].join(",") + "\n";
  });
  return csvContent;
}
