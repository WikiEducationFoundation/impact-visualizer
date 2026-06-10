import type { XAxisKey, YAxisKey } from "../types/bubble-chart.type";

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
  selectedGrades: Record<string, boolean>;
  deselectedTags: string[];
  includeUntagged: boolean;
  excludedOutliers: string[];
}

const CENTRALITY_MIN = 1;
const CENTRALITY_MAX = 10;

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
  yAxisKey: "average_daily_views",
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
  selectedGrades: Object.fromEntries(GRADE_KEYS.map((g) => [g, true])),
  deselectedTags: [],
  includeUntagged: true,
  excludedOutliers: [],
};

function allGradesOn(selected: Record<string, boolean>): boolean {
  return GRADE_KEYS.every((g) => selected[g] !== false);
}

export function encodeChartState(state: ChartUiState): Record<string, string> {
  const params: Record<string, string> = {};

  if (state.xAxisKey !== "title") params.x = state.xAxisKey;
  if (state.xAxisMode !== "ranked") params.xm = state.xAxisMode;
  if (state.yAxisKey !== "average_daily_views") params.y = state.yAxisKey;
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

  return params;
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

  return state;
}
