import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  startTransition,
  useDeferredValue,
} from "react";
import vegaEmbed, { VisualizationSpec, EmbedOptions, Result } from "vega-embed";
import { useQuery } from "@tanstack/react-query";
import { BsInfoCircle } from "react-icons/bs";
import { FaArrowRight, FaArrowUp } from "react-icons/fa6";
import CSVButton from "./CSV-button.component";
import ArticleSearchAutocomplete from "./article-search-autocomplete.component";
import ArticleDetailPanel from "./article-detail-panel.component";
import FilteredArticlesSidebar from "./filtered-articles-sidebar.component";
import ArticleLanguagesGrid from "./article-languages-grid.component";
import ArticleLanguageComparisonModal from "./article-language-comparison-modal.component";
import type { ArticleRow } from "./article-detail-panel.component";
import type {
  ArticleAnalytics,
  XAxisKey,
  YAxisKey,
} from "../types/bubble-chart.type";
import {
  convertAnalyticsToCSV,
  getAssessmentColor,
  compareArticlesByPublicationDateAsc,
  compareArticlesByNumericFieldAsc,
  formatProtectionSummary,
  xAxisTitleForKey,
} from "../utils/bubble-chart-utils";
import { fetchLanguageLinks, TARGET_LANGUAGES } from "../utils/language-links";
import type { LangLinksProgress } from "../utils/language-links";

type Wiki = {
  language: string;
  project: string;
};

interface WikiBubbleChartProps {
  data?: Record<string, ArticleAnalytics>;
  actions?: boolean;
  wiki?: Wiki;
  topicId?: string | number;
  topicStartDate?: string;
  topicEndDate?: string;
}

const HEIGHT = 650;
const LARGE_DATASET_THRESHOLD = 10000;
const CENTRALITY_MIN = 1;
const CENTRALITY_MAX = 10;

const gradeGroups = [
  { id: "fa", label: "Featured", grades: ["FA", "FL"], dot: "#9CBDFF" },
  { id: "ga", label: "GA", grades: ["GA"], dot: "#66FF66" },
  { id: "aclass", label: "A-Class", grades: ["A"], dot: "#66FFFF" },
  { id: "bclass", label: "B-Class", grades: ["B"], dot: "#B2FF66" },
  { id: "cclass", label: "C-Class", grades: ["C"], dot: "#FFFF66" },
  { id: "start", label: "Start", grades: ["Start"], dot: "#FFAA66" },
  { id: "stub", label: "Stub", grades: ["Stub"], dot: "#FFA4A4" },
  { id: "list", label: "List", grades: ["List"], dot: "#C7B1FF" },
  {
    id: "unassessed",
    label: "Unassessed",
    grades: ["Unassessed"],
    dot: "#9E9E9E",
  },
];

function QualityFilterButtons({
  onToggle,
  selected,
}: {
  onToggle: (grades: string[], on: boolean) => void;
  selected: Record<string, boolean>;
}) {
  return (
    <div className="QualityAssessment">
      <div className="BoxTitle">Quality assessment*</div>
      <div className="QualityFilterGrid">
        {gradeGroups.map((g) => {
          const isOn = g.grades.every((x) => selected[x] !== false);
          return (
            <button
              key={g.id}
              type="button"
              className={`QualityFilterBtn ${isOn ? "is-selected" : ""}`}
              data-group={g.id}
              onClick={() => onToggle(g.grades, !isOn)}
            >
              <span
                className="QualityFilterDot"
                style={{ backgroundColor: g.dot }}
              />
              <span className="QualityFilterLabel">{g.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProtectionFilterCheckboxes({
  moveChecked,
  editChecked,
  onMoveChange,
  onEditChange,
}: {
  moveChecked: boolean;
  editChecked: boolean;
  onMoveChange: (checked: boolean) => void;
  onEditChange: (checked: boolean) => void;
}) {
  return (
    <div className="ProtectionFilter">
      <div className="BoxTitle">Protection filter</div>
      <div className="ProtectionFilterCheckboxes">
        <label className="ProtectionFilterLabel">
          <input
            type="checkbox"
            checked={moveChecked}
            onChange={(e) => onMoveChange(e.target.checked)}
          />
          <span>Move restriction</span>
        </label>
        <label className="ProtectionFilterLabel">
          <input
            type="checkbox"
            checked={editChecked}
            onChange={(e) => onEditChange(e.target.checked)}
          />
          <span>Edit restriction</span>
        </label>
      </div>
    </div>
  );
}

function CentralityFilter({
  min,
  max,
  includeUnassessed,
  onMinChange,
  onMaxChange,
  onIncludeUnassessedChange,
}: {
  min: number;
  max: number;
  includeUnassessed: boolean;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  onIncludeUnassessedChange: (checked: boolean) => void;
}) {
  const minPercent =
    ((min - CENTRALITY_MIN) / (CENTRALITY_MAX - CENTRALITY_MIN)) * 100;
  const maxPercent =
    ((max - CENTRALITY_MIN) / (CENTRALITY_MAX - CENTRALITY_MIN)) * 100;

  return (
    <div className="CentralityFilter">
      <div className="CentralityFilterHeader">
        <div className="BoxTitle">Centrality</div>
        <label className="CentralityFilterCheckbox">
          <input
            type="checkbox"
            checked={includeUnassessed}
            onChange={(e) => onIncludeUnassessedChange(e.target.checked)}
            aria-label="Include articles with no centrality"
          />
          <span>include articles without centrality</span>
        </label>
        <div className="CentralityFilterValue">
          {min}-{max}
        </div>
      </div>
      <div className="CentralityFilterSlider">
        <div className="CentralityFilterTrack" />
        <div
          className="CentralityFilterRange"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
        <input
          type="range"
          min={CENTRALITY_MIN}
          max={CENTRALITY_MAX}
          step={1}
          value={min}
          onChange={(e) => onMinChange(Number(e.target.value))}
          aria-label="Minimum centrality"
          className="CentralityFilterInput CentralityFilterInput--min"
        />
        <input
          type="range"
          min={CENTRALITY_MIN}
          max={CENTRALITY_MAX}
          step={1}
          value={max}
          onChange={(e) => onMaxChange(Number(e.target.value))}
          aria-label="Maximum centrality"
          className="CentralityFilterInput CentralityFilterInput--max"
        />
      </div>
      <div className="CentralityFilterBounds">
        <span>{CENTRALITY_MIN}</span>
        <span>{CENTRALITY_MAX}</span>
      </div>
    </div>
  );
}

export const WikiBubbleChart: React.FC<WikiBubbleChartProps> = ({
  data = {},
  actions = false,
  wiki,
  topicId,
  topicStartDate,
  topicEndDate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<Result | null>(null);
  const sortedRowsRef = useRef<any[]>([]);
  const lastEmbeddedSortedRowsRef = useRef<any[] | null>(null);
  const [selectedGrades, setSelectedGrades] = useState<Record<string, boolean>>(
    {
      FA: true,
      FL: true,
      A: true,
      GA: true,
      B: true,
      C: true,
      Start: true,
      Stub: true,
      List: true,
      Unassessed: true,
    },
  );
  const [xAxisKey, setXAxisKey] = useState<XAxisKey>("title");
  const [xAxisMode, setXAxisMode] = useState<"ranked" | "scaled">("ranked");
  const [yAxisKey, setYAxisKey] = useState<YAxisKey>("average_daily_views");
  const [yAxisScaleType, setYAxisScaleType] = useState<"linear" | "log">(
    "linear",
  );
  const [yAxisMinInput, setYAxisMinInput] = useState<string>("");
  const [yAxisMaxInput, setYAxisMaxInput] = useState<string>("");
  const [committedYAxisMinInput, setCommittedYAxisMinInput] =
    useState<string>("");
  const [committedYAxisMaxInput, setCommittedYAxisMaxInput] =
    useState<string>("");
  const yAxisDomainDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [filterMoveRestriction, setFilterMoveRestriction] =
    useState<boolean>(false);
  const [filterEditRestriction, setFilterEditRestriction] =
    useState<boolean>(false);
  const [centralityMin, setCentralityMin] = useState<number>(CENTRALITY_MIN);
  const [centralityMax, setCentralityMax] = useState<number>(CENTRALITY_MAX);
  const [includeNoCentrality, setIncludeNoCentrality] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
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
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const searchSignalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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

        return {
          article,
          ...analytics,
          assessment_grade_color: getAssessmentColor(
            analytics?.assessment_grade,
          ),
          protection_summary: formatProtectionSummary(protections),
          has_move_restriction: hasMoveRestriction,
          has_edit_restriction: hasEditRestriction,
        };
      });
    }
    return [];
  }, [data]);

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

  const yAxisAutoDomain = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let found = false;
    for (let i = 0; i < rows.length; i++) {
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
  }, [rows, yAxisConfig.currentField]);

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
  ]);

  useEffect(() => {
    setYAxisMinInput("");
    setYAxisMaxInput("");
    setCommittedYAxisMinInput("");
    setCommittedYAxisMaxInput("");
  }, [yAxisKey]);

  useEffect(() => {
    if (xAxisKey === "title") {
      setXAxisMode("ranked");
    }
  }, [xAxisKey]);

  sortedRowsRef.current = sortedRows;
  const hasData = sortedRows.length > 0;
  const isLargeDatasetBucket = sortedRows.length > LARGE_DATASET_THRESHOLD;

  useEffect(() => {
    if (!containerRef.current || !hasData) return;

    const currentSortedRows = sortedRowsRef.current;
    const isLogScale = yAxisScaleType === "log";

    // calculate padding based on maximum circle radius to prevent clipping
    const maxCircleRadius = Math.sqrt(1500 / Math.PI); // this is how vega calculates the circle radius

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
      const fallbackMin = -25;
      const fallbackMax = yAxisAutoDomain.max ?? 1000;
      const fallbackRange = fallbackMax - fallbackMin;
      const fallbackPadding = maxCircleRadius * (fallbackRange / HEIGHT);
      yScaleSpec = {
        domainMin: {
          expr: `isFinite(y_domain_min) && y_domain_min > 0 ? y_domain_min : ${fallbackMin - fallbackPadding}`,
        },
        domainMax: {
          expr: `isFinite(y_domain_max) ? y_domain_max : ${fallbackMax + fallbackPadding}`,
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

    const visibilityFilterExpr = [
      "(!search_input || indexof(lower(datum.article), search_input) >= 0)",
      "((grade_FA && datum.assessment_grade == 'FA') || (grade_FL && datum.assessment_grade == 'FL') || (grade_GA && datum.assessment_grade == 'GA') || (grade_A && datum.assessment_grade == 'A') || (grade_B && datum.assessment_grade == 'B') || (grade_C && datum.assessment_grade == 'C') || (grade_Start && datum.assessment_grade == 'Start') || (grade_Stub && datum.assessment_grade == 'Stub') || (grade_List && datum.assessment_grade == 'List') || (grade_Unassessed && !datum.assessment_grade))",
      "((!filter_move_restriction || datum.has_move_restriction) && (!filter_edit_restriction || datum.has_edit_restriction))",
      "((isValid(datum.centrality) && datum.centrality >= centrality_min && datum.centrality <= centrality_max) || (!isValid(datum.centrality) && include_no_centrality))",
    ].join(" && ");

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
        { filter: yFilterExpr },
        { filter: visibilityFilterExpr },
        { window: [{ op: "row_number", as: "idx" }] },
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
            stroke: "#2196f3",
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
            opacity: makeOpacityEncoding(1),
          },
        },
        // Previous article size circle (prev_article_size)
        {
          mark: {
            type: "circle",
            fill: null,
            strokeDash: [4, 4],
            stroke: "#64b5f6",
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
            opacity: makeOpacityEncoding(1),
          },
        },
        // Lead section size circle (lead_section_size)
        {
          mark: {
            type: "circle",
            fill: "#90caf9",
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
            opacity: makeOpacityEncoding(0.8),
          },
        },
        // Article size circle (article_size)
        {
          mark: {
            type: "circle",
            fill: "#0d47a1",
            opacity: 0.5,
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
            opacity: makeOpacityEncoding(0.5),
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

  const handleShowLabelsChange = (checked: boolean) => {
    setShowLabels(checked);
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

  return (
    <div className="WikiBubbleChart">
      <div className="WikiBubbleChartTitleRow">
        <h2 className="u-mb0">Article analytics over chosen focus period</h2>
        <CSVButton
          articles={sortedRows}
          filteredArticles={filteredArticles}
          csvConvert={convertAnalyticsToCSV}
          filename="article-analytics"
        />
      </div>

      <div className="WikiBubbleChartTabBar">
        <button
          type="button"
          className={`WikiBubbleChartTab ${activeTab === "overview" ? "is-active" : ""}`}
          onClick={() => handleTabChange("overview")}
        >
          Articles overview
        </button>
        <button
          type="button"
          className={`WikiBubbleChartTab ${activeTab === "languages" ? "is-active" : ""}`}
          onClick={() => handleTabChange("languages")}
        >
          Languages
        </button>
      </div>

      <div
        className="WikiBubbleChartTabPanel"
        hidden={activeTab !== "overview"}
      >
        <div className="WikiBubbleChartAxisControls">
          <div className="WikiBubbleChartFilterBox">
            <div className="WikiBubbleChartAxisControl">
              <FaArrowUp size={30} className="WikiBubbleChartAxisIcon" />
              <div className="WikiBubbleChartAxisFields">
                <div className="WikiBubbleChartAxisLabelRow">
                  <label htmlFor="wiki-bubble-y-axis" className="BoxTitle">
                    Vertical axis
                  </label>
                  <div className="WikiBubbleChartScaleToggle">
                    <button
                      type="button"
                      className={`WikiBubbleChartScaleBtn ${yAxisScaleType === "linear" ? "is-active" : ""}`}
                      onClick={() => setYAxisScaleType("linear")}
                    >
                      Linear
                    </button>
                    <button
                      type="button"
                      className={`WikiBubbleChartScaleBtn ${yAxisScaleType === "log" ? "is-active" : ""}`}
                      onClick={() => setYAxisScaleType("log")}
                    >
                      Log
                    </button>
                  </div>
                </div>
                <select
                  id="wiki-bubble-y-axis"
                  className="WikiBubbleChartSortSelect"
                  value={yAxisKey}
                  onChange={(e) => setYAxisKey(e.target.value as YAxisKey)}
                >
                  <option value="average_daily_views">Avg daily views</option>
                  <option value="number_of_editors">Editors</option>
                  <option value="incoming_links_count">Incoming links</option>
                </select>
              </div>
            </div>
          </div>

          <div className="WikiBubbleChartFilterBox">
            <div className="BoxTitle">Y-axis range</div>
            <div className="WikiBubbleChartRangeRow">
              <label className="WikiBubbleChartRangeField">
                <span className="WikiBubbleChartRangeLabel">min</span>
                <input
                  className="WikiBubbleChartRangeInput"
                  type="number"
                  inputMode="numeric"
                  placeholder={
                    yAxisAutoDomain.min === null
                      ? ""
                      : String(yAxisAutoDomain.min)
                  }
                  value={yAxisMinInput}
                  onChange={(e) => setYAxisMinInput(e.target.value)}
                  aria-label="Y-axis minimum"
                />
              </label>
              <label className="WikiBubbleChartRangeField">
                <span className="WikiBubbleChartRangeLabel">max</span>
                <input
                  className="WikiBubbleChartRangeInput"
                  type="number"
                  inputMode="numeric"
                  placeholder={
                    yAxisAutoDomain.max === null
                      ? ""
                      : String(yAxisAutoDomain.max)
                  }
                  value={yAxisMaxInput}
                  onChange={(e) => setYAxisMaxInput(e.target.value)}
                  aria-label="Y-axis maximum"
                />
              </label>
            </div>
          </div>

          <div className="WikiBubbleChartFilterBox">
            <div className="WikiBubbleChartAxisControl">
              <FaArrowRight size={30} className="WikiBubbleChartAxisIcon" />
              <div className="WikiBubbleChartAxisFields">
                <div className="WikiBubbleChartAxisLabelRow">
                  <label htmlFor="wiki-bubble-sort" className="BoxTitle">
                    Horizontal axis
                  </label>
                  <div className="WikiBubbleChartScaleToggle">
                    <button
                      type="button"
                      className={`WikiBubbleChartScaleBtn ${xAxisMode === "ranked" ? "is-active" : ""}`}
                      onClick={() => setXAxisMode("ranked")}
                    >
                      Ranked
                    </button>
                    <button
                      type="button"
                      className={`WikiBubbleChartScaleBtn ${xAxisMode === "scaled" ? "is-active" : ""}`}
                      onClick={() =>
                        xAxisKey !== "title" && setXAxisMode("scaled")
                      }
                      disabled={xAxisKey === "title"}
                      title={
                        xAxisKey === "title"
                          ? "Not available for article title"
                          : undefined
                      }
                    >
                      Scaled
                    </button>
                  </div>
                </div>
                <select
                  id="wiki-bubble-sort"
                  className="WikiBubbleChartSortSelect"
                  value={xAxisKey}
                  onChange={(e) => setXAxisKey(e.target.value as XAxisKey)}
                >
                  <option value="title">Article title (A-Z)</option>
                  <option value="publication_date">
                    Creation date (Old-New)
                  </option>
                  <option value="linguistic_versions_count">
                    Linguistic versions (Low-High)
                  </option>
                  <option value="article_size">
                    Article size (Small-Large)
                  </option>
                  <option value="lead_section_size">
                    Lead section size (Small-Large)
                  </option>
                  <option value="talk_size">
                    Discussion page size (Small-Large)
                  </option>
                  <option value="warning_tags_count">
                    Warning tags (Low-High)
                  </option>
                  <option value="images_count">Images (Low-High)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="WikiBubbleChartFilterBox">
            <CentralityFilter
              min={centralityMin}
              max={centralityMax}
              includeUnassessed={includeNoCentrality}
              onMinChange={handleCentralityMinChange}
              onMaxChange={handleCentralityMaxChange}
              onIncludeUnassessedChange={handleIncludeNoCentralityChange}
            />
          </div>
        </div>

        <div className="WikiBubbleChartHeading">
          <div className="WikiBubbleChartInfoLine">
            <BsInfoCircle size={24} className="WikiBubbleChartInfoIcon" />
            <span>See an overview of articles with their statistics</span>
          </div>
          <div className="WikiBubbleChartHeadingControls">
            <label className="WikiBubbleChartShowLabels">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => handleShowLabelsChange(e.target.checked)}
              />
              <span>Show labels</span>
            </label>
            <ArticleSearchAutocomplete
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              articleTitles={articleTitles}
            />
          </div>
        </div>

        <div className="WikiBubbleChartBody">
          <div className="WikiBubbleChartContainer" ref={containerRef} />
          <FilteredArticlesSidebar
            articles={filteredArticles}
            wiki={wiki}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((prev) => !prev)}
            onArticleClick={setSelectedArticle}
          />
        </div>

        <div className="WikiBubbleChartQualityFilters">
          <div className="WikiBubbleChartFilterBox">
            <QualityFilterButtons
              onToggle={toggleGrades}
              selected={selectedGrades}
            />
          </div>

          <div className="WikiBubbleChartFilterBox">
            <ProtectionFilterCheckboxes
              moveChecked={filterMoveRestriction}
              editChecked={filterEditRestriction}
              onMoveChange={handleMoveRestrictionChange}
              onEditChange={handleEditRestrictionChange}
            />
          </div>
        </div>

        <div className="WikiBubbleChartStats">
          <div className="WikiBubbleChartStatCell">
            <span className="WikiBubbleChartStatValue">
              {aggregateStats.totalArticles.toLocaleString()}
            </span>
            <span className="WikiBubbleChartStatLabel">Total articles</span>
          </div>

          <div className="WikiBubbleChartStatCell">
            <span className="WikiBubbleChartStatValue">
              {aggregateStats.millionVisits !== null
                ? aggregateStats.millionVisits.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </span>
            <span className="WikiBubbleChartStatLabel">
              Million visits
              {aggregateStats.startDateLabel
                ? ` (since ${aggregateStats.startDateLabel})`
                : ""}
            </span>
          </div>

          <div className="WikiBubbleChartStatCell">
            <span className="WikiBubbleChartStatValue">
              {aggregateStats.averageTotalViews !== null
                ? aggregateStats.averageTotalViews.toLocaleString()
                : "—"}
            </span>
            <span className="WikiBubbleChartStatLabel">
              Average total views per article
            </span>
          </div>

          <div className="WikiBubbleChartStatCell">
            <span className="WikiBubbleChartStatValue">
              {aggregateStats.averageArticleSize !== null
                ? aggregateStats.averageArticleSize.toLocaleString()
                : "—"}
            </span>
            <span className="WikiBubbleChartStatLabel">
              Average article size (bytes)
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="WikiBubbleChartLegend">
          <div className="WikiBubbleChartLegendText">
            * Quality assessment is done by the Wikipedia community and it may
            be inconsistent
          </div>
          <div className="WikiBubbleChartLegendBox">
            <div className="WikiBubbleChartLegendTitle">Legend</div>
            <img src="/images/legend.png" />
          </div>
        </div>
      </div>

      <div
        className="WikiBubbleChartTabPanel"
        hidden={activeTab !== "languages"}
      >
        <div className="WikiBubbleChartQualityFilters">
          <div className="WikiBubbleChartFilterBox">
            <QualityFilterButtons
              onToggle={toggleGrades}
              selected={selectedGrades}
            />
          </div>
          <div className="WikiBubbleChartFilterBox">
            <ProtectionFilterCheckboxes
              moveChecked={filterMoveRestriction}
              editChecked={filterEditRestriction}
              onMoveChange={handleMoveRestrictionChange}
              onEditChange={handleEditRestrictionChange}
            />
          </div>
        </div>

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

        <div className="ArticleLangDisclaimer">
          * Quality assessment is done by the Wikipedia community and it may be
          inconsistent
        </div>
      </div>

      {selectedArticle && (
        <ArticleDetailPanel
          article={selectedArticle}
          wiki={wiki}
          onClose={() => setSelectedArticle(null)}
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
    </div>
  );
};

export default WikiBubbleChart;
