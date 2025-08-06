import React, { useEffect, useRef, useMemo } from "react";
import vegaEmbed, { VisualizationSpec, EmbedOptions, Result } from "vega-embed";
import CSVButton from "./CSV-button.component";

type ArticleAnalytics = {
  average_daily_views: number;
  article_size: number;
  prev_article_size: number | null;
  talk_size: number;
  prev_talk_size: number | null;
  lead_section_size: number;
  prev_average_daily_views: number | null;
};

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

function escapeCSV(text: string): string {
  return `"${text.replace(/"/g, '""')}"`;
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
  }>
): string {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent +=
    "Article,Average Daily Views,Average Daily Views (prev year),Article Size,Article Size (prev year),Lead Section Size,Talk Size,Talk Size (prev year)\n";
  rows.forEach((row) => {
    csvContent +=
      [
        escapeCSV(row.article),
        row.average_daily_views,
        row.prev_average_daily_views ?? "",
        row.article_size,
        row.prev_article_size ?? "",
        row.lead_section_size,
        row.talk_size,
        row.prev_talk_size ?? "",
      ].join(",") + "\n";
  });
  return csvContent;
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
  const rows = useMemo(() => {
    if (data && typeof data === "object") {
      return Object.entries(data).map(([article, analytics]) => ({
        article,
        ...analytics,
      }));
    }
    return [];
  }, [data]);

  useEffect(() => {
    if (!containerRef.current || rows.length === 0) return;

    const spec: VisualizationSpec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      height: HEIGHT,
      width: "container",
      background: "#ffffff",
      data: { values: rows },
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
            x: { field: "idx", type: "quantitative" },
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
            x: { field: "idx", type: "quantitative", axis: null },
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
            x: { field: "idx", type: "quantitative" },
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
                  test: "(!highlight.article) && (!search_input || test(regexp(search_input,'i'), datum.article))",
                  value: 1,
                },
              ],
              value: 0.2,
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
            x: { field: "idx", type: "quantitative" },
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
                  test: "(!highlight.article) && (!search_input || test(regexp(search_input,'i'), datum.article))",
                  value: 1,
                },
              ],
              value: 0.2,
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
            x: { field: "idx", type: "quantitative" },
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
                  test: "(!highlight.article) && (!search_input || test(regexp(search_input,'i'), datum.article))",
                  value: 0.8,
                },
              ],
              value: 0.2,
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
                title: datum.article,
                "Daily visits": format(datum.average_daily_views, ','),
                "Daily visits (prev year)": isValid(datum.prev_average_daily_views) ? format(datum.prev_average_daily_views, ',') : 'n/a',
                "Size": format(datum.article_size, ','),
                "Size (prev year)": isValid(datum.prev_article_size) ? format(datum.prev_article_size, ',') : 'n/a',
                "Lead size": format(datum.lead_section_size, ','),
                "Talk size": format(datum.talk_size, ','),
                "Talk size (prev year)": isValid(datum.prev_talk_size) ? format(datum.prev_talk_size, ',') : 'n/a'
              }`,
            },
          },
          encoding: {
            x: { field: "idx", type: "quantitative" },
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
                  test: "(!highlight.article) && (!search_input || test(regexp(search_input,'i'), datum.article))",
                  value: 0.5,
                },
              ],
              value: 0.2,
            },
          },
        },
      ],

      encoding: {
        x: {
          field: "idx",
          type: "quantitative",
          axis: null,
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
  }, [rows, actions, wiki]);

  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #e0e0e0",
        padding: "0 24px",
        width: "calc(100vw - 48px)",
        marginLeft: "calc(-50vw + 50% + 24px)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h2 className="u-mb0">Article analytics over chosen focus period</h2>
          <CSVButton
            articles={rows}
            csvConvert={convertAnalyticsToCSV}
            filename="article-analytics"
          />
        </div>

        <div
          id={searchContainerId}
          style={{ display: "flex", justifyContent: "flex-end" }}
        />
      </div>

      <div>
        <style>
          {`
            .vega-bindings {
              display: flex;
              justify-content: center;
              margin-bottom: 8px;
            }
          `}
        </style>

        <div
          style={{
            overflowY: "hidden",
            width: "100%",
          }}
          ref={containerRef}
        />
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: "8px",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "center",
          fontSize: "0.9rem",
        }}
      >
        {/* Article size */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "rgba(13, 71, 161, 0.5)",
            }}
          />
          <span>Article size (bytes)</span>
        </div>

        {/* Lead section size */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "#90caf9",
            }}
          />
          <span>Lead section size (bytes)</span>
        </div>

        {/* Discussion size */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              border: "2px solid #2196f3",
              backgroundColor: "transparent",
            }}
          />
          <span>Discussion size (bytes)</span>
        </div>

        {/* Previous article size */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              border: "2px dashed #64b5f6",
              backgroundColor: "transparent",
            }}
          />
          <span>Prev. article size (bytes)</span>
        </div>

        {/* Daily views change (dotted line) */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              display: "inline-block",
              width: "16px",
              height: "0",
              borderTop: "2px dashed #757575",
            }}
          />
          <span>Change in daily views</span>
        </div>
      </div>
    </div>
  );
};

export default WikiBubbleChart;
