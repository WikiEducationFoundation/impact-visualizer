import React, { useEffect, useRef, useMemo } from "react";
import vegaEmbed, { VisualizationSpec, EmbedOptions, Result } from "vega-embed";

type ArticleAnalytics = {
  average_daily_views: number;
  article_size: number;
  prev_article_size: number | null;
  talk_size: number;
  prev_talk_size: number | null;
  lead_section_size: number;
  prev_average_daily_views: number | null;
};

interface WikiBubbleChartProps {
  data?: Record<string, ArticleAnalytics>;
  actions?: boolean;
}

const STEP = 60;
const MIN_WIDTH = 650;
const HEIGHT = 650;

export const WikiBubbleChart: React.FC<WikiBubbleChartProps> = ({
  data = {},
  actions = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<Result | null>(null);
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
    if (!containerRef.current) return;

    const spec: VisualizationSpec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: Math.max(MIN_WIDTH, rows.length * STEP + 120),
      height: HEIGHT,
      padding: { left: 25, top: 25, right: 60, bottom: 60 },
      background: "#ffffff",
      data: { values: rows },
      config: {
        legend: { disable: true },
      },

      layer: [
        {
          mark: {
            type: "rule",
            strokeDash: [2, 4],
            strokeWidth: 1.2,
            opacity: 0.6,
          },
          encoding: {
            x: { field: "article", type: "nominal", axis: null },
            y: { field: "average_daily_views", type: "quantitative" },
          },
        },

        {
          mark: {
            type: "circle",
            fill: null,
            strokeDash: [4, 4],
            strokeWidth: 1.5,
            stroke: "#2196f3",
          },
          encoding: {
            x: { field: "article", type: "nominal" },
            y: { field: "average_daily_views", type: "quantitative" },
            size: {
              field: "talk_size",
              type: "quantitative",
              scale: { type: "sqrt", range: [50, 1500] },
            },
          },
        },
        {
          mark: { type: "circle", opacity: 0.8, fill: "#64b5f6" },
          encoding: {
            x: { field: "article", type: "nominal" },
            y: { field: "average_daily_views", type: "quantitative" },
            size: {
              field: "lead_section_size",
              type: "quantitative",
              scale: { type: "sqrt", range: [30, 800] },
            },
          },
        },
        {
          mark: {
            type: "circle",
            fill: "#1976d2",
            stroke: "white",
            strokeWidth: 1,
          },
          encoding: {
            x: { field: "article", type: "nominal" },
            y: { field: "average_daily_views", type: "quantitative" },
            size: {
              field: "article_size",
              type: "quantitative",
              scale: { type: "sqrt", range: [20, 600] },
            },
            tooltip: [
              { field: "article", title: "Article" },
              { field: "average_daily_views", title: "Daily visits" },
              {
                field: "prev_average_daily_views",
                title: "Daily visits (prev year)",
              },
              { field: "article_size", title: "Size" },
              { field: "prev_article_size", title: "Size (prev year)" },
              { field: "lead_section_size", title: "Lead size" },
              { field: "talk_size", title: "Talk size" },
              { field: "prev_talk_size", title: "Talk size (prev year)" },
            ],
          },
        },
        {
          transform: [
            { filter: "datum.improved" },
            {
              calculate: "datum.avg_pv + sqrt(datum.size) * 0.2 + 5",
              as: "triangle_y",
            },
          ],
          mark: {
            type: "point",
            shape: "triangle-up",
            size: 5,
            fill: "#000",
            stroke: "#000",
          },
          encoding: {
            x: { field: "article", type: "nominal" },
            y: { field: "triangle_y", type: "quantitative" },
          },
        },
      ],

      encoding: {
        x: {
          field: "article",
          type: "nominal",
          axis: { labelAngle: -40, title: null, tickSize: 0 },
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
      })
      .catch(console.error);

    return () => {
      viewRef.current?.view.finalize();
      viewRef.current = null;
    };
  }, [rows, actions]);

  return (
    <div
      style={{
        overflowX: "auto",
        overflowY: "hidden",
        maxWidth: "100%",
      }}
      ref={containerRef}
    />
  );
};

export default WikiBubbleChart;
