import React, { useEffect, useRef, useMemo, useState } from "react";
import vegaEmbed, { VisualizationSpec, EmbedOptions, Result } from "vega-embed";
import CSVButton from "./CSV-button.component";
import {
  convertAnalyticsToCSV,
  getAssessmentColor,
} from "../utils/bubble-chart-utils";

type ArticleAnalytics = {
  average_daily_views: number;
  article_size: number;
  prev_article_size: number | null;
  talk_size: number;
  prev_talk_size: number | null;
  lead_section_size: number;
  prev_average_daily_views: number | null;
  linguistic_versions_count: number;
  assessment_grade: string | null;
  publication_date: string | null;
};

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

type NumericSortField =
  | "linguistic_versions_count"
  | "article_size"
  | "lead_section_size"
  | "talk_size";

type NumericSortableArticle = { article: string } & Record<
  NumericSortField,
  number
>;

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

function xAxisTitleForSortKey(
  sortKey: "title" | "publication_date" | NumericSortField
): string {
  switch (sortKey) {
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
    default:
      return "Articles";
  }
}

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
  const [sortKey, setSortKey] = useState<
    "title" | "publication_date" | NumericSortField
  >("title");

  const rows = useMemo(() => {
    if (data && typeof data === "object") {
      return Object.entries(data).map(([article, analytics]) => ({
        article,
        ...analytics,
        assessment_grade_color: getAssessmentColor(analytics?.assessment_grade),
      }));
    }
    return [];
  }, [data]);

  const sortedRows = useMemo(() => {
    if (!rows.length) return [];

    const next = [...rows];

    const comparator = (() => {
      switch (sortKey) {
        case "publication_date":
          return compareArticlesByPublicationDateAsc;
        case "title":
          return (a: any, b: any) => a.article.localeCompare(b.article);
        default:
          return (a: any, b: any) =>
            compareArticlesByNumericFieldAsc(a, b, sortKey);
      }
    })();

    next.sort(comparator);

    return next;
  }, [rows, sortKey]);

  useEffect(() => {
    if (!containerRef.current || sortedRows.length === 0) return;

    const spec: VisualizationSpec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      height: HEIGHT,
      width: "container",
      background: "#ffffff",
      data: { values: sortedRows },
      transform: [{ window: [{ op: "row_number", as: "idx" }] }],
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
            y: { field: "average_daily_views", type: "quantitative" },
          },
        },
        {
          mark: {
            type: "rule",
            strokeDash: [2, 4],
            strokeWidth: 1.2,
            opacity: 0.6,
          },
          encoding: {
            y: { field: "prev_average_daily_views", type: "quantitative" },
            y2: { field: "average_daily_views", type: "quantitative" },
          },
        },

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
            y: { field: "average_daily_views", type: "quantitative" },
            size: {
              field: "talk_size",
              type: "quantitative",
              scale: { type: "sqrt", range: [50, 1500] },
            },
            opacity: {
              condition: [
                { param: "highlight", empty: false, value: 1 },
                {
                  test: "(!highlight.article) && (!search_input || test(regexp(search_input,'i'), datum.article)) && ((grade_FA && datum.assessment_grade == 'FA') || (grade_FL && datum.assessment_grade == 'FL') || (grade_GA && datum.assessment_grade == 'GA') || (grade_A && datum.assessment_grade == 'A') || (grade_B && datum.assessment_grade == 'B') || (grade_C && datum.assessment_grade == 'C') || (grade_Start && datum.assessment_grade == 'Start') || (grade_Stub && datum.assessment_grade == 'Stub') || (grade_List && datum.assessment_grade == 'List'))",
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
            y: { field: "average_daily_views", type: "quantitative" },
            size: {
              field: "prev_article_size",
              type: "quantitative",
              scale: { type: "sqrt", range: [20, 600] },
            },
            opacity: {
              condition: [
                { param: "highlight", empty: false, value: 1 },
                {
                  test: "(!highlight.article) && (!search_input || test(regexp(search_input,'i'), datum.article)) && ((grade_FA && datum.assessment_grade == 'FA') || (grade_FL && datum.assessment_grade == 'FL') || (grade_GA && datum.assessment_grade == 'GA') || (grade_A && datum.assessment_grade == 'A') || (grade_B && datum.assessment_grade == 'B') || (grade_C && datum.assessment_grade == 'C') || (grade_Start && datum.assessment_grade == 'Start') || (grade_Stub && datum.assessment_grade == 'Stub') || (grade_List && datum.assessment_grade == 'List'))",
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
            y: { field: "average_daily_views", type: "quantitative" },
            size: {
              field: "lead_section_size",
              type: "quantitative",
              scale: { type: "sqrt", range: [30, 800] },
            },
            opacity: {
              condition: [
                { param: "highlight", empty: false, value: 0.8 },
                {
                  test: "(!highlight.article) && (!search_input || test(regexp(search_input,'i'), datum.article)) && ((grade_FA && datum.assessment_grade == 'FA') || (grade_FL && datum.assessment_grade == 'FL') || (grade_GA && datum.assessment_grade == 'GA') || (grade_A && datum.assessment_grade == 'A') || (grade_B && datum.assessment_grade == 'B') || (grade_C && datum.assessment_grade == 'C') || (grade_Start && datum.assessment_grade == 'Start') || (grade_Stub && datum.assessment_grade == 'Stub') || (grade_List && datum.assessment_grade == 'List'))",
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
                "Linguistic versions": format(datum.linguistic_versions_count, ','),
              }`,
            },
          },
          encoding: {
            y: { field: "average_daily_views", type: "quantitative" },
            size: {
              field: "article_size",
              type: "quantitative",
              scale: { type: "sqrt", range: [20, 600] },
            },
            opacity: {
              condition: [
                { param: "highlight", empty: false, value: 0.5 },
                {
                  test: "(!highlight.article) && (!search_input || test(regexp(search_input,'i'), datum.article)) && ((grade_FA && datum.assessment_grade == 'FA') || (grade_FL && datum.assessment_grade == 'FL') || (grade_GA && datum.assessment_grade == 'GA') || (grade_A && datum.assessment_grade == 'A') || (grade_B && datum.assessment_grade == 'B') || (grade_C && datum.assessment_grade == 'C') || (grade_Start && datum.assessment_grade == 'Start') || (grade_Stub && datum.assessment_grade == 'Stub') || (grade_List && datum.assessment_grade == 'List'))",
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
            title: xAxisTitleForSortKey(sortKey),
            labels: false,
            ticks: false,
            grid: false,
          },
        },
        y: {
          field: "average_daily_views",
          type: "quantitative",
          axis: { title: "avg daily visits" },
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
  }, [sortedRows, actions, wiki, selectedGrades, searchContainerId, sortKey]);

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
            Sort articles
          </label>
          <select
            id="wiki-bubble-sort"
            className="WikiBubbleChartSortSelect"
            value={sortKey}
            onChange={(e) =>
              setSortKey(
                e.target.value as
                  | "title"
                  | "publication_date"
                  | NumericSortField
              )
            }
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
          </select>
        </div>

        <div className="WikiBubbleChartHeaderBox">
          <div className="BoxTitle">Placeholder title</div>
        </div>

        <div className="WikiBubbleChartHeaderBox">
          <div className="BoxTitle">Placeholder title</div>
        </div>

        <div className="WikiBubbleChartHeaderBox">
          <div className="BoxTitle">Placeholder title</div>
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
