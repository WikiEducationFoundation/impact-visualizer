import React, { useEffect, useRef } from "react";
import vegaEmbed, { EmbedOptions, Result, VisualizationSpec } from "vega-embed";
import TimeTravelTooltip from "./time-travel-tooltip.component";
import { patchChartScales } from "../utils/bubble-chart-vega";
import type { TimeTravelRow } from "../types/time-travel.type";
import type { ScreenPoint } from "../utils/time-travel-vega";

export interface TimeTravelBubblePanelProps {
  year: number;
  otherYear: number;
  spec: VisualizationSpec;
  rows: TimeTravelRow[];
  showChange: boolean;
  hoveredArticle: string | null;
  hoveredPosition: ScreenPoint | null;
  onHover: (article: string | null) => void;
  onReady: (view: Result | null) => void;
}

const TimeTravelBubblePanel: React.FC<TimeTravelBubblePanelProps> = ({
  year,
  otherYear,
  spec,
  rows,
  showChange,
  hoveredArticle,
  hoveredPosition,
  onHover,
  onReady,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onHoverRef = useRef(onHover);
  const onReadyRef = useRef(onReady);
  onHoverRef.current = onHover;
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!containerRef.current) return;

    const options: EmbedOptions = {
      actions: false,
      renderer: "canvas",
      mode: "vega-lite",
      patch: patchChartScales as EmbedOptions["patch"],
      tooltip: false,
    };

    let result: Result | null = null;
    let cancelled = false;

    vegaEmbed(containerRef.current, spec, options)
      .then((embedded) => {
        if (cancelled) {
          embedded.view.finalize();
          return;
        }
        result = embedded;
        embedded.view.addSignalListener("highlight", (_name, value: any) => {
          onHoverRef.current(value?.article?.[0] ?? null);
        });
        onReadyRef.current(embedded);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      onReadyRef.current(null);
      result?.view.finalize();
    };
  }, [spec]);

  const hoveredRow = hoveredArticle
    ? rows.find((row) => row.article === hoveredArticle)
    : undefined;

  return (
    <div className="Panel">
      <div className="PanelHeader">{year}</div>
      <div className="PanelBody" ref={containerRef} />
      {hoveredRow && hoveredPosition && (
        <TimeTravelTooltip
          row={hoveredRow}
          year={year}
          otherYear={otherYear}
          showChange={showChange}
          position={hoveredPosition}
        />
      )}
    </div>
  );
};

export default TimeTravelBubblePanel;
