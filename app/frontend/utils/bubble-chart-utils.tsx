import { escapeCSVSpecialCharacters } from "./search-utils";
import type {
  ArticleProtection,
  NumericSortField,
  XAxisKey,
  NumericSortableArticle,
} from "../types/bubble-chart.type";

function compareArticlesByPublicationDateAsc(
  firstArticle: { publication_date: string | null; article: string },
  secondArticle: { publication_date: string | null; article: string },
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
  field: NumericSortField,
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

function xAxisTitleForKey(xAxisKey: XAxisKey): {
  ranked: string;
  scaled: string;
} {
  switch (xAxisKey) {
    case "title":
      return {
        ranked: "Articles from A-Z (sort by title)",
        scaled: "Article title",
      };
    case "publication_date":
      return {
        ranked: "Articles from oldest to newest (sort by creation date)",
        scaled: "Creation date",
      };
    case "linguistic_versions_count":
      return {
        ranked:
          "Articles from least to most linguistic versions (sort by number of linguistic versions)",
        scaled: "Linguistic versions",
      };
    case "article_size":
      return {
        ranked: "Articles from smallest to largest (sort by article size)",
        scaled: "Article size (bytes)",
      };
    case "lead_section_size":
      return {
        ranked: "Articles from smallest to largest (sort by lead section size)",
        scaled: "Lead section size (bytes)",
      };
    case "talk_size":
      return {
        ranked:
          "Articles from smallest to largest (sort by discussion page size)",
        scaled: "Discussion page size (bytes)",
      };
    case "warning_tags_count":
      return {
        ranked:
          "Articles from least to most warning tags (sort by number of warning tags)",
        scaled: "Warning tags",
      };
    case "images_count":
      return {
        ranked: "Articles from least to most images (sort by number of images)",
        scaled: "Images",
      };
    default:
      return { ranked: "Articles", scaled: "Value" };
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
    incoming_links_count: number;
    centrality: number | null;
    linguistic_versions_count: number;
    warning_tags_count: number;
    images_count: number;
    assessment_grade: string | null;
    publication_date: string | null;
    protection_summary?: string;
  }>,
): string {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent +=
    "Article,Creation Date,Average Daily Views,Average Daily Views (prev year),Article Size,Article Size (prev year),Lead Section Size,Talk Size,Talk Size (prev year),Number of Editors,Incoming Links,Centrality,Linguistic Versions,Warning Tags,Images,Assessment Grade,Protections\n";
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
        row.incoming_links_count,
        row.centrality ?? "",
        row.linguistic_versions_count,
        row.warning_tags_count,
        row.images_count,
        row.assessment_grade ?? "",
        escapeCSVSpecialCharacters(row.protection_summary ?? ""),
      ].join(",") + "\n";
  });
  return csvContent;
}

const ANALYTICS_EXPORT_HEADERS = [
  "Article",
  "Creation Date",
  "Average Daily Views",
  "Average Daily Views (prev year)",
  "Article Size",
  "Article Size (prev year)",
  "Lead Section Size",
  "Talk Size",
  "Talk Size (prev year)",
  "Number of Editors",
  "Incoming Links",
  "Centrality",
  "Linguistic Versions",
  "Warning Tags",
  "Images",
  "Assessment Grade",
  "Protections",
];

// Escape characters that would break out of a wikitable cell ("|" / "||")
// and flatten any stray newlines.
function escapeWikitextCell(value: string): string {
  return value.replace(/\|/g, "&#124;").replace(/[\r\n]+/g, " ");
}

function convertAnalyticsToWikitext(
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
    incoming_links_count: number;
    centrality: number | null;
    linguistic_versions_count: number;
    warning_tags_count: number;
    images_count: number;
    assessment_grade: string | null;
    publication_date: string | null;
    protection_summary?: string;
  }>,
): string {
  let wikitext = '{| class="wikitable sortable"\n';
  wikitext += `! ${ANALYTICS_EXPORT_HEADERS.join(" !! ")}\n`;
  rows.forEach((row) => {
    const cells = [
      `[[${escapeWikitextCell(row.article)}]]`,
      row.publication_date ?? "",
      row.average_daily_views,
      row.prev_average_daily_views ?? "",
      row.article_size,
      row.prev_article_size ?? "",
      row.lead_section_size,
      row.talk_size,
      row.prev_talk_size ?? "",
      row.number_of_editors,
      row.incoming_links_count,
      row.centrality ?? "",
      row.linguistic_versions_count,
      row.warning_tags_count,
      row.images_count,
      row.assessment_grade ?? "",
      escapeWikitextCell(row.protection_summary ?? ""),
    ];
    wikitext += `|-\n| ${cells.join(" || ")}\n`;
  });
  wikitext += "|}\n";
  return wikitext;
}

function makeSqrtAreaScale(
  values: number[],
  [rangeMin, rangeMax]: [number, number],
): (v: number) => number {
  // Iterate rather than spread into Math.min/max: with tens of thousands of
  // articles, the spread exceeds the JS argument limit and throws RangeError.
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const sMin = Math.sqrt(min);
  const sMax = Math.sqrt(max);
  if (sMax === sMin) return () => (rangeMin + rangeMax) / 2;
  return (v) => {
    const t = (Math.sqrt(v) - sMin) / (sMax - sMin);
    return rangeMin + t * (rangeMax - rangeMin);
  };
}

function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const channel = (shift: number) => {
    const c = (num >> shift) & 0xff;
    const next = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
    return Math.min(255, Math.max(0, Math.round(next)));
  };
  const r = channel(16);
  const g = channel(8);
  const b = channel(0);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const RAW_ASSESSMENT_COLORS: Record<string, string> = {
  FA: "#9CBDFF",
  GA: "#66FF66",
  A: "#66FFFF",
  FL: "#9CBDFF",
  B: "#B2FF66",
  C: "#FFFF66",
  Start: "#FFAA66",
  Stub: "#FFA4A4",
  List: "#C7B1FF",
};
const UNASSESSED_COLOR = "#9e9e9e";
const BASE_DARKEN = -0.12;

function getAssessmentColor(grade?: string | null): string {
  const raw = (grade && RAW_ASSESSMENT_COLORS[grade]) || UNASSESSED_COLOR;
  return shadeColor(raw, BASE_DARKEN);
}

type AssessmentPalette = {
  article: string;
  lead: string;
  talk: string;
  prevArticle: string;
};

function getPaletteFromBase(base: string): AssessmentPalette {
  return {
    article: base,
    lead: shadeColor(base, 0.35),
    talk: shadeColor(base, -0.22),
    prevArticle: shadeColor(base, -0.1),
  };
}

function getAssessmentPalette(grade?: string | null): AssessmentPalette {
  return getPaletteFromBase(getAssessmentColor(grade));
}

const SINGLE_COLOR_BASE = "#2f6d9e";
const SINGLE_COLOR_PALETTE: AssessmentPalette =
  getPaletteFromBase(SINGLE_COLOR_BASE);

export {
  SINGLE_COLOR_PALETTE,
  compareArticlesByPublicationDateAsc,
  compareArticlesByNumericFieldAsc,
  formatProtectionSummary,
  xAxisTitleForKey,
  convertAnalyticsToCSV,
  convertAnalyticsToWikitext,
  getAssessmentColor,
  getAssessmentPalette,
  shadeColor,
  makeSqrtAreaScale,
};

export type { AssessmentPalette };
