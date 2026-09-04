import React from "react";
import { FaArrowRight, FaArrowUp } from "react-icons/fa6";
import type { XAxisKey, YAxisKey } from "../types/bubble-chart.type";

export type AxisOption<K> = { value: K; label: string };

export const DEFAULT_Y_AXIS_OPTIONS: AxisOption<YAxisKey>[] = [
  { value: "average_daily_views", label: "Avg daily views" },
  { value: "number_of_editors", label: "Editors" },
  { value: "incoming_links_count", label: "Incoming links" },
];

export const DEFAULT_X_AXIS_OPTIONS: AxisOption<XAxisKey>[] = [
  { value: "title", label: "Article title (A-Z)" },
  { value: "publication_date", label: "Creation date (Old-New)" },
  {
    value: "linguistic_versions_count",
    label: "Linguistic versions (Low-High)",
  },
  { value: "article_size", label: "Article size (Small-Large)" },
  { value: "lead_section_size", label: "Lead section size (Small-Large)" },
  { value: "talk_size", label: "Discussion page size (Small-Large)" },
  { value: "warning_tags_count", label: "Warning tags (Low-High)" },
  { value: "images_count", label: "Images (Low-High)" },
];

export interface AxisControlsProps {
  idPrefix: string;
  hideYAxis?: boolean;
  hideYAxisRange?: boolean;
  xAxisOptions?: AxisOption<XAxisKey>[];
  yAxisOptions?: AxisOption<YAxisKey>[];
  yAxisKey: YAxisKey;
  onYAxisKeyChange: (key: YAxisKey) => void;
  yAxisScaleType: "linear" | "log";
  onYAxisScaleTypeChange: (type: "linear" | "log") => void;
  yAxisMinInput: string;
  onYAxisMinInputChange: (value: string) => void;
  yAxisMaxInput: string;
  onYAxisMaxInputChange: (value: string) => void;
  yAxisAutoDomain: { min: number | null; max: number | null };
  xAxisKey: XAxisKey;
  onXAxisKeyChange: (key: XAxisKey) => void;
  xAxisMode: "ranked" | "scaled";
  onXAxisModeChange: (mode: "ranked" | "scaled") => void;
}

const AxisControls: React.FC<AxisControlsProps> = ({
  idPrefix,
  hideYAxis = false,
  hideYAxisRange = false,
  xAxisOptions = DEFAULT_X_AXIS_OPTIONS,
  yAxisOptions = DEFAULT_Y_AXIS_OPTIONS,
  yAxisKey,
  onYAxisKeyChange,
  yAxisScaleType,
  onYAxisScaleTypeChange,
  yAxisMinInput,
  onYAxisMinInputChange,
  yAxisMaxInput,
  onYAxisMaxInputChange,
  yAxisAutoDomain,
  xAxisKey,
  onXAxisKeyChange,
  xAxisMode,
  onXAxisModeChange,
}) => {
  const yAxisId = `${idPrefix}-y-axis`;
  const xAxisId = `${idPrefix}-sort`;
  const columnsClass = hideYAxis
    ? "AxisControls--horizontalOnly"
    : hideYAxisRange
      ? "AxisControls--twoColumn"
      : "";

  return (
    <div className={`AxisControls ${columnsClass}`}>
      {!hideYAxis && (
        <>
          <div className="FilterBox" data-tour="vertical-axis">
            <div className="AxisControl">
              <FaArrowUp size={30} className="AxisIcon" />
              <div className="AxisFields">
                <div className="AxisLabelRow">
                  <label htmlFor={yAxisId} className="BoxTitle">
                    Vertical axis
                  </label>
                  <div className="ScaleToggle">
                    <button
                      type="button"
                      className={`ScaleBtn ${yAxisScaleType === "linear" ? "is-active" : ""}`}
                      onClick={() => onYAxisScaleTypeChange("linear")}
                    >
                      Linear
                    </button>
                    <button
                      type="button"
                      className={`ScaleBtn ${yAxisScaleType === "log" ? "is-active" : ""}`}
                      onClick={() => onYAxisScaleTypeChange("log")}
                    >
                      Log
                    </button>
                  </div>
                </div>
                <select
                  id={yAxisId}
                  className="SortSelect"
                  value={yAxisKey}
                  disabled={yAxisOptions.length === 1}
                  onChange={(e) => onYAxisKeyChange(e.target.value as YAxisKey)}
                >
                  {yAxisOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!hideYAxisRange && (
            <div className="FilterBox">
              <div className="BoxTitle">Y-axis range</div>
              <div className="RangeRow">
                <label className="RangeField">
                  <span className="RangeLabel">min</span>
                  <input
                    className="RangeInput"
                    type="number"
                    inputMode="numeric"
                    placeholder={
                      yAxisAutoDomain.min === null
                        ? ""
                        : String(yAxisAutoDomain.min)
                    }
                    value={yAxisMinInput}
                    onChange={(e) => onYAxisMinInputChange(e.target.value)}
                    aria-label="Y-axis minimum"
                  />
                </label>
                <label className="RangeField">
                  <span className="RangeLabel">max</span>
                  <input
                    className="RangeInput"
                    type="number"
                    inputMode="numeric"
                    placeholder={
                      yAxisAutoDomain.max === null
                        ? ""
                        : String(yAxisAutoDomain.max)
                    }
                    value={yAxisMaxInput}
                    onChange={(e) => onYAxisMaxInputChange(e.target.value)}
                    aria-label="Y-axis maximum"
                  />
                </label>
              </div>
            </div>
          )}
        </>
      )}

      <div className="FilterBox" data-tour="horizontal-axis">
        <div className="AxisControl">
          <FaArrowRight size={30} className="AxisIcon" />
          <div className="AxisFields">
            <div className="AxisLabelRow">
              <label htmlFor={xAxisId} className="BoxTitle">
                Horizontal axis
              </label>
              <div className="ScaleToggle">
                <button
                  type="button"
                  className={`ScaleBtn ${xAxisMode === "ranked" ? "is-active" : ""}`}
                  onClick={() => onXAxisModeChange("ranked")}
                >
                  Ranked
                </button>
                <button
                  type="button"
                  className={`ScaleBtn ${xAxisMode === "scaled" ? "is-active" : ""}`}
                  onClick={() =>
                    xAxisKey !== "title" && onXAxisModeChange("scaled")
                  }
                  disabled={xAxisKey === "title"}
                  title={
                    xAxisKey === "title"
                      ? "Not available for article title"
                      : undefined
                  }
                >
                  Scaled
                </button>
              </div>
            </div>
            <select
              id={xAxisId}
              className="SortSelect"
              value={xAxisKey}
              onChange={(e) => {
                const key = e.target.value as XAxisKey;
                onXAxisKeyChange(key);
                onXAxisModeChange(key === "title" ? "ranked" : "scaled");
              }}
            >
              {xAxisOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AxisControls;
