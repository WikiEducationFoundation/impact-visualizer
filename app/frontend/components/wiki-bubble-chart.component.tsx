import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  startTransition,
  useDeferredValue,
} from "react";
import vegaEmbed, { VisualizationSpec, EmbedOptions, Result } from "vega-embed";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BsBook,
  BsInfoCircle,
  BsImage,
  BsLink45Deg,
  BsCheck2,
} from "react-icons/bs";
import { MdLegendToggle } from "react-icons/md";
import { FaChevronUp, FaChevronDown } from "react-icons/fa6";
import CSVButton from "./CSV-button.component";
import WikitextButton from "./wikitext-button.component";
import ArticleSearchAutocomplete from "./article-search-autocomplete.component";
import ArticleDetailPanel from "./article-detail-panel.component";
import FilteredArticlesSidebar from "./filtered-articles-sidebar.component";
import ArticleLanguagesGrid from "./article-languages-grid.component";
import ArticleLanguageComparisonModal from "./article-language-comparison-modal.component";
import GlossaryModal from "./glossary-modal.component";
import LegendModal from "./legend-modal.component";
import AdvancedFilterPanel from "./advanced-filter-panel.component";
import AxisControls from "./axis-controls.component";
import type { ArticleRow } from "./article-detail-panel.component";
import type {
  ArticleAnalytics,
  XAxisKey,
  YAxisKey,
} from "../types/bubble-chart.type";
import {
  convertAnalyticsToCSV,
  convertAnalyticsToWikitext,
  getAssessmentPalette,
  SINGLE_COLOR_PALETTE,
  compareArticlesByPublicationDateAsc,
  compareArticlesByNumericFieldAsc,
  formatProtectionSummary,
  xAxisTitleForKey,
} from "../utils/bubble-chart-utils";
import TopicService from "../services/topic.service";
import { fetchLanguageLinks, TARGET_LANGUAGES } from "../utils/language-links";
import type { LangLinksProgress } from "../utils/language-links";
import { exportChartImage } from "../utils/chart-image-export";
import {
  decodeChartState,
  encodeChartState,
  DEFAULT_CHART_UI_STATE,
  GRADE_KEYS,
  CENTRALITY_MIN,
  CENTRALITY_MAX,
} from "../utils/bubble-chart-permalink";

type Wiki = {
  language: string;
  project: string;
};

interface WikiBubbleChartProps {
  data?: Record<string, ArticleAnalytics>;
  actions?: boolean;
  wiki?: Wiki;
  topicId?: string | number;
  topicName?: string;
  topicStartDate?: string;
  topicEndDate?: string;
  canEdit?: boolean;
  isTopicBuilderTopic?: boolean;
}

const HEIGHT = 650;
const LARGE_DATASET_THRESHOLD = 10000;

// Largest bubble radius (Vega derives radius from area; max size range is 1500).
const MAX_CIRCLE_RADIUS = Math.sqrt(1500 / Math.PI);
const Y_BOTTOM_MARGIN = MAX_CIRCLE_RADIUS * 2;

// Post-compile tweaks Vega-Lite can't express directly.
const patchChartScales = (vgSpec: any) => {
  try {
    const scales = vgSpec.scales || [];

    // Clamp x pan/zoom to the data extent (no dragging into empty space; no-op
    // once every bubble is visible). The bound x domain is recomputed by
    // panLinear/zoomLinear each frame, so we rewrite those to clamp at the
    // source against `x_base` — the x scale without the interactive override.
    const xScale = scales.find((s: any) => s.name === "x");
    if (xScale && xScale.domainRaw) {
      if (!scales.some((s: any) => s.name === "x_base")) {
        const base = { ...xScale, name: "x_base" };
        delete base.domainRaw;
        scales.push(base);
        vgSpec.scales = scales;
      }
      // convert to number to avoid issues with date objects
      const Blo = "toNumber(domain('x_base')[0])";
      const Bhi = "toNumber(domain('x_base')[1])";
      const clamp = (proposed: string) =>
        `(span(${proposed}) >= (${Bhi} - ${Blo}) ? [${Blo}, ${Bhi}]` +
        ` : (${proposed})[0] < ${Blo} ? [${Blo}, ${Blo} + span(${proposed})]` +
        ` : (${proposed})[1] > ${Bhi} ? [${Bhi} - span(${proposed}), ${Bhi}]` +
        ` : (${proposed}))`;
      for (const sig of vgSpec.signals || []) {
        if (!Array.isArray(sig.on)) continue;
        for (const handler of sig.on) {
          if (
            typeof handler.update === "string" &&
            /panLinear|zoomLinear/.test(handler.update)
          ) {
            handler.update = clamp(handler.update);
          }
        }
      }
    }

    // Inset the y range's bottom so low-value bubbles clear the floor. Done in
    // pixel space: scale.padding is ignored once domainMin/Max are set, and
    // lowering the domain would expose negative axis values.
    const yScale = scales.find((s: any) => s.name === "y");
    if (yScale && Array.isArray(yScale.range) && yScale.range.length === 2) {
      if (!scales.some((s: any) => s.name === "y_grid")) {
        const gridClone = { ...yScale, name: "y_grid" };
        delete gridClone.domainRaw;
        scales.push(gridClone);
        vgSpec.scales = scales;
      }
      for (const axis of vgSpec.axes || []) {
        if (axis.scale === "x" && axis.grid && axis.gridScale === "y") {
          axis.gridScale = "y_grid";
        }
      }

      const bottom = yScale.range[0];
      const bottomExpr =
        bottom && typeof bottom === "object" && "signal" in bottom
          ? bottom.signal
          : String(bottom);
      yScale.range = [
        { signal: `(${bottomExpr}) - ${Y_BOTTOM_MARGIN}` },
        yScale.range[1],
      ];
    }
  } catch {
    // leave the spec untouched if the compiled shape is unexpected
  }
  return vgSpec;
};

export const WikiBubbleChart: React.FC<WikiBubbleChartProps> = ({
  data = {},
  actions = false,
  wiki,
  topicId,
  topicName,
  topicStartDate,
  topicEndDate,
  canEdit = false,
  isTopicBuilderTopic = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<Result | null>(null);
  const sortedRowsRef = useRef<any[]>([]);
  const lastEmbeddedSortedRowsRef = useRef<any[] | null>(null);
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Parse the shared view from the URL exactly once, so every control below can
  // initialize straight from it without a URL->state effect (which would loop).
  const [initialState] = useState(() => decodeChartState(searchParams));

  const [selectedGrades, setSelectedGrades] = useState<Record<string, boolean>>(
    initialState.selectedGrades,
  );

  const [deselectedTags, setDeselectedTags] = useState<Set<string>>(
    () => new Set(initialState.deselectedTags),
  );
  const [includeUntagged, setIncludeUntagged] = useState<boolean>(
    initialState.includeUntagged,
  );
  const [xAxisKey, setXAxisKey] = useState<XAxisKey>(initialState.xAxisKey);
  const [xAxisMode, setXAxisMode] = useState<"ranked" | "scaled">(
    initialState.xAxisMode,
  );
  const [yAxisKey, setYAxisKey] = useState<YAxisKey>(initialState.yAxisKey);
  const [yAxisScaleType, setYAxisScaleType] = useState<"linear" | "log">(
    initialState.yAxisScaleType,
  );
  const [yAxisMinInput, setYAxisMinInput] = useState<string>(
    initialState.yAxisMin,
  );
  const [yAxisMaxInput, setYAxisMaxInput] = useState<string>(
    initialState.yAxisMax,
  );
  const [committedYAxisMinInput, setCommittedYAxisMinInput] = useState<string>(
    initialState.yAxisMin,
  );
  const [committedYAxisMaxInput, setCommittedYAxisMaxInput] = useState<string>(
    initialState.yAxisMax,
  );
  const yAxisDomainDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [filterMoveRestriction, setFilterMoveRestriction] = useState<boolean>(
    initialState.filterMoveRestriction,
  );
  const [filterEditRestriction, setFilterEditRestriction] = useState<boolean>(
    initialState.filterEditRestriction,
  );
  const [centralityMin, setCentralityMin] = useState<number>(
    initialState.centralityMin,
  );
  const [centralityMax, setCentralityMax] = useState<number>(
    initialState.centralityMax,
  );
  const [includeNoCentrality, setIncludeNoCentrality] = useState<boolean>(
    initialState.includeNoCentrality,
  );
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(() => {
    const s = initialState;
    return (
      s.deselectedTags.length > 0 ||
      !s.includeUntagged ||
      s.centralityMin !== DEFAULT_CHART_UI_STATE.centralityMin ||
      s.centralityMax !== DEFAULT_CHART_UI_STATE.centralityMax ||
      !s.includeNoCentrality ||
      s.filterMoveRestriction ||
      s.filterEditRestriction ||
      GRADE_KEYS.some((g) => s.selectedGrades[g] === false)
    );
  });
  const [searchTerm, setSearchTerm] = useState<string>(initialState.searchTerm);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedArticle, setSelectedArticle] = useState<ArticleRow | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"overview" | "languages">(
    "overview",
  );
  const [langCompareArticle, setLangCompareArticle] = useState<string | null>(
    null,
  );
  const [glossaryOpen, setGlossaryOpen] = useState<boolean>(false);
  const [legendOpen, setLegendOpen] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(
    initialState.showLabels,
  );
  const [colorMode, setColorMode] = useState<"assessment" | "single">(
    initialState.colorMode,
  );
  const [excludedOutliers, setExcludedOutliers] = useState<Set<string>>(
    () => new Set(initialState.excludedOutliers),
  );
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const searchSignalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const linkCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevYAxisKeyRef = useRef<YAxisKey>(initialState.yAxisKey);

  const yAxisConfig = useMemo(() => {
    switch (yAxisKey) {
      case "average_daily_views":
        return {
          currentField: "average_daily_views" as const,
          previousField: "prev_average_daily_views" as const,
          axisTitle: "avg daily visits",
        };
      case "number_of_editors":
        return {
          currentField: "number_of_editors" as const,
          previousField: null,
          axisTitle: "editors",
        };
      case "incoming_links_count":
        return {
          currentField: "incoming_links_count" as const,
          previousField: null,
          axisTitle: "incoming links",
        };
      default: {
        const _exhaustiveCheck: never = yAxisKey;
        return _exhaustiveCheck;
      }
    }
  }, [yAxisKey]);

  const rows = useMemo(() => {
    if (data && typeof data === "object") {
      return Object.entries(data).map(([article, analytics]) => {
        const protections = analytics?.article_protections ?? [];
        const hasMoveRestriction = protections.some((p) => p.type === "move");
        const hasEditRestriction = protections.some((p) => p.type === "edit");
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
          has_move_restriction: hasMoveRestriction,
          has_edit_restriction: hasEditRestriction,
        };
      });
    }
    return [];
  }, [data, colorMode]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      for (const tag of row.classifications) set.add(tag);
    }
    return [...set].sort();
  }, [rows]);

  // Stable dependency so the Vega spec rebuilds only when the tag set changes,
  // not on every tag toggle (toggles are signal-driven, like grades).
  const availableTagsKey = useMemo(
    () => availableTags.join("|"),
    [availableTags],
  );

  const sortedRows = useMemo(() => {
    if (!rows.length) return [];

    const next = [...rows];

    const comparator = (() => {
      switch (xAxisKey) {
        case "publication_date":
          return compareArticlesByPublicationDateAsc;
        case "title":
          return (a: any, b: any) => a.article.localeCompare(b.article);
        default:
          return (a: any, b: any) =>
            compareArticlesByNumericFieldAsc(a, b, xAxisKey);
      }
    })();

    next.sort(comparator);

    return next;
  }, [rows, xAxisKey]);

  const [langLinksProgress, setLangLinksProgress] = useState<LangLinksProgress>(
    { done: 0, total: 0 },
  );

  const {
    data: languageLinks = new Map<string, Set<string>>(),
    isPending: langLinksLoading,
    error: langLinksError,
  } = useQuery({
    queryKey: ["languageLinks", topicId],
    queryFn: () => {
      const articles = sortedRows.map((r) => r.article);
      return fetchLanguageLinks(topicId!, articles, setLangLinksProgress);
    },
    enabled: activeTab === "languages" && !!topicId && sortedRows.length > 0,
    staleTime: 4 * 60 * 60 * 1000,
    gcTime: 4 * 60 * 60 * 1000,
  });

  const articleTitles = useMemo(() => {
    return sortedRows.map((row) => row.article);
  }, [sortedRows]);

  // Stable key for the excluded set so it can drive memo/effect deps without
  // relying on Set identity (which changes on every toggle).
  const excludedKey = useMemo(
    () => [...excludedOutliers].sort().join("|"),
    [excludedOutliers],
  );

  const yAxisAutoDomain = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let found = false;
    for (let i = 0; i < rows.length; i++) {
      // Trimmed outliers must not stretch the auto domain, otherwise removing
      // them from the plot would not actually rescale the remaining bubbles.
      if (excludedOutliers.has(rows[i].article)) continue;
      const v = rows[i][yAxisConfig.currentField];
      if (typeof v === "number" && Number.isFinite(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
        found = true;
      }
    }
    if (!found)
      return { min: null as number | null, max: null as number | null };
    return { min, max };
  }, [rows, yAxisConfig.currentField, excludedOutliers]);

  // Full-data extent for the x axis, used to pin the x scale domain so filtering
  // hides bubbles without repacking or re-scaling (articles keep a fixed x
  // position). Computed over all rows for the current x field.
  const xFullDomain = useMemo<[number, number] | null>(() => {
    const isScaled = xAxisMode === "scaled" && xAxisKey !== "title";
    if (!isScaled) {
      return rows.length ? [1, rows.length] : null;
    }
    let min = Infinity;
    let max = -Infinity;
    let found = false;
    for (let i = 0; i < rows.length; i++) {
      const v =
        xAxisKey === "publication_date"
          ? rows[i].publication_date
            ? Date.parse(rows[i].publication_date as string)
            : NaN
          : (rows[i] as any)[xAxisKey];
      if (typeof v === "number" && Number.isFinite(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
        found = true;
      }
    }
    return found ? [min, max] : null;
  }, [rows, xAxisKey, xAxisMode]);
  const xDomainMin = xFullDomain ? xFullDomain[0] : null;
  const xDomainMax = xFullDomain ? xFullDomain[1] : null;

  const parsedYAxisDomain = useMemo(() => {
    const parsedMin =
      committedYAxisMinInput.trim() === ""
        ? null
        : Number(committedYAxisMinInput);
    const parsedMax =
      committedYAxisMaxInput.trim() === ""
        ? null
        : Number(committedYAxisMaxInput);
    let domainMin =
      parsedMin !== null && Number.isFinite(parsedMin) ? parsedMin : null;
    let domainMax =
      parsedMax !== null && Number.isFinite(parsedMax) ? parsedMax : null;

    if (domainMin !== null && domainMax !== null && domainMin > domainMax) {
      [domainMin, domainMax] = [domainMax, domainMin];
    }
    return { domainMin, domainMax };
  }, [committedYAxisMinInput, committedYAxisMaxInput]);

  useEffect(() => {
    if (yAxisDomainDebounceRef.current) {
      clearTimeout(yAxisDomainDebounceRef.current);
    }
    yAxisDomainDebounceRef.current = setTimeout(() => {
      setCommittedYAxisMinInput(yAxisMinInput);
      setCommittedYAxisMaxInput(yAxisMaxInput);
    }, 250);
    return () => {
      if (yAxisDomainDebounceRef.current) {
        clearTimeout(yAxisDomainDebounceRef.current);
      }
    };
  }, [yAxisMinInput, yAxisMaxInput]);

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

  const aggregateStats = {
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

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredArticles = useMemo(() => {
    const { domainMin, domainMax } = parsedYAxisDomain;
    const lowerSearch = deferredSearchTerm.trim().toLowerCase();

    return sortedRows.filter((row) => {
      if (lowerSearch && !row.article.toLowerCase().includes(lowerSearch)) {
        return false;
      }

      const grade = row.assessment_grade;
      if (grade) {
        if (!selectedGrades[grade]) return false;
      } else {
        if (!selectedGrades.Unassessed) return false;
      }

      if (filterMoveRestriction && !row.has_move_restriction) {
        return false;
      }
      if (filterEditRestriction && !row.has_edit_restriction) {
        return false;
      }

      if (typeof row.centrality === "number") {
        if (row.centrality < centralityMin || row.centrality > centralityMax) {
          return false;
        }
      } else if (!includeNoCentrality) {
        return false;
      }

      const yValue = row[yAxisConfig.currentField];
      if (domainMin !== null && yValue < domainMin) {
        return false;
      }
      if (domainMax !== null && yValue > domainMax) {
        return false;
      }

      const rowTags = row.classifications ?? [];
      if (rowTags.length > 0) {
        let anySelected = false;
        for (const tag of rowTags) {
          if (!deselectedTags.has(tag)) {
            anySelected = true;
            break;
          }
        }
        if (!anySelected) return false;
      } else if (!includeUntagged) {
        return false;
      }

      return true;
    });
  }, [
    sortedRows,
    deferredSearchTerm,
    selectedGrades,
    filterMoveRestriction,
    filterEditRestriction,
    centralityMin,
    centralityMax,
    includeNoCentrality,
    parsedYAxisDomain,
    yAxisConfig.currentField,
    deselectedTags,
    includeUntagged,
  ]);

  useEffect(() => {
    // Only clear the range on a genuine y-axis change. Skipping the no-op mount
    // run (and any StrictMode re-run) keeps a y-range restored from the URL.
    if (prevYAxisKeyRef.current === yAxisKey) return;
    prevYAxisKeyRef.current = yAxisKey;
    setYAxisMinInput("");
    setYAxisMaxInput("");
    setCommittedYAxisMinInput("");
    setCommittedYAxisMaxInput("");
  }, [yAxisKey]);

  sortedRowsRef.current = sortedRows;
  const hasData = sortedRows.length > 0;
  const isLargeDatasetBucket = sortedRows.length > LARGE_DATASET_THRESHOLD;

  useEffect(() => {
    if (!containerRef.current || !hasData) return;

    const currentSortedRows = sortedRowsRef.current;
    const isLogScale = yAxisScaleType === "log";

    let yScaleSpec: Record<string, any>;
    if (isLogScale) {
      const logAutoMin =
        yAxisAutoDomain.min !== null && yAxisAutoDomain.min > 0
          ? yAxisAutoDomain.min
          : 1;
      const logAutoMax = yAxisAutoDomain.max ?? 1000;
      yScaleSpec = {
        type: "log",
        domainMin: {
          expr: `max(1, isFinite(y_domain_min) && y_domain_min > 0 ? y_domain_min : ${logAutoMin}) * 0.6`,
        },
        domainMax: {
          expr: `(isFinite(y_domain_max) ? y_domain_max : ${logAutoMax}) * 1.8`,
        },
      };
    } else {
      // Fall back to the auto domain when no user range; clamp autoMin to 0.
      const autoMin =
        yAxisAutoDomain.min !== null ? Math.max(0, yAxisAutoDomain.min) : 0;
      const autoMax = yAxisAutoDomain.max ?? 1000;
      const loExpr = `(isFinite(y_domain_min) ? y_domain_min : ${autoMin})`;
      const hiExpr = `(isFinite(y_domain_max) ? y_domain_max : ${autoMax})`;
      // Radius padding in domain units so boundary bubbles stay visible; max(,1)
      // guards a degenerate span; domainMin clamps to 0 (no below-zero axis).
      const spanExpr = `max((${hiExpr}) - (${loExpr}), 1)`;
      const padExpr = `(${MAX_CIRCLE_RADIUS} * (${spanExpr}) / ${HEIGHT})`;
      yScaleSpec = {
        domainMin: {
          expr: `max(0, (${loExpr}) - ${padExpr})`,
        },
        domainMax: {
          expr: `(${hiExpr}) + ${padExpr}`,
        },
      };
    }

    const isScaledMode = xAxisMode === "scaled" && xAxisKey !== "title";

    const xEncoding: any = isScaledMode
      ? xAxisKey === "publication_date"
        ? {
            field: "publication_date",
            type: "temporal",
            axis: {
              title: xAxisTitleForKey(xAxisKey).scaled,
              labels: true,
              ticks: true,
              grid: true,
            },
          }
        : {
            field: xAxisKey,
            type: "quantitative",
            axis: {
              title: xAxisTitleForKey(xAxisKey).scaled,
              labels: true,
              ticks: true,
              grid: true,
            },
          }
      : {
          field: "idx",
          type: "quantitative",
          axis: {
            title: xAxisTitleForKey(xAxisKey).ranked,
            labels: false,
            ticks: false,
            grid: false,
          },
        };

    // Edge padding so the first/last bubble isn't clipped (the pan clamp
    // otherwise pins the domain flush to the data). Pin the domain to the full
    // data extent so filtering hides bubbles without repacking/re-scaling —
    // every article keeps a fixed x position for comparison across filters.
    xEncoding.scale = {
      ...(xEncoding.scale || {}),
      padding: MAX_CIRCLE_RADIUS,
      ...(xFullDomain ? { domain: xFullDomain } : {}),
    };

    const yFieldExpr = `datum[${JSON.stringify(yAxisConfig.currentField)}]`;
    const yFilterExprParts: string[] = [];
    if (isLogScale) yFilterExprParts.push(`${yFieldExpr} > 0`);
    yFilterExprParts.push(
      `(!isFinite(y_domain_min) || ${yFieldExpr} >= y_domain_min)`,
    );
    yFilterExprParts.push(
      `(!isFinite(y_domain_max) || ${yFieldExpr} <= y_domain_max)`,
    );
    const yFilterExpr = yFilterExprParts.join(" && ");

    const yEncoding: any = {
      field: yAxisConfig.currentField,
      type: "quantitative",
      scale: yScaleSpec,
    };

    const tagFilterExpr = availableTags.length
      ? `((length(datum.classifications) == 0 && include_untagged) || (${availableTags
          .map(
            (tag, i) =>
              `(tag_${i} && indexof(datum.classifications, ${JSON.stringify(tag)}) >= 0)`,
          )
          .join(" || ")}))`
      : "true";

    const visibilityFilterExpr = [
      "(!search_input || indexof(lower(datum.article), search_input) >= 0)",
      "((grade_FA && datum.assessment_grade == 'FA') || (grade_FL && datum.assessment_grade == 'FL') || (grade_GA && datum.assessment_grade == 'GA') || (grade_A && datum.assessment_grade == 'A') || (grade_B && datum.assessment_grade == 'B') || (grade_C && datum.assessment_grade == 'C') || (grade_Start && datum.assessment_grade == 'Start') || (grade_Stub && datum.assessment_grade == 'Stub') || (grade_List && datum.assessment_grade == 'List') || (grade_Unassessed && !datum.assessment_grade))",
      "((!filter_move_restriction || datum.has_move_restriction) && (!filter_edit_restriction || datum.has_edit_restriction))",
      "((isValid(datum.centrality) && datum.centrality >= centrality_min && datum.centrality <= centrality_max) || (!isValid(datum.centrality) && include_no_centrality))",
      "(indexof(trimmed_articles, datum.article) < 0)",
      tagFilterExpr,
    ].join(" && ");

    const rankedSortField =
      xAxisKey === "title"
        ? "article"
        : xAxisKey === "publication_date"
          ? "publication_date"
          : xAxisKey;

    const rankedSort =
      rankedSortField === "article"
        ? [{ field: "article", order: "ascending" as const }]
        : [
            { field: rankedSortField, order: "ascending" as const },
            { field: "article", order: "ascending" as const },
          ];

    const isLargeDataset = currentSortedRows.length > LARGE_DATASET_THRESHOLD;

    const useHighlight = !isLargeDataset;

    const makeOpacityEncoding = (activeOpacity: number) =>
      useHighlight
        ? {
            condition: [
              { param: "highlight", empty: false, value: activeOpacity },
              {
                test: "!highlight.article",
                value: activeOpacity,
              },
            ],
            value: 0.06,
          }
        : { value: activeOpacity };

    const spec: VisualizationSpec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      height: HEIGHT,
      width: "container",
      background: "#ffffff",
      data: { name: "main", values: currentSortedRows },
      transform: [
        { window: [{ op: "row_number", as: "idx" }], sort: rankedSort },
        { filter: yFilterExpr },
        { filter: visibilityFilterExpr },
      ],
      config: {
        legend: { disable: true },
        style: {
          cell: { cursor: "grab" },
        },
      },
      params: [
        { name: "search_input", value: searchTerm.trim().toLowerCase() },
        { name: "grade_FA", value: selectedGrades.FA },
        { name: "grade_GA", value: selectedGrades.GA },
        { name: "grade_A", value: selectedGrades.A },
        { name: "grade_FL", value: selectedGrades.FL },
        { name: "grade_B", value: selectedGrades.B },
        { name: "grade_C", value: selectedGrades.C },
        { name: "grade_Start", value: selectedGrades.Start },
        { name: "grade_Stub", value: selectedGrades.Stub },
        { name: "grade_List", value: selectedGrades.List },
        { name: "grade_Unassessed", value: selectedGrades.Unassessed },
        { name: "filter_move_restriction", value: filterMoveRestriction },
        { name: "filter_edit_restriction", value: filterEditRestriction },
        { name: "centrality_min", value: centralityMin },
        { name: "centrality_max", value: centralityMax },
        { name: "include_no_centrality", value: includeNoCentrality },
        { name: "trimmed_articles", value: [...excludedOutliers] },
        ...availableTags.map((tag, i) => ({
          name: `tag_${i}`,
          value: !deselectedTags.has(tag),
        })),
        { name: "include_untagged", value: includeUntagged },
        {
          name: "y_domain_min",
          value:
            parsedYAxisDomain.domainMin !== null
              ? parsedYAxisDomain.domainMin
              : -Infinity,
        },
        {
          name: "y_domain_max",
          value:
            parsedYAxisDomain.domainMax !== null
              ? parsedYAxisDomain.domainMax
              : Infinity,
        },
      ],

      layer: [
        {
          mark: {
            type: "circle",
            opacity: 0,
          },
          params: [
            ...(useHighlight
              ? [
                  {
                    name: "highlight",
                    select: {
                      type: "point" as const,
                      fields: ["article"],
                      on: { type: "pointerover", throttle: 50 } as any,
                      clear: "pointerout",
                    },
                  },
                ]
              : []),
            {
              name: "grid",
              select: { type: "interval", zoom: true, encodings: ["x"] },
              bind: "scales",
            },
            {
              name: "clickSelection",
              select: {
                type: "point",
                fields: ["article"],
                on: "click",
              },
            },
          ],
          encoding: {
            y: yEncoding,
          },
        },
        ...(yAxisConfig.previousField
          ? [
              {
                mark: {
                  type: "rule" as const,
                  strokeDash: [2, 4],
                  strokeWidth: 1.2,
                  opacity: 0.6,
                },
                ...(isLogScale
                  ? {
                      transform: [
                        {
                          filter: `datum[${JSON.stringify(yAxisConfig.previousField)}] > 0`,
                        },
                      ],
                    }
                  : {}),
                encoding: {
                  y: {
                    field: yAxisConfig.previousField,
                    type: "quantitative" as const,
                  },
                  y2: {
                    field: yAxisConfig.currentField,
                    type: "quantitative" as const,
                  },
                },
              },
            ]
          : []),

        // Discussion size circle (talk_size)
        {
          mark: {
            type: "circle",
            fill: null,
            strokeWidth: 1.5,
            cursor: "pointer",
          },
          encoding: {
            y: yEncoding,
            size: {
              field: "talk_size",
              type: "quantitative",
              scale: { type: "sqrt", range: [50, 1500] },
            },
            stroke: {
              field: "bubble_talk_color",
              type: "nominal",
              scale: null,
              legend: null,
            },
            opacity: makeOpacityEncoding(1),
          },
        },
        // Previous article size circle (prev_article_size)
        {
          mark: {
            type: "circle",
            fill: null,
            strokeDash: [4, 4],
            strokeWidth: 1.5,
            cursor: "pointer",
          },
          encoding: {
            y: yEncoding,
            size: {
              field: "prev_article_size",
              type: "quantitative",
              scale: { type: "sqrt", range: [20, 600] },
            },
            stroke: {
              field: "bubble_prev_color",
              type: "nominal",
              scale: null,
              legend: null,
            },
            opacity: makeOpacityEncoding(1),
          },
        },
        // Lead section size circle (lead_section_size)
        {
          mark: {
            type: "circle",
            opacity: 0.8,
            cursor: "pointer",
          },
          encoding: {
            y: yEncoding,
            size: {
              field: "lead_section_size",
              type: "quantitative",
              scale: { type: "sqrt", range: [30, 800] },
            },
            fill: {
              field: "bubble_lead_color",
              type: "nominal",
              scale: null,
              legend: null,
            },
            opacity: makeOpacityEncoding(0.8),
          },
        },
        // Article size circle (article_size), colored by quality assessment
        {
          mark: {
            type: "circle",
            opacity: 1,
            stroke: "white",
            strokeWidth: 1,
            cursor: "pointer",
            tooltip: {
              signal: `{
                title: datum.assessment_grade
                  ? '<div style=\"display:flex;align-items:flex-start;justify-content:space-between;gap:8px;width:100%\">' +
                      '<div style=\"display:flex;flex-direction:column;\">' +
                        '<span style=\"font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">' + datum.article + '</span>' +
                        ((datum.publication_date && isValid(toDate(datum.publication_date)))
                          ? '<span style=\"font-size:12px;color:#666;margin-top:2px\">' + timeFormat(toDate(datum.publication_date), '%b %d, %Y') + '</span>'
                          : '') +
                      '</div>' +
                      '<span style=\"background-color:' + datum.assessment_grade_color + '; padding:2px 6px; border-radius:4px; color:#000; white-space:nowrap; flex:0 0 auto\">' + datum.assessment_grade + '</span>' +
                    '</div>'
                  : '<div style=\"display:flex;flex-direction:column\">' +
                      '<span style=\"font-weight:600\">' + datum.article + '</span>' +
                      ((datum.publication_date && isValid(toDate(datum.publication_date)))
                        ? '<span style=\"font-size:12px;color:#666;margin-top:2px\">' + timeFormat(toDate(datum.publication_date), '%b %d, %Y') + '</span>'
                        : '') +
                    '</div>',
                "Daily visits": format(datum.average_daily_views, ','),
                "Daily visits (prev year)": isValid(datum.prev_average_daily_views) ? format(datum.prev_average_daily_views, ',') : 'n/a',
                "Size": format(datum.article_size, ','),
                "Size (prev year)": isValid(datum.prev_article_size) ? format(datum.prev_article_size, ',') : 'n/a',
                "Lead size": format(datum.lead_section_size, ','),
                "Talk size": format(datum.talk_size, ','),
                "Talk size (prev year)": isValid(datum.prev_talk_size) ? format(datum.prev_talk_size, ',') : 'n/a',
                "Editors": format(datum.number_of_editors, ','),
                "Incoming links": format(datum.incoming_links_count, ','),
                "Centrality": isValid(datum.centrality) ? format(datum.centrality, ',') : 'n/a',
                "Linguistic versions": format(datum.linguistic_versions_count, ','),
                "Warning tags": format(datum.warning_tags_count, ','),
                "Images": format(datum.images_count, ','),
                "Protections": datum.protection_summary,
              }`,
            },
          },
          encoding: {
            y: yEncoding,
            size: {
              field: "article_size",
              type: "quantitative",
              scale: { type: "sqrt", range: [20, 600] },
            },
            fill: {
              field: "bubble_article_color",
              type: "nominal",
              scale: null,
              legend: null,
            },
            opacity: makeOpacityEncoding(1),
          },
        },
        ...(showLabels
          ? [
              {
                mark: {
                  type: "text" as const,
                  align: "center" as const,
                  baseline: "bottom" as const,
                  dy: -10,
                  angle: 0,
                  fontSize: 9,
                  limit: 120,
                  clip: true,
                },
                encoding: {
                  text: { field: "article", type: "nominal" as const },
                  opacity: { value: 1 },
                },
              },
            ]
          : []),
      ],

      encoding: {
        x: xEncoding,
        y: {
          ...yEncoding,
          axis: { title: yAxisConfig.axisTitle },
        },
      },

      resolve: { scale: { size: "independent" } },
    };

    const options: EmbedOptions = {
      actions,
      renderer: "canvas",
      mode: "vega-lite",
      patch: patchChartScales as EmbedOptions["patch"],
      tooltip: {
        sanitize: (value: string) => value,
      } as EmbedOptions["tooltip"],
    };

    lastEmbeddedSortedRowsRef.current = currentSortedRows;

    vegaEmbed(containerRef.current, spec, options)
      .then((result) => {
        viewRef.current = result;

        result.view.addEventListener("click", (_event, item) => {
          if (item && item.datum && item.datum.article) {
            setSelectedArticle(item.datum as ArticleRow);
          }
        });

        const latestSortedRows = sortedRowsRef.current;
        if (
          latestSortedRows !== lastEmbeddedSortedRowsRef.current &&
          latestSortedRows.length > 0
        ) {
          try {
            result.view.data("main", latestSortedRows);
            result.view.runAsync();
            lastEmbeddedSortedRowsRef.current = latestSortedRows;
          } catch (err) {
            console.error("Failed to apply pending bubble chart data", err);
          }
        }
      })
      .catch(console.error);

    return () => {
      viewRef.current?.view.finalize();
      viewRef.current = null;
      lastEmbeddedSortedRowsRef.current = null;
    };
  }, [
    hasData,
    isLargeDatasetBucket,
    actions,
    showLabels,
    xAxisKey,
    xAxisMode,
    yAxisConfig,
    yAxisScaleType,
    yAxisAutoDomain.min,
    yAxisAutoDomain.max,
    xDomainMin,
    xDomainMax,
    excludedKey,
    availableTagsKey,
  ]);

  useEffect(() => {
    if (!viewRef.current) return;
    if (lastEmbeddedSortedRowsRef.current === sortedRows) return;
    const view = viewRef.current.view;
    try {
      view.data("main", sortedRows);
      view.runAsync();
      lastEmbeddedSortedRowsRef.current = sortedRows;
    } catch (err) {
      console.error("Failed to update bubble chart data", err);
    }
  }, [sortedRows]);

  useEffect(() => {
    if (!viewRef.current) return;
    const view = viewRef.current.view;
    view.signal(
      "y_domain_min",
      parsedYAxisDomain.domainMin !== null
        ? parsedYAxisDomain.domainMin
        : -Infinity,
    );
    view.signal(
      "y_domain_max",
      parsedYAxisDomain.domainMax !== null
        ? parsedYAxisDomain.domainMax
        : Infinity,
    );
    view.runAsync();
  }, [parsedYAxisDomain]);

  useEffect(() => {
    return () => {
      if (searchSignalTimerRef.current) {
        clearTimeout(searchSignalTimerRef.current);
      }
      if (linkCopiedTimerRef.current) {
        clearTimeout(linkCopiedTimerRef.current);
      }
    };
  }, []);

  const toggleGrades = (grades: string[], on: boolean) => {
    if (viewRef.current) {
      grades.forEach((g) => viewRef.current!.view.signal(`grade_${g}`, on));
      viewRef.current.view.runAsync();
    }
    startTransition(() => {
      setSelectedGrades((prev) => {
        const next = { ...prev };
        grades.forEach((g) => {
          next[g] = on;
        });
        return next;
      });
    });
  };

  const toggleTag = (tag: string, on: boolean) => {
    const index = availableTags.indexOf(tag);
    if (viewRef.current && index >= 0) {
      viewRef.current.view.signal(`tag_${index}`, on);
      viewRef.current.view.runAsync();
    }
    startTransition(() => {
      setDeselectedTags((prev) => {
        const next = new Set(prev);
        if (on) {
          next.delete(tag);
        } else {
          next.add(tag);
        }
        return next;
      });
    });
  };

  const toggleAllTags = (on: boolean) => {
    if (viewRef.current) {
      availableTags.forEach((_tag, i) =>
        viewRef.current!.view.signal(`tag_${i}`, on),
      );
      viewRef.current.view.runAsync();
    }
    startTransition(() => {
      setDeselectedTags(on ? new Set() : new Set(availableTags));
    });
  };

  const handleIncludeUntaggedChange = (checked: boolean) => {
    if (viewRef.current) {
      viewRef.current.view.signal("include_untagged", checked);
      viewRef.current.view.runAsync();
    }
    startTransition(() => setIncludeUntagged(checked));
  };

  const handleMoveRestrictionChange = (checked: boolean) => {
    if (viewRef.current) {
      viewRef.current.view.signal("filter_move_restriction", checked);
      viewRef.current.view.runAsync();
    }
    startTransition(() => setFilterMoveRestriction(checked));
  };

  const handleEditRestrictionChange = (checked: boolean) => {
    if (viewRef.current) {
      viewRef.current.view.signal("filter_edit_restriction", checked);
      viewRef.current.view.runAsync();
    }
    startTransition(() => setFilterEditRestriction(checked));
  };

  const updateCentralitySignals = (
    min: number,
    max: number,
    includeUnassessed: boolean,
  ) => {
    if (viewRef.current) {
      viewRef.current.view.signal("centrality_min", min);
      viewRef.current.view.signal("centrality_max", max);
      viewRef.current.view.signal("include_no_centrality", includeUnassessed);
      viewRef.current.view.runAsync();
    }
  };

  const handleCentralityMinChange = (value: number) => {
    const nextMin = Math.min(value, centralityMax);
    updateCentralitySignals(nextMin, centralityMax, includeNoCentrality);
    startTransition(() => setCentralityMin(nextMin));
  };

  const handleCentralityMaxChange = (value: number) => {
    const nextMax = Math.max(value, centralityMin);
    updateCentralitySignals(centralityMin, nextMax, includeNoCentrality);
    startTransition(() => setCentralityMax(nextMax));
  };

  const handleIncludeNoCentralityChange = (checked: boolean) => {
    updateCentralitySignals(centralityMin, centralityMax, checked);
    startTransition(() => setIncludeNoCentrality(checked));
  };

  const resetTags = () => {
    toggleAllTags(true);
    handleIncludeUntaggedChange(true);
  };

  const resetGrades = () => toggleGrades(GRADE_KEYS, true);

  const resetCentrality = () => {
    updateCentralitySignals(CENTRALITY_MIN, CENTRALITY_MAX, true);
    startTransition(() => {
      setCentralityMin(CENTRALITY_MIN);
      setCentralityMax(CENTRALITY_MAX);
      setIncludeNoCentrality(true);
    });
  };

  const resetProtection = () => {
    handleMoveRestrictionChange(false);
    handleEditRestrictionChange(false);
  };

  const advancedFilterProps = {
    tags: availableTags,
    deselectedTags,
    includeUntagged,
    onToggleTag: toggleTag,
    onIncludeUntaggedChange: handleIncludeUntaggedChange,
    onResetTags: resetTags,
    centralityMin,
    centralityMax,
    includeNoCentrality,
    onCentralityMinChange: handleCentralityMinChange,
    onCentralityMaxChange: handleCentralityMaxChange,
    onIncludeNoCentralityChange: handleIncludeNoCentralityChange,
    onResetCentrality: resetCentrality,
    selectedGrades,
    onToggleGrades: toggleGrades,
    onResetGrades: resetGrades,
    moveRestriction: filterMoveRestriction,
    editRestriction: filterEditRestriction,
    onMoveRestrictionChange: handleMoveRestrictionChange,
    onEditRestrictionChange: handleEditRestrictionChange,
    onResetProtection: resetProtection,
  };

  const axisControlProps = {
    yAxisKey,
    onYAxisKeyChange: setYAxisKey,
    yAxisScaleType,
    onYAxisScaleTypeChange: setYAxisScaleType,
    yAxisMinInput,
    onYAxisMinInputChange: setYAxisMinInput,
    yAxisMaxInput,
    onYAxisMaxInputChange: setYAxisMaxInput,
    yAxisAutoDomain,
    xAxisKey,
    onXAxisKeyChange: setXAxisKey,
    xAxisMode,
    onXAxisModeChange: setXAxisMode,
  };

  const handleShowLabelsChange = (checked: boolean) => {
    setShowLabels(checked);
  };

  const removeArticleMutation = useMutation({
    mutationFn: (title: string) => TopicService.removeArticle(topicId!, title),
    onSuccess: (updatedTopic, title) => {
      queryClient.invalidateQueries({
        queryKey: ["articleAnalytics", String(topicId)],
      });
      queryClient.setQueryData(["topic", String(topicId)], updatedTopic);
      setSelectedArticle((cur) => (cur?.article === title ? null : cur));
      setExcludedOutliers((prev) => {
        if (!prev.has(title)) return prev;
        const next = new Set(prev);
        next.delete(title);
        return next;
      });
      toast.success(`Removed "${title}" from this topic`);
    },
    onError: () => toast.error("Failed to remove article"),
  });

  const handleRemoveArticle = (title: string) => {
    if (!canEdit || !topicId) return;
    const tbNote = isTopicBuilderTopic
      ? "\n\nNote: this topic syncs from Topic Builder, so a future sync may re-add this article."
      : "";
    if (
      window.confirm(
        `Remove "${title}" from this topic? This deletes its analytics and cannot be undone.${tbNote}`,
      )
    ) {
      removeArticleMutation.mutate(title);
    }
  };

  const handleToggleOutlier = (article: string) => {
    setExcludedOutliers((prev) => {
      const next = new Set(prev);
      if (next.has(article)) {
        next.delete(article);
      } else {
        next.add(article);
      }
      return next;
    });
  };

  const handleClearOutliers = () => {
    setExcludedOutliers(new Set());
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (searchSignalTimerRef.current) {
      clearTimeout(searchSignalTimerRef.current);
    }
    searchSignalTimerRef.current = setTimeout(() => {
      if (viewRef.current) {
        viewRef.current.view.signal("search_input", term.trim().toLowerCase());
        viewRef.current.view.runAsync();
      }
    }, 150);
  };

  const handleTabChange = (tab: "overview" | "languages") => {
    setActiveTab(tab);
  };

  // Build a shareable URL from the current view on demand. The query string
  // encodes the controls; pathname + hash are preserved so the parent's
  // hash-driven view selection (e.g. #bubble) survives.
  const buildPermalink = () => {
    const next = encodeChartState({
      xAxisKey,
      xAxisMode,
      yAxisKey,
      yAxisScaleType,
      yAxisMin: committedYAxisMinInput,
      yAxisMax: committedYAxisMaxInput,
      filterMoveRestriction,
      filterEditRestriction,
      centralityMin,
      centralityMax,
      includeNoCentrality,
      searchTerm,
      showLabels,
      colorMode,
      selectedGrades,
      deselectedTags: [...deselectedTags],
      includeUntagged,
      excludedOutliers: [...excludedOutliers],
    });
    const qs = new URLSearchParams(next).toString();
    return `${window.location.origin}${window.location.pathname}${
      qs ? `?${qs}` : ""
    }${window.location.hash}`;
  };

  const handleSaveImage = async () => {
    if (!viewRef.current) return;
    const formatDate = (value?: string) =>
      value
        ? new Date(value).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null;
    const start = formatDate(topicStartDate);
    const end = formatDate(topicEndDate);
    const dateRangeLabel = start ? `${start} - ${end ?? "now"}` : null;
    const generatedLabel = `Generated ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
    const safeName =
      (topicName ?? "article-analytics")
        .replace(/[^\w-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "article-analytics";

    try {
      await exportChartImage({
        view: viewRef.current.view,
        logoSrc: "/images/logo.png",
        title: topicName ?? "Article analytics",
        dateRangeLabel,
        generatedLabel,
        permalink: buildPermalink(),
        filename: `${safeName}-chart`,
      });
    } catch (err) {
      console.error("Failed to export chart image", err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildPermalink());
      setLinkCopied(true);
      if (linkCopiedTimerRef.current) {
        clearTimeout(linkCopiedTimerRef.current);
      }
      linkCopiedTimerRef.current = setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  return (
    <div className="WikiBubbleChart">
      <div className="TitleRow">
        <h2 className="u-mb0">Article analytics over chosen focus period</h2>
        <CSVButton
          articles={sortedRows}
          filteredArticles={filteredArticles}
          csvConvert={convertAnalyticsToCSV}
          filename="article-analytics"
        />
        <WikitextButton
          articles={sortedRows}
          filteredArticles={filteredArticles}
          wikitextConvert={convertAnalyticsToWikitext}
          filename="article-analytics"
        />
        <button
          type="button"
          className="ShareBtn"
          onClick={handleSaveImage}
          disabled={!hasData}
          title="Download the current chart as a PNG with credits"
        >
          <BsImage size={14} aria-hidden="true" />
          <span>Save image</span>
        </button>
        <button
          type="button"
          className="ShareBtn"
          onClick={handleCopyLink}
          title="Copy a link to this exact chart view"
        >
          {linkCopied ? (
            <BsCheck2 size={16} aria-hidden="true" />
          ) : (
            <BsLink45Deg size={16} aria-hidden="true" />
          )}
          <span>{linkCopied ? "Copied" : "Copy link"}</span>
        </button>
        <button
          type="button"
          className="GlossaryBtn"
          onClick={() => setLegendOpen(true)}
        >
          <MdLegendToggle size={14} />
          <span>Legend</span>
        </button>
        <button
          type="button"
          className="GlossaryBtn"
          onClick={() => setGlossaryOpen(true)}
        >
          <BsBook size={14} />
          <span>Glossary</span>
        </button>
      </div>

      <div className="TabBar">
        <button
          type="button"
          className={`Tab ${activeTab === "overview" ? "is-active" : ""}`}
          onClick={() => handleTabChange("overview")}
        >
          Articles overview
        </button>
        <button
          type="button"
          className={`Tab ${activeTab === "languages" ? "is-active" : ""}`}
          onClick={() => handleTabChange("languages")}
        >
          Languages
        </button>
        <button
          type="button"
          className="AdvancedToggle"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((open) => !open)}
        >
          <span className="AdvancedToggleLabel">Advanced Filters</span>
          {advancedOpen ? (
            <FaChevronUp size={14} />
          ) : (
            <FaChevronDown size={14} />
          )}
        </button>
      </div>

      <div className="TabPanel" hidden={activeTab !== "overview"}>
        <AxisControls idPrefix="overview" {...axisControlProps} />

        <div className="AdvancedFilters">
          {advancedOpen && <AdvancedFilterPanel {...advancedFilterProps} />}
        </div>

        <div className="Heading">
          <div className="InfoLine">
            <BsInfoCircle size={24} className="InfoIcon" />
            <span>See an overview of articles with their statistics</span>
          </div>
          <div className="HeadingControls">
            <label className="ShowLabels">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => handleShowLabelsChange(e.target.checked)}
              />
              <span>Show labels</span>
            </label>
            <label
              className="ShowLabels"
              title="Color every bubble the same instead of by quality assessment. Useful for accessibility and for wikis without assessment grades."
            >
              <input
                type="checkbox"
                checked={colorMode === "single"}
                onChange={(e) =>
                  setColorMode(e.target.checked ? "single" : "assessment")
                }
              />
              <span>Single color</span>
            </label>
            <ArticleSearchAutocomplete
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              articleTitles={articleTitles}
            />
          </div>
        </div>

        <div className="Body">
          <div className="Container" ref={containerRef} />
          <FilteredArticlesSidebar
            articles={filteredArticles}
            wiki={wiki}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((prev) => !prev)}
            onArticleClick={setSelectedArticle}
            excludedOutliers={excludedOutliers}
            onToggleOutlier={handleToggleOutlier}
            onClearOutliers={handleClearOutliers}
            canEdit={canEdit && !!topicId}
            onRemoveArticle={handleRemoveArticle}
            removing={removeArticleMutation.isPending}
          />
        </div>

        <div className="Stats">
          <div className="StatCell">
            <span className="StatValue">
              {aggregateStats.totalArticles.toLocaleString()}
            </span>
            <span className="StatLabel">Total articles</span>
          </div>

          <div className="StatCell">
            <span className="StatValue">
              {aggregateStats.millionVisits !== null
                ? aggregateStats.millionVisits.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </span>
            <span className="StatLabel">
              Million visits
              {aggregateStats.startDateLabel
                ? ` (since ${aggregateStats.startDateLabel})`
                : ""}
            </span>
          </div>

          <div className="StatCell">
            <span className="StatValue">
              {aggregateStats.averageTotalViews !== null
                ? aggregateStats.averageTotalViews.toLocaleString()
                : "—"}
            </span>
            <span className="StatLabel">Average total views per article</span>
          </div>

          <div className="StatCell">
            <span className="StatValue">
              {aggregateStats.averageArticleSize !== null
                ? aggregateStats.averageArticleSize.toLocaleString()
                : "—"}
            </span>
            <span className="StatLabel">Average article size (bytes)</span>
          </div>
        </div>

        <div className="Footnote">
          * Quality assessment is done by the Wikipedia community and it may be
          inconsistent
        </div>
      </div>

      <div className="TabPanel" hidden={activeTab !== "languages"}>
        <AxisControls idPrefix="languages" hideYAxis {...axisControlProps} />

        <div className="AdvancedFilters">
          {advancedOpen && <AdvancedFilterPanel {...advancedFilterProps} />}
        </div>

        <div className="ArticleLang">
          <ArticleLanguagesGrid
            articles={filteredArticles}
            allArticles={sortedRows}
            languageLinks={languageLinks}
            wiki={wiki}
            loading={langLinksLoading}
            error={
              langLinksError
                ? "Failed to fetch language data. Please try again later."
                : null
            }
            languages={TARGET_LANGUAGES}
            onArticleClick={setLangCompareArticle}
            progress={langLinksProgress}
            topicId={topicId}
          />

          <div className="Disclaimer">
            <span>
              * Quality assessment is done by the Wikipedia community and it may
              be inconsistent.
            </span>
            <button
              type="button"
              className="GlossaryBtn"
              onClick={() => setGlossaryOpen(true)}
            >
              <BsBook size={14} aria-hidden="true" />
              <span>Glossary</span>
            </button>
          </div>
        </div>
      </div>

      {selectedArticle && (
        <ArticleDetailPanel
          article={selectedArticle}
          wiki={wiki}
          onClose={() => setSelectedArticle(null)}
          canEdit={canEdit && !!topicId}
          onRemove={handleRemoveArticle}
          removing={removeArticleMutation.isPending}
        />
      )}

      {langCompareArticle && topicId && (
        <ArticleLanguageComparisonModal
          articleTitle={langCompareArticle}
          topicId={topicId}
          wiki={wiki}
          languages={TARGET_LANGUAGES}
          onClose={() => setLangCompareArticle(null)}
        />
      )}

      {glossaryOpen && <GlossaryModal onClose={() => setGlossaryOpen(false)} />}

      {legendOpen && <LegendModal onClose={() => setLegendOpen(false)} />}
    </div>
  );
};

export default WikiBubbleChart;
