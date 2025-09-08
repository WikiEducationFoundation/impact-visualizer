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
    assessment_grade: string | null;
  }>
): string {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent +=
    "Article,Average Daily Views,Average Daily Views (prev year),Article Size,Article Size (prev year),Lead Section Size,Talk Size,Talk Size (prev year),Assessment Grade\n";
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
        row.assessment_grade ?? "",
      ].join(",") + "\n";
  });
  return csvContent;
}

export function getAssessmentColor(grade?: string | null): string {
  if (!grade) return "#9e9e9e";
  switch (grade) {
    case "FA":
      return "#9CBDFF";
    case "GA":
      return "#66FF66";
    case "A":
      return "#66FFFF";
    case "FL":
      return "#9CBDFF";
    case "B":
      return "#B2FF66";
    case "C":
      return "#FFFF66";
    case "Start":
      return "#FFAA66";
    case "Stub":
      return "#FFA4A4";
    case "List":
      return "#C7B1FF";
    default:
      return "#9e9e9e";
  }
}
