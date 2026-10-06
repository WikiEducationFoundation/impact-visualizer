import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  startTransition,
  useDeferredValue,
} from "react";
import vegaEmbed, { EmbedOptions, Result } from "vega-embed";
import { Joyride } from "react-joyride";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { BsBook, BsInfoCircle } from "react-icons/bs";
import ArticleSearchAutocomplete from "./article-search-autocomplete.component";
import ArticleDetailPanel from "./article-detail-panel.component";
import FilteredArticlesSidebar from "./filtered-articles-sidebar.component";
import ArticleLanguagesGrid from "./article-languages-grid.component";
import ArticleLanguageComparisonModal from "./article-language-comparison-modal.component";
import GlossaryModal from "./glossary-modal.component";
import AddArticleModal from "./add-article-modal.component";
import LegendModal from "./legend-modal.component";
import AdvancedFilterPanel from "./advanced-filter-panel.component";
import AxisControls from "./axis-controls.component";
import ChartToolbar from "./chart-toolbar.component";
import ChartTabBar from "./chart-tab-bar.component";
import TimeTravelPanel from "./time-travel/time-travel-panel.component";
import type { TimeTravelQuery } from "./time-travel/time-travel-panel.component";
import ChartAggregateStats from "./chart-aggregate-stats.component";
import type { ArticleRow } from "./article-detail-panel.component";
import type {
  ArticleAnalytics,
  ChartRow,
  ChartTab,
  NumericSortField,
  XAxisKey,
  YAxisKey,
} from "../../types/bubble-chart.type";
import {
  GRADE_KEYS,
  Y_AXIS_CONFIG,
  buildChartRows,
  compareArticlesByPublicationDateAsc,
  compareArticlesByNumericFieldAsc,
  computeAggregateStats,
  filterArticles,
  numericExtent,
  parseYAxisDomain,
} from "../../utils/bubble-chart-utils";
import {
  LARGE_DATASET_THRESHOLD,
  applySignals,
  buildBubbleChartSpec,
  gradeSignalName,
  patchChartScales,
  tagSignalName,
  yDomainSignals,
} from "../../utils/bubble-chart-vega";
import {
  JOYRIDE_OPTIONS,
  JOYRIDE_STYLES,
  SIDEBAR_STEP_INDEX,
  TOUR_STEPS,
} from "../../utils/bubble-chart-tour";
import {
  fetchLanguageLinks,
  LANGUAGE_LABELS,
  TARGET_LANGUAGES,
} from "../../utils/language-links";
import type { LangLinksProgress } from "../../utils/language-links";
import { exportChartImage, toSafeFilename } from "../../utils/chart-image-export";
import { formatShortDate } from "../../utils/date-utils";
import { useOnboardingTour } from "../../hooks/useOnboardingTour";
import { useTopicArticleMutations } from "../../hooks/useTopicArticleMutations";
import {
  decodeChartState,
  encodeChartState,
  DEFAULT_CHART_UI_STATE,
  CENTRALITY_MIN,
  CENTRALITY_MAX,
} from "../../utils/bubble-chart-permalink";

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
  dataUpdatedAt?: string | null;
  canEdit?: boolean;
  isTopicBuilderTopic?: boolean;
}

export const WikiBubbleChart: React.FC<WikiBubbleChartProps> = ({
  data = {},
  actions = false,
  wiki,
  topicId,
  topicName,
  topicStartDate,
  topicEndDate,
  dataUpdatedAt,
  canEdit = false,
  isTopicBuilderTopic = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<Result | null>(null);
  const sortedRowsRef = useRef<ChartRow[]>([]);
  const lastEmbeddedSortedRowsRef = useRef<ChartRow[] | null>(null);
  const [searchParams] = useSearchParams();

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
  const [activeTab, setActiveTab] = useState<ChartTab>(initialState.activeTab);
  const [timeTravelArticles, setTimeTravelArticles] = useState<string[]>(
    initialState.timeTravelArticles,
  );
  const [timeTravelStartYear, setTimeTravelStartYear] = useState<number>(
    initialState.timeTravelStartYear,
  );
  const [timeTravelEndYear, setTimeTravelEndYear] = useState<number>(
    initialState.timeTravelEndYear,
  );
  const [timeTravelXAxisKey, setTimeTravelXAxisKey] = useState<XAxisKey>(
    initialState.timeTravelXAxisKey,
  );
  const [timeTravelXAxisMode, setTimeTravelXAxisMode] = useState<
    "ranked" | "scaled"
  >(initialState.timeTravelXAxisMode);
  const [timeTravelYScaleType, setTimeTravelYScaleType] = useState<
    "linear" | "log"
  >(initialState.timeTravelYScaleType);
  const [timeTravelShowLabels, setTimeTravelShowLabels] = useState<boolean>(
    initialState.timeTravelShowLabels,
  );
  // Fetching is expensive (a live Wikipedia round-trip per article-year), so it
  // runs only when the user asks for it. A shared permalink already names a
  // selection, so that one runs on load.
  const [timeTravelQuery, setTimeTravelQuery] =
    useState<TimeTravelQuery | null>(() =>
      initialState.timeTravelArticles.length > 0
        ? {
            articles: initialState.timeTravelArticles,
            startYear: initialState.timeTravelStartYear,
            endYear: initialState.timeTravelEndYear,
          }
        : null,
    );

  const dataGatheredOn = dataUpdatedAt ? formatShortDate(dataUpdatedAt) : null;
  const sourceLangLabel =
    LANGUAGE_LABELS[wiki?.language ?? "en"] ?? wiki?.language;

  const [langCompareArticle, setLangCompareArticle] = useState<string | null>(
    null,
  );
  const [glossaryOpen, setGlossaryOpen] = useState<boolean>(false);
  const [addArticleOpen, setAddArticleOpen] = useState<boolean>(false);
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

  const yAxisConfig = Y_AXIS_CONFIG[yAxisKey];

  const rows = useMemo(
    () => buildChartRows(data, colorMode),
    [data, colorMode],
  );

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
          return (a: ChartRow, b: ChartRow) =>
            a.article.localeCompare(b.article);
        default:
          return (a: ChartRow, b: ChartRow) =>
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

  const publicationDates = useMemo(() => {
    return Object.fromEntries(
      sortedRows.map((row) => [row.article, row.publication_date ?? null]),
    );
  }, [sortedRows]);

  // Stable key for the excluded set so it can drive memo/effect deps without
  // relying on Set identity (which changes on every toggle).
  const excludedKey = useMemo(
    () => [...excludedOutliers].sort().join("|"),
    [excludedOutliers],
  );

  const yAxisAutoDomain = useMemo(() => {
    // Trimmed outliers must not stretch the auto domain, otherwise removing
    // them from the plot would not actually rescale the remaining bubbles.
    const extent = numericExtent(
      rows,
      (row) => row[yAxisConfig.currentField],
      (row) => excludedOutliers.has(row.article),
    );
    return { min: extent?.[0] ?? null, max: extent?.[1] ?? null };
  }, [rows, yAxisConfig.currentField, excludedOutliers]);

  // Full-data extent for the x axis, used to pin the x scale domain so filtering
  // hides bubbles without repacking or re-scaling (articles keep a fixed x
  // position). Computed over all rows for the current x field.
  const xFullDomain = useMemo<[number, number] | null>(() => {
    const isScaled = xAxisMode === "scaled" && xAxisKey !== "title";
    if (!isScaled) {
      return rows.length ? [1, rows.length] : null;
    }
    return numericExtent(rows, (row) =>
      xAxisKey === "publication_date"
        ? row.publication_date
          ? Date.parse(row.publication_date)
          : NaN
        : row[xAxisKey as NumericSortField],
    );
  }, [rows, xAxisKey, xAxisMode]);
  const xDomainMin = xFullDomain ? xFullDomain[0] : null;
  const xDomainMax = xFullDomain ? xFullDomain[1] : null;

  const sizeDomainMax = useMemo(() => {
    const maxOf = (
      field:
        | "talk_size"
        | "prev_article_size"
        | "lead_section_size"
        | "article_size",
    ) =>
      Math.max(
        0,
        numericExtent(
          rows,
          (row) => row[field],
          (row) => excludedOutliers.has(row.article),
        )?.[1] ?? 0,
      );
    return {
      talk_size: maxOf("talk_size"),
      prev_article_size: maxOf("prev_article_size"),
      lead_section_size: maxOf("lead_section_size"),
      article_size: maxOf("article_size"),
    };
  }, [rows, excludedOutliers]);
  const talkSizeMax = sizeDomainMax.talk_size;
  const prevArticleSizeMax = sizeDomainMax.prev_article_size;
  const leadSectionSizeMax = sizeDomainMax.lead_section_size;
  const articleSizeMax = sizeDomainMax.article_size;

  const parsedYAxisDomain = useMemo(
    () => parseYAxisDomain(committedYAxisMinInput, committedYAxisMaxInput),
    [committedYAxisMinInput, committedYAxisMaxInput],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setCommittedYAxisMinInput(yAxisMinInput);
      setCommittedYAxisMaxInput(yAxisMaxInput);
    }, 250);
    return () => clearTimeout(timer);
  }, [yAxisMinInput, yAxisMaxInput]);

  const aggregateStats = useMemo(
    () => computeAggregateStats(rows, topicStartDate, topicEndDate),
    [rows, topicStartDate, topicEndDate],
  );

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredArticles = useMemo(
    () =>
      filterArticles(sortedRows, {
        searchTerm: deferredSearchTerm,
        selectedGrades,
        filterMoveRestriction,
        filterEditRestriction,
        centralityMin,
        centralityMax,
        includeNoCentrality,
        yField: yAxisConfig.currentField,
        yDomain: parsedYAxisDomain,
        deselectedTags,
        includeUntagged,
      }),
    [
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
    ],
  );

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

    const spec = buildBubbleChartSpec({
      rows: currentSortedRows,
      xAxisKey,
      xAxisMode,
      xFullDomain,
      yAxisConfig,
      yScaleType: yAxisScaleType,
      yAxisAutoDomain,
      sizeDomainMax,
      availableTags,
      signals: {
        searchTerm,
        selectedGrades,
        filterMoveRestriction,
        filterEditRestriction,
        centralityMin,
        centralityMax,
        includeNoCentrality,
        excludedOutliers,
        deselectedTags,
        includeUntagged,
        showLabels,
        yDomain: parsedYAxisDomain,
      },
    });

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

    let resizeObserver: ResizeObserver | null = null;

    vegaEmbed(containerRef.current, spec, options)
      .then((result) => {
        viewRef.current = result;

        const chartContainer = result.view.container();
        if (chartContainer) {
          resizeObserver = new ResizeObserver(() => {
            const width = chartContainer.clientWidth;
            if (width > 0 && width !== result.view.width()) {
              result.view.width(width).runAsync();
            }
          });
          resizeObserver.observe(chartContainer);
        }

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
      resizeObserver?.disconnect();
      viewRef.current?.view.finalize();
      viewRef.current = null;
      lastEmbeddedSortedRowsRef.current = null;
    };
  }, [
    hasData,
    isLargeDatasetBucket,
    actions,
    xAxisKey,
    xAxisMode,
    yAxisConfig,
    yAxisScaleType,
    yAxisAutoDomain.min,
    yAxisAutoDomain.max,
    xDomainMin,
    xDomainMax,
    talkSizeMax,
    prevArticleSizeMax,
    leadSectionSizeMax,
    articleSizeMax,
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
    applySignals(viewRef.current, yDomainSignals(parsedYAxisDomain));
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

  const setSignals = (signals: Record<string, unknown>) =>
    applySignals(viewRef.current, signals);

  const toggleGrades = (grades: string[], on: boolean) => {
    setSignals(Object.fromEntries(grades.map((g) => [gradeSignalName(g), on])));
    startTransition(() => {
      setSelectedGrades((prev) => ({
        ...prev,
        ...Object.fromEntries(grades.map((g) => [g, on])),
      }));
    });
  };

  const toggleTag = (tag: string, on: boolean) => {
    const index = availableTags.indexOf(tag);
    if (index >= 0) setSignals({ [tagSignalName(index)]: on });
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
    setSignals(
      Object.fromEntries(
        availableTags.map((_tag, i) => [tagSignalName(i), on]),
      ),
    );
    startTransition(() => {
      setDeselectedTags(on ? new Set() : new Set(availableTags));
    });
  };

  const handleIncludeUntaggedChange = (checked: boolean) => {
    setSignals({ include_untagged: checked });
    startTransition(() => setIncludeUntagged(checked));
  };

  const handleMoveRestrictionChange = (checked: boolean) => {
    setSignals({ filter_move_restriction: checked });
    startTransition(() => setFilterMoveRestriction(checked));
  };

  const handleEditRestrictionChange = (checked: boolean) => {
    setSignals({ filter_edit_restriction: checked });
    startTransition(() => setFilterEditRestriction(checked));
  };

  const updateCentralitySignals = (
    min: number,
    max: number,
    includeUnassessed: boolean,
  ) =>
    setSignals({
      centrality_min: min,
      centrality_max: max,
      include_no_centrality: includeUnassessed,
    });

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
    setSignals({ show_labels: checked });
    setShowLabels(checked);
  };

  const { addArticleMutation, removeArticleMutation } =
    useTopicArticleMutations(topicId, {
      onRemoved: (title) => {
        setSelectedArticle((cur) => (cur?.article === title ? null : cur));
        setExcludedOutliers((prev) => {
          if (!prev.has(title)) return prev;
          const next = new Set(prev);
          next.delete(title);
          return next;
        });
      },
    });

  const handleAddArticle = (title: string) => {
    if (!canEdit || !topicId) return Promise.resolve();
    return addArticleMutation.mutateAsync(title);
  };

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
      setSignals({ search_input: term.trim().toLowerCase() });
    }, 150);
  };

  const handleTimeTravelFetch = () => {
    setTimeTravelQuery({
      articles: timeTravelArticles,
      startYear: timeTravelStartYear,
      endYear: timeTravelEndYear,
    });
  };

  const handleTimeTravelStartYearChange = (year: number) => {
    setTimeTravelStartYear(year);
    if (year >= timeTravelEndYear) {
      setTimeTravelEndYear(Math.min(new Date().getFullYear(), year + 1));
    }
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
      activeTab,
      timeTravelArticles,
      timeTravelStartYear,
      timeTravelEndYear,
      timeTravelXAxisKey,
      timeTravelXAxisMode,
      timeTravelYScaleType,
      timeTravelShowLabels,
    });
    const qs = new URLSearchParams(next).toString();
    return `${window.location.origin}${window.location.pathname}${
      qs ? `?${qs}` : ""
    }${window.location.hash}`;
  };

  const handleSaveImage = async () => {
    if (!viewRef.current) return;
    const dateRangeLabel = topicStartDate
      ? `${formatShortDate(topicStartDate)} - ${
          topicEndDate ? formatShortDate(topicEndDate) : "now"
        }`
      : null;
    const generatedLabel = `Generated ${formatShortDate(new Date())}`;
    const safeName = toSafeFilename(topicName, "article-analytics");

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

  const { run, stepIndex, startTour, handleEvent } = useOnboardingTour({
    hasData,
    onStepChange: (nextIndex) => {
      setActiveTab("overview");
      if (nextIndex === SIDEBAR_STEP_INDEX) setSidebarOpen(true);
    },
  });

  const handleStartTour = () => {
    setActiveTab("overview");
    setAdvancedOpen(false);
    startTour();
  };

  return (
    <div className="WikiBubbleChart">
      <Joyride
        steps={TOUR_STEPS}
        run={run}
        stepIndex={stepIndex}
        onEvent={handleEvent}
        continuous
        scrollToFirstStep
        options={JOYRIDE_OPTIONS}
        styles={JOYRIDE_STYLES}
      />
      <ChartToolbar
        articles={sortedRows}
        filteredArticles={filteredArticles}
        hasData={hasData}
        linkCopied={linkCopied}
        onSaveImage={handleSaveImage}
        onCopyLink={handleCopyLink}
        onOpenLegend={() => setLegendOpen(true)}
        onOpenGlossary={() => setGlossaryOpen(true)}
        onStartTour={handleStartTour}
      />

      <ChartTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        advancedOpen={advancedOpen}
        onToggleAdvanced={() => setAdvancedOpen((open) => !open)}
        showAdvancedToggle={activeTab !== "timeTravel"}
      />

      <div className="TabPanel" hidden={activeTab !== "overview"}>
        <AxisControls idPrefix="overview" {...axisControlProps} />

        <div className="AdvancedFilters">
          {advancedOpen && <AdvancedFilterPanel {...advancedFilterProps} />}
        </div>

        <div className="Heading">
          <div className="InfoLine">
            <BsInfoCircle size={24} className="InfoIcon" />
            <span>
              See an overview of articles with their statistics (click any
              article for more details)
            </span>
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
            onAddArticleClick={() => setAddArticleOpen(true)}
          />
        </div>

        <ChartAggregateStats stats={aggregateStats} />

        <div className="Footnote">
          {dataGatheredOn && <div>Data gathered on {dataGatheredOn}</div>}
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
            {dataGatheredOn && (
              <span>
                {sourceLangLabel} data gathered on {dataGatheredOn}; other
                languages are fetched live.
              </span>
            )}
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

      <div className="TabPanel" hidden={activeTab !== "timeTravel"}>
        {activeTab === "timeTravel" && topicId && (
          <TimeTravelPanel
            topicId={topicId}
            articleTitles={articleTitles}
            publicationDates={publicationDates}
            selectedArticles={timeTravelArticles}
            onSelectedArticlesChange={setTimeTravelArticles}
            startYear={timeTravelStartYear}
            endYear={timeTravelEndYear}
            onStartYearChange={handleTimeTravelStartYearChange}
            onEndYearChange={setTimeTravelEndYear}
            query={timeTravelQuery}
            onFetch={handleTimeTravelFetch}
            xAxisKey={timeTravelXAxisKey}
            onXAxisKeyChange={setTimeTravelXAxisKey}
            xAxisMode={timeTravelXAxisMode}
            onXAxisModeChange={setTimeTravelXAxisMode}
            yAxisScaleType={timeTravelYScaleType}
            onYAxisScaleTypeChange={setTimeTravelYScaleType}
            showLabels={timeTravelShowLabels}
            onShowLabelsChange={setTimeTravelShowLabels}
          />
        )}
        {activeTab === "timeTravel" && !topicId && (
          <div className="Panels--empty">
            Time travel is only available for a saved topic.
          </div>
        )}
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

      {addArticleOpen && canEdit && !!topicId && (
        <AddArticleModal
          wiki={wiki}
          onAdd={handleAddArticle}
          adding={addArticleMutation.isPending}
          onClose={() => setAddArticleOpen(false)}
        />
      )}

      {glossaryOpen && <GlossaryModal onClose={() => setGlossaryOpen(false)} />}

      {legendOpen && <LegendModal onClose={() => setLegendOpen(false)} />}
    </div>
  );
};

export default WikiBubbleChart;
