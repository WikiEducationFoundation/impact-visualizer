import type { XAxisKey, YAxisKey } from "../types/bubble-chart.type";
import type { ChartTab } from "../components/chart-tab-bar.component";
import {
  MIN_TIME_TRAVEL_YEAR,
  TIME_TRAVEL_X_AXIS_KEYS,
} from "./time-travel-vega";

export interface ChartUiState {
  xAxisKey: XAxisKey;
  xAxisMode: "ranked" | "scaled";
  yAxisKey: YAxisKey;
  yAxisScaleType: "linear" | "log";
  yAxisMin: string;
  yAxisMax: string;
  filterMoveRestriction: boolean;
  filterEditRestriction: boolean;
  centralityMin: number;
  centralityMax: number;
  includeNoCentrality: boolean;
  searchTerm: string;
  showLabels: boolean;
  colorMode: "assessment" | "single";
  selectedGrades: Record<string, boolean>;
  deselectedTags: string[];
  includeUntagged: boolean;
  excludedOutliers: string[];
  activeTab: ChartTab;
  timeTravelArticles: string[];
  timeTravelStartYear: number;
  timeTravelEndYear: number;
  timeTravelXAxisKey: XAxisKey;
  timeTravelXAxisMode: "ranked" | "scaled";
  timeTravelYScaleType: "linear" | "log";
  timeTravelShowLabels: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_TIME_TRAVEL_START_YEAR = Math.max(
  MIN_TIME_TRAVEL_YEAR,
  CURRENT_YEAR - 5,
);

export const CENTRALITY_MIN = 1;
export const CENTRALITY_MAX = 10;

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

const X_AXIS_KEYS: XAxisKey[] = [
  "title",
  "publication_date",
  "linguistic_versions_count",
  "article_size",
  "lead_section_size",
  "talk_size",
  "warning_tags_count",
  "images_count",
];
const Y_AXIS_KEYS: YAxisKey[] = [
  "average_daily_views",
  "number_of_editors",
  "incoming_links_count",
];

export const DEFAULT_CHART_UI_STATE: ChartUiState = {
  xAxisKey: "title",
  xAxisMode: "ranked",
  yAxisKey: "number_of_editors",
  yAxisScaleType: "linear",
  yAxisMin: "",
  yAxisMax: "",
  filterMoveRestriction: false,
  filterEditRestriction: false,
  centralityMin: CENTRALITY_MIN,
  centralityMax: CENTRALITY_MAX,
  includeNoCentrality: true,
  searchTerm: "",
  showLabels: false,
  colorMode: "assessment",
  selectedGrades: Object.fromEntries(GRADE_KEYS.map((g) => [g, true])),
  deselectedTags: [],
  includeUntagged: true,
  excludedOutliers: [],
  activeTab: "overview",
  timeTravelArticles: [],
  timeTravelStartYear: DEFAULT_TIME_TRAVEL_START_YEAR,
  timeTravelEndYear: CURRENT_YEAR,
  timeTravelXAxisKey: "title",
  timeTravelXAxisMode: "ranked",
  timeTravelYScaleType: "linear",
  timeTravelShowLabels: false,
};

const TAB_PARAMS: Record<string, ChartTab> = {
  lang: "languages",
  tt: "timeTravel",
};

function allGradesOn(selected: Record<string, boolean>): boolean {
  return GRADE_KEYS.every((g) => selected[g] !== false);
}

export function encodeChartState(state: ChartUiState): Record<string, string> {
  const params: Record<string, string> = {};

  if (state.xAxisKey !== "title") params.x = state.xAxisKey;
  if (state.xAxisMode !== "ranked") params.xm = state.xAxisMode;
  if (state.yAxisKey !== "number_of_editors") params.y = state.yAxisKey;
  if (state.yAxisScaleType !== "linear") params.ys = state.yAxisScaleType;
  if (state.yAxisMin.trim() !== "") params.ymin = state.yAxisMin.trim();
  if (state.yAxisMax.trim() !== "") params.ymax = state.yAxisMax.trim();
  if (state.filterMoveRestriction) params.mv = "1";
  if (state.filterEditRestriction) params.ed = "1";
  if (state.centralityMin !== CENTRALITY_MIN)
    params.cmin = String(state.centralityMin);
  if (state.centralityMax !== CENTRALITY_MAX)
    params.cmax = String(state.centralityMax);
  if (!state.includeNoCentrality) params.cna = "0";
  if (state.searchTerm.trim() !== "") params.q = state.searchTerm.trim();
  if (state.showLabels) params.lbl = "1";
  if (state.colorMode === "single") params.mono = "1";

  if (!allGradesOn(state.selectedGrades)) {
    const off = GRADE_KEYS.filter((g) => state.selectedGrades[g] === false);
    if (off.length) params.off = off.join(",");
  }

  // Tags are all-selected by default, so (like grades) we encode only the ones
  // the user turned off.
  if (state.deselectedTags.length)
    params.tagsoff = state.deselectedTags.join(",");

  if (!state.includeUntagged) params.untag = "0";

  if (state.excludedOutliers.length)
    params.trim = state.excludedOutliers.join("|");

  if (state.activeTab === "languages") params.tab = "lang";
  if (state.activeTab === "timeTravel") params.tab = "tt";

  if (state.timeTravelArticles.length)
    params.tta = state.timeTravelArticles.join("|");
  if (state.timeTravelStartYear !== DEFAULT_TIME_TRAVEL_START_YEAR)
    params.ttS = String(state.timeTravelStartYear);
  if (state.timeTravelEndYear !== CURRENT_YEAR)
    params.ttE = String(state.timeTravelEndYear);
  if (state.timeTravelXAxisKey !== "title")
    params.ttx = state.timeTravelXAxisKey;
  if (state.timeTravelXAxisMode !== "ranked")
    params.ttxm = state.timeTravelXAxisMode;
  if (state.timeTravelYScaleType !== "linear")
    params.ttys = state.timeTravelYScaleType;
  if (state.timeTravelShowLabels) params.ttlbl = "1";

  return params;
}

function clampYear(value: number): number {
  if (!Number.isFinite(value)) return CURRENT_YEAR;
  return Math.min(
    CURRENT_YEAR,
    Math.max(MIN_TIME_TRAVEL_YEAR, Math.round(value)),
  );
}

function clampCentrality(value: number): number {
  if (!Number.isFinite(value)) return CENTRALITY_MIN;
  return Math.min(CENTRALITY_MAX, Math.max(CENTRALITY_MIN, Math.round(value)));
}

// Decode URL params back into a full, validated state. Unknown / malformed
// values silently fall back to their defaults.
export function decodeChartState(params: URLSearchParams): ChartUiState {
  const state: ChartUiState = {
    ...DEFAULT_CHART_UI_STATE,
    selectedGrades: { ...DEFAULT_CHART_UI_STATE.selectedGrades },
  };

  const x = params.get("x");
  if (x && (X_AXIS_KEYS as string[]).includes(x))
    state.xAxisKey = x as XAxisKey;

  const xm = params.get("xm");
  if (xm === "scaled" || xm === "ranked") state.xAxisMode = xm;
  if (state.xAxisKey === "title") state.xAxisMode = "ranked";

  const y = params.get("y");
  if (y && (Y_AXIS_KEYS as string[]).includes(y))
    state.yAxisKey = y as YAxisKey;

  const ys = params.get("ys");
  if (ys === "log" || ys === "linear") state.yAxisScaleType = ys;

  const ymin = params.get("ymin");
  if (ymin !== null && ymin.trim() !== "" && Number.isFinite(Number(ymin))) {
    state.yAxisMin = ymin.trim();
  }
  const ymax = params.get("ymax");
  if (ymax !== null && ymax.trim() !== "" && Number.isFinite(Number(ymax))) {
    state.yAxisMax = ymax.trim();
  }

  state.filterMoveRestriction = params.get("mv") === "1";
  state.filterEditRestriction = params.get("ed") === "1";

  const cmin = params.get("cmin");
  const cmax = params.get("cmax");
  if (cmin !== null) state.centralityMin = clampCentrality(Number(cmin));
  if (cmax !== null) state.centralityMax = clampCentrality(Number(cmax));
  if (state.centralityMin > state.centralityMax) {
    [state.centralityMin, state.centralityMax] = [
      state.centralityMax,
      state.centralityMin,
    ];
  }

  state.includeNoCentrality = params.get("cna") !== "0";

  const q = params.get("q");
  if (q) state.searchTerm = q;

  state.showLabels = params.get("lbl") === "1";

  state.colorMode = params.get("mono") === "1" ? "single" : "assessment";

  const off = params.get("off");
  if (off) {
    const offSet = new Set(off.split(","));
    for (const g of GRADE_KEYS) {
      if (offSet.has(g)) state.selectedGrades[g] = false;
    }
  }

  const tagsoff = params.get("tagsoff");
  state.deselectedTags = tagsoff ? tagsoff.split(",").filter(Boolean) : [];

  state.includeUntagged = params.get("untag") !== "0";

  const trim = params.get("trim");
  state.excludedOutliers = trim ? trim.split("|").filter(Boolean) : [];

  const tab = params.get("tab");
  if (tab && TAB_PARAMS[tab]) state.activeTab = TAB_PARAMS[tab];

  const tta = params.get("tta");
  if (tta) {
    state.timeTravelArticles = tta.split("|").filter(Boolean);
  }

  const ttS = params.get("ttS");
  if (ttS !== null) state.timeTravelStartYear = clampYear(Number(ttS));
  const ttE = params.get("ttE");
  if (ttE !== null) state.timeTravelEndYear = clampYear(Number(ttE));
  if (state.timeTravelStartYear > state.timeTravelEndYear) {
    [state.timeTravelStartYear, state.timeTravelEndYear] = [
      state.timeTravelEndYear,
      state.timeTravelStartYear,
    ];
  }
  if (state.timeTravelStartYear === state.timeTravelEndYear) {
    if (state.timeTravelEndYear < CURRENT_YEAR) {
      state.timeTravelEndYear += 1;
    } else {
      state.timeTravelStartYear = Math.max(
        MIN_TIME_TRAVEL_YEAR,
        state.timeTravelEndYear - 1,
      );
    }
  }

  const ttx = params.get("ttx");
  if (ttx && (TIME_TRAVEL_X_AXIS_KEYS as string[]).includes(ttx))
    state.timeTravelXAxisKey = ttx as XAxisKey;

  const ttxm = params.get("ttxm");
  if (ttxm === "scaled" || ttxm === "ranked") state.timeTravelXAxisMode = ttxm;
  if (state.timeTravelXAxisKey === "title")
    state.timeTravelXAxisMode = "ranked";

  const ttys = params.get("ttys");
  if (ttys === "log" || ttys === "linear") state.timeTravelYScaleType = ttys;

  state.timeTravelShowLabels = params.get("ttlbl") === "1";

  return state;
}
