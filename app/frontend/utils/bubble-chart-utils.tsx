import { escapeCSVSpecialCharacters } from "./search-utils";
import type {
  ArticleProtection,
  NumericSortField,
  XAxisKey,
  NumericSortableArticle,
} from "../types/bubble-chart.type";

function compareArticlesByPublicationDateAsc(
  firstArticle: { publication_date: string | null; article: string },
  secondArticle: { publication_date: string | null; article: string }
): number {
  const firstPubDateParsed = firstArticle.publication_date
    ? Date.parse(firstArticle.publication_date)
    : NaN;
  const secondPubDateParsed = secondArticle.publication_date
    ? Date.parse(secondArticle.publication_date)
    : NaN;

  // If pub date is not valid, use positive infinity as sort key
  const firstSortKey = Number.isFinite(firstPubDateParsed)
    ? firstPubDateParsed
    : Number.POSITIVE_INFINITY;
  const secondSortKey = Number.isFinite(secondPubDateParsed)
    ? secondPubDateParsed
    : Number.POSITIVE_INFINITY;

  if (firstSortKey !== secondSortKey) return firstSortKey - secondSortKey;
  return firstArticle.article.localeCompare(secondArticle.article);
}

function compareArticlesByNumericFieldAsc(
  firstArticle: NumericSortableArticle,
  secondArticle: NumericSortableArticle,
  field: NumericSortField
): number {
  const a = firstArticle[field];
  const b = secondArticle[field];
  if (a !== b) return a - b;
  return firstArticle.article.localeCompare(secondArticle.article);
}

function formatProtectionSummary(protections: ArticleProtection[]): string {
  if (!protections?.length) return "none";
  return protections.map((p) => p.type).join(", ");
}

function xAxisTitleForKey(xAxisKey: XAxisKey): string {
  switch (xAxisKey) {
    case "title":
      return "Articles from A-Z (sort by title)";
    case "publication_date":
      return "Articles from oldest to newest (sort by publication date)";
    case "linguistic_versions_count":
      return "Articles from least to most linguistic versions (sort by number of linguistic versions)";
    case "article_size":
      return "Articles from smallest to largest (sort by article size)";
    case "lead_section_size":
      return "Articles from smallest to largest (sort by lead section size)";
    case "talk_size":
      return "Articles from smallest to largest (sort by discussion page size)";
    case "warning_tags_count":
      return "Articles from least to most warning tags (sort by number of warning tags)";
    case "images_count":
      return "Articles from least to most images (sort by number of images)";
    default:
      return "Articles";
  }
}

function convertAnalyticsToCSV(
  rows: Array<{
    article: string;
    average_daily_views: number;
    prev_average_daily_views: number | null;
    article_size: number;
    prev_article_size: number | null;
    lead_section_size: number;
    talk_size: number;
    prev_talk_size: number | null;
    number_of_editors: number;
    linguistic_versions_count: number;
    warning_tags_count: number;
    images_count: number;
    assessment_grade: string | null;
    publication_date: string | null;
    protection_summary?: string;
  }>
): string {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent +=
    "Article,Publication Date,Average Daily Views,Average Daily Views (prev year),Article Size,Article Size (prev year),Lead Section Size,Talk Size,Talk Size (prev year),Number of Editors,Linguistic Versions,Warning Tags,Images,Assessment Grade,Protections\n";
  rows.forEach((row) => {
    csvContent +=
      [
        escapeCSVSpecialCharacters(row.article),
        row.publication_date ?? "",
        row.average_daily_views,
        row.prev_average_daily_views ?? "",
        row.article_size,
        row.prev_article_size ?? "",
        row.lead_section_size,
        row.talk_size,
        row.prev_talk_size ?? "",
        row.number_of_editors,
        row.linguistic_versions_count,
        row.warning_tags_count,
        row.images_count,
        row.assessment_grade ?? "",
        escapeCSVSpecialCharacters(row.protection_summary ?? ""),
      ].join(",") + "\n";
  });
  return csvContent;
}

function getAssessmentColor(grade?: string | null): string {
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

export {
  compareArticlesByPublicationDateAsc,
  compareArticlesByNumericFieldAsc,
  formatProtectionSummary,
  xAxisTitleForKey,
  convertAnalyticsToCSV,
  getAssessmentColor,
};
