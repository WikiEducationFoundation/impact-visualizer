import type { Result, VisualizationSpec } from "vega-embed";
import type {
  ChartRow,
  XAxisKey,
  YAxisConfig,
  YAxisDomain,
} from "../types/bubble-chart.type";
import { GRADE_KEYS, xAxisTitleForKey } from "./bubble-chart-utils";

// Largest bubble radius (Vega derives radius from area; max size range is 1500).
export const MAX_CIRCLE_RADIUS = Math.sqrt(1500 / Math.PI);
const Y_BOTTOM_MARGIN = MAX_CIRCLE_RADIUS * 2;

// Post-compile tweaks Vega-Lite can't express directly.
export const patchChartScales = (vgSpec: any) => {
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

export const CHART_HEIGHT = 650;
export const LARGE_DATASET_THRESHOLD = 10000;

export type SizeDomainMax = {
  talk_size: number;
  prev_article_size: number;
  lead_section_size: number;
  article_size: number;
};

export type BubbleChartSignalState = {
  searchTerm: string;
  selectedGrades: Record<string, boolean>;
  filterMoveRestriction: boolean;
  filterEditRestriction: boolean;
  centralityMin: number;
  centralityMax: number;
  includeNoCentrality: boolean;
  excludedOutliers: Set<string>;
  deselectedTags: Set<string>;
  includeUntagged: boolean;
  showLabels: boolean;
  yDomain: YAxisDomain;
};

type AutoDomain = { min: number | null; max: number | null };

type BuildBubbleChartSpecOptions = {
  rows: ChartRow[];
  xAxisKey: XAxisKey;
  xAxisMode: "ranked" | "scaled";
  xFullDomain: [number, number] | null;
  yAxisConfig: YAxisConfig;
  yScaleType: "linear" | "log";
  yAxisAutoDomain: AutoDomain;
  sizeDomainMax: SizeDomainMax;
  availableTags: string[];
  signals: BubbleChartSignalState;
};

export const gradeSignalName = (grade: string) => `grade_${grade}`;
export const tagSignalName = (index: number) => `tag_${index}`;

export const yDomainSignals = ({ domainMin, domainMax }: YAxisDomain) => ({
  y_domain_min: domainMin ?? -Infinity,
  y_domain_max: domainMax ?? Infinity,
});

export function applySignals(
  result: Result | null,
  signals: Record<string, unknown>,
) {
  if (!result) return;
  for (const [name, value] of Object.entries(signals)) {
    result.view.signal(name, value);
  }
  result.view.runAsync();
}

const GRADE_FILTER_EXPR = `(${GRADE_KEYS.map((grade) =>
  grade === "Unassessed"
    ? `(${gradeSignalName(grade)} && !datum.assessment_grade)`
    : `(${gradeSignalName(grade)} && datum.assessment_grade == '${grade}')`,
).join(" || ")})`;

const TOOLTIP_SIGNAL = `{
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
  "Tags": length(datum.classifications) ? join(datum.classifications, ', ') : 'none',
}`;

function yScaleSpec(
  yScaleType: "linear" | "log",
  { min: autoDomainMin, max: autoDomainMax }: AutoDomain,
): Record<string, any> {
  if (yScaleType === "log") {
    const logAutoMin =
      autoDomainMin !== null && autoDomainMin > 0 ? autoDomainMin : 1;
    const logAutoMax = autoDomainMax ?? 1000;
    return {
      type: "log",
      domainMin: {
        expr: `max(1, isFinite(y_domain_min) && y_domain_min > 0 ? y_domain_min : ${logAutoMin}) * 0.6`,
      },
      domainMax: {
        expr: `(isFinite(y_domain_max) ? y_domain_max : ${logAutoMax}) * 1.8`,
      },
    };
  }

  // Fall back to the auto domain when no user range; clamp autoMin to 0.
  const autoMin = autoDomainMin !== null ? Math.max(0, autoDomainMin) : 0;
  const autoMax = autoDomainMax ?? 1000;
  const loExpr = `(isFinite(y_domain_min) ? y_domain_min : ${autoMin})`;
  const hiExpr = `(isFinite(y_domain_max) ? y_domain_max : ${autoMax})`;
  // Radius padding in domain units so boundary bubbles stay visible; max(,1)
  // guards a degenerate span; domainMin clamps to 0 (no below-zero axis).
  const spanExpr = `max((${hiExpr}) - (${loExpr}), 1)`;
  const padExpr = `(${MAX_CIRCLE_RADIUS} * (${spanExpr}) / ${CHART_HEIGHT})`;
  return {
    domainMin: { expr: `max(0, (${loExpr}) - ${padExpr})` },
    domainMax: { expr: `(${hiExpr}) + ${padExpr}` },
  };
}

function xEncodingSpec(
  xAxisKey: XAxisKey,
  xAxisMode: "ranked" | "scaled",
  xFullDomain: [number, number] | null,
) {
  const isScaledMode = xAxisMode === "scaled" && xAxisKey !== "title";
  const titles = xAxisTitleForKey(xAxisKey);

  const base = isScaledMode
    ? {
        field: xAxisKey,
        type:
          xAxisKey === "publication_date"
            ? ("temporal" as const)
            : ("quantitative" as const),
        axis: { title: titles.scaled, labels: true, ticks: true, grid: true },
      }
    : {
        field: "idx",
        type: "quantitative" as const,
        axis: {
          title: titles.ranked,
          labels: false,
          ticks: false,
          grid: false,
        },
      };

  // Edge padding so the first/last bubble isn't clipped (the pan clamp
  // otherwise pins the domain flush to the data). Pin the domain to the full
  // data extent so filtering hides bubbles without repacking/re-scaling —
  // every article keeps a fixed x position for comparison across filters.
  return {
    ...base,
    scale: {
      padding: MAX_CIRCLE_RADIUS,
      ...(xFullDomain ? { domain: xFullDomain } : {}),
    },
  };
}

function yFilterExpr(yAxisConfig: YAxisConfig, isLogScale: boolean) {
  const yFieldExpr = `datum[${JSON.stringify(yAxisConfig.currentField)}]`;
  return [
    ...(isLogScale ? [`${yFieldExpr} > 0`] : []),
    `(!isFinite(y_domain_min) || ${yFieldExpr} >= y_domain_min)`,
    `(!isFinite(y_domain_max) || ${yFieldExpr} <= y_domain_max)`,
  ].join(" && ");
}

function visibilityFilterExpr(availableTags: string[]) {
  const tagFilterExpr = availableTags.length
    ? `((length(datum.classifications) == 0 && include_untagged) || (${availableTags
        .map(
          (tag, i) =>
            `(${tagSignalName(i)} && indexof(datum.classifications, ${JSON.stringify(tag)}) >= 0)`,
        )
        .join(" || ")}))`
    : "true";

  return [
    "(!search_input || indexof(lower(datum.article), search_input) >= 0)",
    GRADE_FILTER_EXPR,
    "((!filter_move_restriction || datum.has_move_restriction) && (!filter_edit_restriction || datum.has_edit_restriction))",
    "((isValid(datum.centrality) && datum.centrality >= centrality_min && datum.centrality <= centrality_max) || (!isValid(datum.centrality) && include_no_centrality))",
    "(indexof(trimmed_articles, datum.article) < 0)",
    tagFilterExpr,
  ].join(" && ");
}

function rankedSort(xAxisKey: XAxisKey) {
  if (xAxisKey === "title") {
    return [{ field: "article", order: "ascending" as const }];
  }
  return [
    { field: xAxisKey, order: "ascending" as const },
    { field: "article", order: "ascending" as const },
  ];
}

function signalParams(
  signals: BubbleChartSignalState,
  availableTags: string[],
) {
  const values: Record<string, unknown> = {
    search_input: signals.searchTerm.trim().toLowerCase(),
    ...Object.fromEntries(
      GRADE_KEYS.map((grade) => [
        gradeSignalName(grade),
        signals.selectedGrades[grade],
      ]),
    ),
    filter_move_restriction: signals.filterMoveRestriction,
    filter_edit_restriction: signals.filterEditRestriction,
    centrality_min: signals.centralityMin,
    centrality_max: signals.centralityMax,
    include_no_centrality: signals.includeNoCentrality,
    trimmed_articles: [...signals.excludedOutliers],
    ...Object.fromEntries(
      availableTags.map((tag, i) => [
        tagSignalName(i),
        !signals.deselectedTags.has(tag),
      ]),
    ),
    include_untagged: signals.includeUntagged,
    show_labels: signals.showLabels,
    ...yDomainSignals(signals.yDomain),
  };
  return Object.entries(values).map(([name, value]) => ({ name, value }));
}

function opacityEncoding(activeOpacity: number, useHighlight: boolean) {
  if (!useHighlight) return { value: activeOpacity };
  return {
    condition: [
      { param: "highlight", empty: false, value: activeOpacity },
      { test: "!highlight.article", value: activeOpacity },
    ],
    value: 0.06,
  };
}

function sizeEncoding(
  field: keyof SizeDomainMax,
  max: number,
  range: [number, number],
) {
  return {
    field,
    type: "quantitative" as const,
    scale: {
      type: "sqrt" as const,
      range,
      ...(max > 0 ? { domain: [0, max] } : {}),
    },
  };
}

function colorEncoding(field: string) {
  return { field, type: "nominal" as const, scale: null, legend: null };
}

export function buildBubbleChartSpec({
  rows,
  xAxisKey,
  xAxisMode,
  xFullDomain,
  yAxisConfig,
  yScaleType,
  yAxisAutoDomain,
  sizeDomainMax,
  availableTags,
  signals,
}: BuildBubbleChartSpecOptions): VisualizationSpec {
  const isLogScale = yScaleType === "log";
  const useHighlight = rows.length <= LARGE_DATASET_THRESHOLD;
  const yEncoding = {
    field: yAxisConfig.currentField,
    type: "quantitative" as const,
    scale: yScaleSpec(yScaleType, yAxisAutoDomain),
  };

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    height: CHART_HEIGHT,
    width: "container",
    background: "#ffffff",
    data: { name: "main", values: rows },
    transform: [
      { window: [{ op: "row_number", as: "idx" }], sort: rankedSort(xAxisKey) },
      { filter: yFilterExpr(yAxisConfig, isLogScale) },
      { filter: visibilityFilterExpr(availableTags) },
    ],
    config: {
      legend: { disable: true },
      style: {
        cell: { cursor: "grab" },
      },
    },
    params: signalParams(signals, availableTags),

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
      {
        mark: {
          type: "circle",
          fill: null,
          strokeWidth: 1.5,
          cursor: "pointer",
        },
        encoding: {
          y: yEncoding,
          size: sizeEncoding("talk_size", sizeDomainMax.talk_size, [50, 1500]),
          stroke: colorEncoding("bubble_talk_color"),
          opacity: opacityEncoding(1, useHighlight),
        },
      },
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
          size: sizeEncoding(
            "prev_article_size",
            sizeDomainMax.prev_article_size,
            [20, 600],
          ),
          stroke: colorEncoding("bubble_prev_color"),
          opacity: opacityEncoding(1, useHighlight),
        },
      },
      {
        mark: {
          type: "circle",
          opacity: 0.8,
          cursor: "pointer",
        },
        encoding: {
          y: yEncoding,
          size: sizeEncoding(
            "lead_section_size",
            sizeDomainMax.lead_section_size,
            [30, 800],
          ),
          fill: colorEncoding("bubble_lead_color"),
          opacity: opacityEncoding(0.8, useHighlight),
        },
      },
      {
        mark: {
          type: "circle",
          opacity: 1,
          stroke: "white",
          strokeWidth: 1,
          cursor: "pointer",
          tooltip: { signal: TOOLTIP_SIGNAL },
        },
        encoding: {
          y: yEncoding,
          size: sizeEncoding(
            "article_size",
            sizeDomainMax.article_size,
            [20, 600],
          ),
          fill: colorEncoding("bubble_article_color"),
          opacity: opacityEncoding(1, useHighlight),
        },
      },
      {
        transform: [{ filter: "show_labels" }],
        mark: {
          type: "text",
          align: "center",
          baseline: "bottom",
          dy: -10,
          angle: 0,
          fontSize: 9,
          limit: 120,
          clip: true,
        },
        encoding: {
          text: { field: "article", type: "nominal" },
          opacity: { value: 1 },
        },
      },
    ],

    encoding: {
      x: xEncodingSpec(xAxisKey, xAxisMode, xFullDomain),
      y: {
        ...yEncoding,
        axis: { title: yAxisConfig.axisTitle },
      },
    },

    resolve: { scale: { size: "independent" } },
  };
}
