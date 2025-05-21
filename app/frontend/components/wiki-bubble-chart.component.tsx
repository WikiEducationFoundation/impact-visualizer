import React, { useEffect, useRef } from "react";
import vegaEmbed, { VisualizationSpec, EmbedOptions, Result } from "vega-embed";

interface WikiBubbleChartProps {
  data: unknown[];
  actions?: boolean;
}

const WIDTH = 650;
const HEIGHT = 650;

export const WikiBubbleChart: React.FC<WikiBubbleChartProps> = ({
  data,
  actions = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<Result | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const spec: VisualizationSpec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: WIDTH,
      height: HEIGHT,
      background: "#ffffff",
      padding: 5,
      data: { name: "table" },

      params: [
        {
          name: "columns",
          value: 3,
        },
      ],
      facet: {
        field: "subject",
        sort: { field: "avg_pv", order: "descending" },
        columns: 3,
      },

      spec: {
        layer: [
          {
            mark: {
              type: "rule",
              strokeDash: [3, 4],
              strokeWidth: 1.2,
              opacity: 0.6,
            },
            encoding: {
              x: { field: "article", type: "nominal", axis: null },
              y: { field: "avg_pv_prev", type: "quantitative" },
              y2: { field: "avg_pv", type: "quantitative" },
            },
          },
          {
            mark: { type: "circle", opacity: 0.15 },
            encoding: {
              x: { field: "article", type: "nominal" },
              y: { field: "avg_pv_prev", type: "quantitative" },
              size: {
                field: "size_prev",
                type: "quantitative",
                scale: { type: "sqrt", range: [20, 2000] },
              },
              color: { value: "#40a76f" },
            },
          },
          {
            mark: {
              type: "circle",
              fill: null,
              strokeDash: [4, 4],
              strokeWidth: 2,
            },
            encoding: {
              x: { field: "article", type: "nominal" },
              y: { field: "avg_pv", type: "quantitative" },
              size: {
                field: "disc_size",
                type: "quantitative",
                scale: { type: "sqrt", range: [20, 2000] },
              },
              stroke: { value: "#22884c" },
            },
          },
          {
            mark: { type: "circle", opacity: 0.85 },
            encoding: {
              x: { field: "article", type: "nominal" },
              y: { field: "avg_pv", type: "quantitative" },
              size: {
                field: "lead_size",
                type: "quantitative",
                scale: { type: "sqrt", range: [10, 1000] },
              },
              color: { value: "#1c7c47" },
            },
          },
          {
            mark: { type: "circle", stroke: "white", strokeWidth: 1 },
            encoding: {
              x: { field: "article", type: "nominal" },
              y: { field: "avg_pv", type: "quantitative" },
              size: {
                field: "size",
                type: "quantitative",
                scale: { type: "sqrt", range: [20, 2000] },
              },
              color: { value: "#55c27a" },
              tooltip: [
                { field: "article", title: "Article" },
                { field: "avg_pv", title: "Avg visits" },
                { field: "avg_pv_prev", title: "Prev year" },
                { field: "size", title: "Size (bytes)" },
                { field: "lead_size", title: "Lead (bytes)" },
                { field: "disc_size", title: "Talk (bytes)" },
              ],
            },
          },
          {
            transform: [{ filter: "datum.improved" }],
            mark: { type: "point", shape: "triangle-up", size: 80 },
            encoding: {
              x: { field: "article", type: "nominal" },
              y: { field: "avg_pv", type: "quantitative" },
              color: { value: "#000000" },
            },
          },
        ],
        encoding: {
          x: {
            field: "article",
            type: "nominal",
            axis: { labelAngle: 270, title: null, tickSize: 0 },
            sort: "-avg_pv",
          },
          y: {
            field: "avg_pv",
            type: "quantitative",
            axis: { title: "avg daily visits" },
          },
        },
      },

      resolve: { scale: { size: "independent" } },
    } as VisualizationSpec;

    const options: EmbedOptions = {
      actions,
      renderer: "canvas",
      mode: "vega-lite",
    };

    vegaEmbed(containerRef.current, spec, options)
      .then((result) => {
        viewRef.current = result;
        result.view
          .change(
            "table",
            (window as any).vega
              .changeset()
              .remove(() => true)
              .insert(data)
          )
          .runAsync();
      })
      .catch(console.error);

    return () => {
      viewRef.current?.view.finalize();
      viewRef.current = null;
    };
  }, [data, actions]);

  return <div ref={containerRef} />;
};

export default WikiBubbleChart;
