import React, { useEffect, useRef, useMemo, useState } from "react";
import vegaEmbed, { VisualizationSpec, EmbedOptions, Result } from "vega-embed";
import CSVButton from "./CSV-button.component";
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

type Wiki = {
  language: string;
  project: string;
};

interface WikiBubbleChartProps {
  data?: Record<string, ArticleAnalytics>;
  actions?: boolean;
  wiki?: Wiki;
}

const HEIGHT = 650;

const gradeGroups = [
  { id: "fa", label: "Featured", grades: ["FA", "FL"], dot: "#9CBDFF" },
  { id: "ga", label: "GA", grades: ["GA"], dot: "#66FF66" },
  { id: "aclass", label: "A-Class", grades: ["A"], dot: "#66FFFF" },
  { id: "bclass", label: "B-Class", grades: ["B"], dot: "#B2FF66" },
  { id: "cclass", label: "C-Class", grades: ["C"], dot: "#FFFF66" },
  { id: "start", label: "Start", grades: ["Start"], dot: "#FFAA66" },
  { id: "stub", label: "Stub", grades: ["Stub"], dot: "#FFA4A4" },
  { id: "list", label: "List", grades: ["List"], dot: "#C7B1FF" },
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
      <div className="BoxTitle">Quality assessment</div>
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

export const WikiBubbleChart: React.FC<WikiBubbleChartProps> = ({
  data = {},
  actions = false,
  wiki,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<Result | null>(null);
  // Generating a unique random id for the search container to avoid re-rendering issues
  const searchContainerId = useMemo(
    () => `search-container-${Math.random().toString(36).slice(2)}`,
    []
  );
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
    }
  );
  const [xAxisKey, setXAxisKey] = useState<XAxisKey>("title");
  const [yAxisKey, setYAxisKey] = useState<YAxisKey>("average_daily_views");
  const [yAxisMinInput, setYAxisMinInput] = useState<string>("");
  const [yAxisMaxInput, setYAxisMaxInput] = useState<string>("");
  const [filterMoveRestriction, setFilterMoveRestriction] =
    useState<boolean>(false);
  const [filterEditRestriction, setFilterEditRestriction] =
    useState<boolean>(false);

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
            analytics?.assessment_grade
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

  const yAxisAutoDomain = useMemo(() => {
    const values = rows
      .map((row) => row[yAxisConfig.currentField])
      .filter((value) => typeof value === "number" && Number.isFinite(value));

    if (!values.length) return { min: null, max: null };
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [rows, yAxisConfig.currentField]);

  useEffect(() => {
    setYAxisMinInput("");
    setYAxisMaxInput("");
  }, [yAxisKey]);

  useEffect(() => {
    if (!containerRef.current || sortedRows.length === 0) return;

    const parsedMin =
      yAxisMinInput.trim() === "" ? null : Number(yAxisMinInput);
    const parsedMax =
      yAxisMaxInput.trim() === "" ? null : Number(yAxisMaxInput);
    let domainMin =
      parsedMin !== null && Number.isFinite(parsedMin) ? parsedMin : null;
    let domainMax =
      parsedMax !== null && Number.isFinite(parsedMax) ? parsedMax : null;

    if (domainMin !== null && domainMax !== null && domainMin > domainMax) {
      const tmp = domainMin;
      domainMin = domainMax;
      domainMax = tmp;
    }

    const yScale: Record<string, number> = {};
    if (domainMin !== null) yScale.domainMin = domainMin;
    if (domainMax !== null) yScale.domainMax = domainMax;

    const yFilterExprParts: string[] = [];
    const yFieldExpr = `datum[${JSON.stringify(yAxisConfig.currentField)}]`;
    if (domainMin !== null)
      yFilterExprParts.push(`${yFieldExpr} >= ${domainMin}`);
    if (domainMax !== null)
      yFilterExprParts.push(`${yFieldExpr} <= ${domainMax}`);
    const yFilterExpr = yFilterExprParts.length
      ? yFilterExprParts.join(" && ")
      : null;

    const yEncoding: any = {
      field: yAxisConfig.currentField,
      type: "quantitative",
      ...(Object.keys(yScale).length ? { scale: yScale } : {}),
    };

    const spec: VisualizationSpec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      height: HEIGHT,
      width: "container",
      background: "#ffffff",
      data: { values: sortedRows },
      transform: [
        ...(yFilterExpr ? [{ filter: yFilterExpr }] : []),
        { window: [{ op: "row_number", as: "idx" }] },
      ],
      config: {
        legend: { disable: true },
        style: {
          cell: { cursor: "grab" },
        },
      },
      params: [
        {
          name: "search_input",
          bind: {
            input: "search",
            placeholder: "Article name",
            name: "Search",
            element: `#${searchContainerId}`,
          },
          value: "",
        },
        { name: "grade_FA", value: selectedGrades.FA },
        { name: "grade_GA", value: selectedGrades.GA },
        { name: "grade_A", value: selectedGrades.A },
        { name: "grade_FL", value: selectedGrades.FL },
        { name: "grade_B", value: selectedGrades.B },
        { name: "grade_C", value: selectedGrades.C },
        { name: "grade_Start", value: selectedGrades.Start },
        { name: "grade_Stub", value: selectedGrades.Stub },
        { name: "grade_List", value: selectedGrades.List },
        { name: "filter_move_restriction", value: filterMoveRestriction },
        { name: "filter_edit_restriction", value: filterEditRestriction },
      ],

      layer: [
        {
          mark: {
            type: "circle",
            opacity: 0,
          },
          params: [
            {
              name: "highlight",
              select: {
                type: "point",
                fields: ["article"],
                on: "mouseover",
                clear: "mouseout",
              },
            },
            {
              name: "grid",
              select: { type: "interval", zoom: true },
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
            opacity: {
              condition: [
                { param: "highlight", empty: false, value: 1 },
                {
                  test: "(!highlight.article) && (!search_input || test(regexp(search_input,'i'), datum.article)) && ((grade_FA && datum.assessment_grade == 'FA') || (grade_FL && datum.assessment_grade == 'FL') || (grade_GA && datum.assessment_grade == 'GA') || (grade_A && datum.assessment_grade == 'A') || (grade_B && datum.assessment_grade == 'B') || (grade_C && datum.assessment_grade == 'C') || (grade_Start && datum.assessment_grade == 'Start') || (grade_Stub && datum.assessment_grade == 'Stub') || (grade_List && datum.assessment_grade == 'List') || !datum.assessment_grade) && ((!filter_move_restriction && !filter_edit_restriction) || (filter_move_restriction && !filter_edit_restriction && datum.has_move_restriction) || (!filter_move_restriction && filter_edit_restriction && datum.has_edit_restriction) || (filter_move_restriction && filter_edit_restriction && datum.has_move_restriction && datum.has_edit_restriction))",
                  value: 1,
                },
              ],
              value: 0.06,
            },
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
            opacity: {
              condition: [
                { param: "highlight", empty: false, value: 1 },
                {
                  test: "(!highlight.article) && (!search_input || test(regexp(search_input,'i'), datum.article)) && ((grade_FA && datum.assessment_grade == 'FA') || (grade_FL && datum.assessment_grade == 'FL') || (grade_GA && datum.assessment_grade == 'GA') || (grade_A && datum.assessment_grade == 'A') || (grade_B && datum.assessment_grade == 'B') || (grade_C && datum.assessment_grade == 'C') || (grade_Start && datum.assessment_grade == 'Start') || (grade_Stub && datum.assessment_grade == 'Stub') || (grade_List && datum.assessment_grade == 'List') || !datum.assessment_grade) && ((!filter_move_restriction && !filter_edit_restriction) || (filter_move_restriction && !filter_edit_restriction && datum.has_move_restriction) || (!filter_move_restriction && filter_edit_restriction && datum.has_edit_restriction) || (filter_move_restriction && filter_edit_restriction && datum.has_move_restriction && datum.has_edit_restriction))",
                  value: 1,
                },
              ],
              value: 0.06,
            },
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
            opacity: {
              condition: [
                { param: "highlight", empty: false, value: 0.8 },
                {
                  test: "(!highlight.article) && (!search_input || test(regexp(search_input,'i'), datum.article)) && ((grade_FA && datum.assessment_grade == 'FA') || (grade_FL && datum.assessment_grade == 'FL') || (grade_GA && datum.assessment_grade == 'GA') || (grade_A && datum.assessment_grade == 'A') || (grade_B && datum.assessment_grade == 'B') || (grade_C && datum.assessment_grade == 'C') || (grade_Start && datum.assessment_grade == 'Start') || (grade_Stub && datum.assessment_grade == 'Stub') || (grade_List && datum.assessment_grade == 'List') || !datum.assessment_grade) && ((!filter_move_restriction && !filter_edit_restriction) || (filter_move_restriction && !filter_edit_restriction && datum.has_move_restriction) || (!filter_move_restriction && filter_edit_restriction && datum.has_edit_restriction) || (filter_move_restriction && filter_edit_restriction && datum.has_move_restriction && datum.has_edit_restriction))",
                  value: 0.8,
                },
              ],
              value: 0.06,
            },
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
            opacity: {
              condition: [
                { param: "highlight", empty: false, value: 0.5 },
                {
                  test: "(!highlight.article) && (!search_input || test(regexp(search_input,'i'), datum.article)) && ((grade_FA && datum.assessment_grade == 'FA') || (grade_FL && datum.assessment_grade == 'FL') || (grade_GA && datum.assessment_grade == 'GA') || (grade_A && datum.assessment_grade == 'A') || (grade_B && datum.assessment_grade == 'B') || (grade_C && datum.assessment_grade == 'C') || (grade_Start && datum.assessment_grade == 'Start') || (grade_Stub && datum.assessment_grade == 'Stub') || (grade_List && datum.assessment_grade == 'List') || !datum.assessment_grade) && ((!filter_move_restriction && !filter_edit_restriction) || (filter_move_restriction && !filter_edit_restriction && datum.has_move_restriction) || (!filter_move_restriction && filter_edit_restriction && datum.has_edit_restriction) || (filter_move_restriction && filter_edit_restriction && datum.has_move_restriction && datum.has_edit_restriction))",
                  value: 0.5,
                },
              ],
              value: 0.06,
            },
          },
        },
      ],

      encoding: {
        x: {
          field: "idx",
          type: "quantitative",
          axis: {
            title: xAxisTitleForKey(xAxisKey),
            labels: false,
            ticks: false,
            grid: false,
          },
        },
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

    vegaEmbed(containerRef.current, spec, options)
      .then((result) => {
        viewRef.current = result;

        result.view.addEventListener("click", (_event, item) => {
          if (item && item.datum && item.datum.article) {
            const articleName = item.datum.article;
            const language = wiki?.language || "en";
            const project = wiki?.project || "wikipedia";
            const wikiUrl = `https://${language}.${project}.org/wiki/${encodeURIComponent(
              articleName.replace(/ /g, "_")
            )}`;
            window.open(wikiUrl, "_blank");
          }
        });
      })
      .catch(console.error);

    return () => {
      viewRef.current?.view.finalize();
      viewRef.current = null;
    };
  }, [
    sortedRows,
    actions,
    wiki,
    selectedGrades,
    searchContainerId,
    xAxisKey,
    yAxisConfig,
    yAxisMinInput,
    yAxisMaxInput,
    filterMoveRestriction,
    filterEditRestriction,
  ]);

  const toggleGrades = (grades: string[], on: boolean) => {
    setSelectedGrades((prev) => {
      const next = { ...prev };
      grades.forEach((g) => {
        next[g] = on;
      });
      if (viewRef.current) {
        grades.forEach((g) => viewRef.current!.view.signal(`grade_${g}`, on));
        viewRef.current.view.runAsync();
      }
      return next;
    });
  };

  const handleMoveRestrictionChange = (checked: boolean) => {
    setFilterMoveRestriction(checked);
    if (viewRef.current) {
      viewRef.current.view.signal("filter_move_restriction", checked);
      viewRef.current.view.runAsync();
    }
  };

  const handleEditRestrictionChange = (checked: boolean) => {
    setFilterEditRestriction(checked);
    if (viewRef.current) {
      viewRef.current.view.signal("filter_edit_restriction", checked);
      viewRef.current.view.runAsync();
    }
  };

  return (
    <div className="WikiBubbleChart">
      <div className="WikiBubbleChartTitleRow">
        <h2 className="u-mb0">Article analytics over chosen focus period</h2>
        <CSVButton
          articles={sortedRows}
          csvConvert={convertAnalyticsToCSV}
          filename="article-analytics"
        />
      </div>
      <div className="WikiBubbleChartHeader">
        <div className="WikiBubbleChartHeaderBox">
          <QualityFilterButtons
            onToggle={toggleGrades}
            selected={selectedGrades}
          />
        </div>

        <div className="WikiBubbleChartHeaderBox">
          <div id={searchContainerId} />
        </div>

        <div className="WikiBubbleChartHeaderBox">
          <label htmlFor="wiki-bubble-sort" className="BoxTitle">
            Sort by
          </label>
          <select
            id="wiki-bubble-sort"
            className="WikiBubbleChartSortSelect"
            value={xAxisKey}
            onChange={(e) => setXAxisKey(e.target.value as XAxisKey)}
          >
            <option value="title">Article title (A-Z)</option>
            <option value="publication_date">Publication date (Old-New)</option>
            <option value="linguistic_versions_count">
              Linguistic versions (Low-High)
            </option>
            <option value="article_size">Article size (Small-Large)</option>
            <option value="lead_section_size">
              Lead section size (Small-Large)
            </option>
            <option value="talk_size">
              Discussion page size (Small-Large)
            </option>
            <option value="warning_tags_count">Warning tags (Low-High)</option>
            <option value="images_count">Images (Low-High)</option>
          </select>
        </div>

        <div className="WikiBubbleChartHeaderBox">
          <label htmlFor="wiki-bubble-y-axis" className="BoxTitle">
            Vertical axis
          </label>
          <select
            id="wiki-bubble-y-axis"
            className="WikiBubbleChartSortSelect"
            value={yAxisKey}
            onChange={(e) => setYAxisKey(e.target.value as YAxisKey)}
          >
            <option value="average_daily_views">Avg daily views</option>
            <option value="number_of_editors">Editors</option>
          </select>
        </div>

        <div className="WikiBubbleChartHeaderBox">
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

        <div className="WikiBubbleChartHeaderBox">
          <ProtectionFilterCheckboxes
            moveChecked={filterMoveRestriction}
            editChecked={filterEditRestriction}
            onMoveChange={handleMoveRestrictionChange}
            onEditChange={handleEditRestrictionChange}
          />
        </div>
      </div>

      <div>
        <div className="WikiBubbleChartChartContainer" ref={containerRef} />
      </div>

      {/* Legend */}
      <div className="WikiBubbleChartLegend">
        {/* Article size */}
        <div className="WikiBubbleChartLegendItem">
          <span className="WikiBubbleChartLegendDotArticle" />
          <span>Article size (bytes)</span>
        </div>

        {/* Lead section size */}
        <div className="WikiBubbleChartLegendItem">
          <span className="WikiBubbleChartLegendDotLead" />
          <span>Lead section size (bytes)</span>
        </div>

        {/* Discussion size */}
        <div className="WikiBubbleChartLegendItem">
          <span className="WikiBubbleChartLegendRingDiscussion" />
          <span>Discussion size (bytes)</span>
        </div>

        {/* Previous article size */}
        <div className="WikiBubbleChartLegendItem">
          <span className="WikiBubbleChartLegendRingPrevArticle" />
          <span>Prev. article size (bytes)</span>
        </div>

        {/* Daily views change (dotted line) */}
        <div className="WikiBubbleChartLegendItem">
          <span className="WikiBubbleChartLegendLineChange" />
          <span>Change in daily views</span>
        </div>
      </div>
    </div>
  );
};

export default WikiBubbleChart;
