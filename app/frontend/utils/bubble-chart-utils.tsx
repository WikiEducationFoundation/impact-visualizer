import { escapeCSVSpecialCharacters } from "./search-utils";
import type {
  ArticleAnalytics,
  ArticleProtection,
  ChartRow,
  NumericSortField,
  XAxisKey,
  YAxisConfig,
  YAxisDomain,
  YAxisKey,
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

export const GRADE_KEYS = [
  "FA",
  "FL",
  "A",
  "GA",
  "B",
  "C",
  "Start",
  "Stub",
  "List",
  "Unassessed",
];

export const RAW_ASSESSMENT_COLORS: Record<string, string> = {
  FA: "#F7B1FF",
  GA: "#3AD358",
  A: "#66FFFF",
  FL: "#F7B1FF",
  B: "#9CEA72",
  C: "#FBF090",
  Start: "#F3BA4F",
  Stub: "#FFA4A4",
  List: "#8FB2F8",
  Unassessed: "#9e9e9e",
};
function getAssessmentColor(grade?: string | null): string {
  return (
    (grade && RAW_ASSESSMENT_COLORS[grade]) || RAW_ASSESSMENT_COLORS.Unassessed
  );
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

const Y_AXIS_CONFIG: Record<YAxisKey, YAxisConfig> = {
  average_daily_views: {
    currentField: "average_daily_views",
    previousField: "prev_average_daily_views",
    axisTitle: "avg daily visits",
  },
  number_of_editors: {
    currentField: "number_of_editors",
    previousField: null,
    axisTitle: "editors",
  },
  incoming_links_count: {
    currentField: "incoming_links_count",
    previousField: null,
    axisTitle: "incoming links",
  },
};

function buildChartRows(
  data: Record<string, ArticleAnalytics>,
  colorMode: "assessment" | "single",
): ChartRow[] {
  return Object.entries(data).map(([article, analytics]) => {
    const protections = analytics?.article_protections ?? [];
    const palette = getAssessmentPalette(analytics?.assessment_grade);
    const bubble = colorMode === "single" ? SINGLE_COLOR_PALETTE : palette;

    return {
      article,
      ...analytics,
      classifications: analytics?.classifications ?? [],
      assessment_grade_color: palette.article,
      bubble_article_color: bubble.article,
      bubble_talk_color: bubble.talk,
      bubble_prev_color: bubble.prevArticle,
      bubble_lead_color: bubble.lead,
      protection_summary: formatProtectionSummary(protections),
      has_move_restriction: protections.some((p) => p.type === "move"),
      has_edit_restriction: protections.some((p) => p.type === "edit"),
    };
  });
}

function numericExtent<T>(
  items: T[],
  getValue: (item: T) => unknown,
  skip?: (item: T) => boolean,
): [number, number] | null {
  // Iterate rather than spread into Math.min/max: with tens of thousands of
  // articles, the spread exceeds the JS argument limit and throws RangeError.
  let min = Infinity;
  let max = -Infinity;
  for (const item of items) {
    if (skip?.(item)) continue;
    const v = getValue(item);
    if (typeof v === "number" && Number.isFinite(v)) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return min <= max ? [min, max] : null;
}

function parseYAxisDomain(minInput: string, maxInput: string): YAxisDomain {
  const parse = (input: string) => {
    if (input.trim() === "") return null;
    const value = Number(input);
    return Number.isFinite(value) ? value : null;
  };
  const domainMin = parse(minInput);
  const domainMax = parse(maxInput);
  if (domainMin !== null && domainMax !== null && domainMin > domainMax) {
    return { domainMin: domainMax, domainMax: domainMin };
  }
  return { domainMin, domainMax };
}

type ArticleFilters = {
  searchTerm: string;
  selectedGrades: Record<string, boolean>;
  filterMoveRestriction: boolean;
  filterEditRestriction: boolean;
  centralityMin: number;
  centralityMax: number;
  includeNoCentrality: boolean;
  yField: YAxisKey;
  yDomain: YAxisDomain;
  deselectedTags: Set<string>;
  includeUntagged: boolean;
};

// Mirrors the Vega visibility filter in bubble-chart-vega.ts, which the chart
// applies through signals; keep the two in sync.
function filterArticles(rows: ChartRow[], filters: ArticleFilters): ChartRow[] {
  const { domainMin, domainMax } = filters.yDomain;
  const lowerSearch = filters.searchTerm.trim().toLowerCase();

  return rows.filter((row) => {
    if (lowerSearch && !row.article.toLowerCase().includes(lowerSearch)) {
      return false;
    }

    if (!filters.selectedGrades[row.assessment_grade || "Unassessed"]) {
      return false;
    }

    if (filters.filterMoveRestriction && !row.has_move_restriction) {
      return false;
    }
    if (filters.filterEditRestriction && !row.has_edit_restriction) {
      return false;
    }

    if (typeof row.centrality === "number") {
      if (
        row.centrality < filters.centralityMin ||
        row.centrality > filters.centralityMax
      ) {
        return false;
      }
    } else if (!filters.includeNoCentrality) {
      return false;
    }

    const yValue = row[filters.yField];
    if (domainMin !== null && yValue < domainMin) return false;
    if (domainMax !== null && yValue > domainMax) return false;

    if (row.classifications.length > 0) {
      return row.classifications.some(
        (tag) => !filters.deselectedTags.has(tag),
      );
    }
    return filters.includeUntagged;
  });
}

function computeAggregateStats(
  rows: ChartRow[],
  topicStartDate?: string,
  topicEndDate?: string,
) {
  const daysElapsed = topicStartDate
    ? ((topicEndDate ? new Date(topicEndDate).getTime() : Date.now()) -
        new Date(topicStartDate).getTime()) /
      (1000 * 60 * 60 * 24)
    : null;

  const totalViews =
    daysElapsed !== null
      ? rows.reduce(
          (sum, row) => sum + row.average_daily_views * daysElapsed,
          0,
        )
      : null;

  return {
    totalArticles: rows.length,
    millionVisits: totalViews !== null ? totalViews / 1_000_000 : null,
    averageTotalViews:
      totalViews !== null && rows.length > 0
        ? Math.round(totalViews / rows.length)
        : null,
    averageArticleSize:
      rows.length > 0
        ? Math.round(
            rows.reduce((sum, r) => sum + r.article_size, 0) / rows.length,
          )
        : null,
    startDateLabel: topicStartDate
      ? new Date(topicStartDate).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
      : null,
  };
}

export {
  SINGLE_COLOR_PALETTE,
  Y_AXIS_CONFIG,
  buildChartRows,
  numericExtent,
  parseYAxisDomain,
  filterArticles,
  computeAggregateStats,
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

export type { AssessmentPalette, ArticleFilters };
