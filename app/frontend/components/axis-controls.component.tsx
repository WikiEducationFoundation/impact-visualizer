import React from "react";
import { FaArrowRight, FaArrowUp } from "react-icons/fa6";
import type { XAxisKey, YAxisKey } from "../types/bubble-chart.type";

export interface AxisControlsProps {
  idPrefix: string;
  hideYAxis?: boolean;
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

  return (
    <div
      className={`AxisControls ${hideYAxis ? "AxisControls--horizontalOnly" : ""}`}
    >
      {!hideYAxis && (
      <>
      <div className="FilterBox">
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
              onChange={(e) => onYAxisKeyChange(e.target.value as YAxisKey)}
            >
              <option value="average_daily_views">Avg daily views</option>
              <option value="number_of_editors">Editors</option>
              <option value="incoming_links_count">Incoming links</option>
            </select>
          </div>
        </div>
      </div>

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
                yAxisAutoDomain.min === null ? "" : String(yAxisAutoDomain.min)
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
                yAxisAutoDomain.max === null ? "" : String(yAxisAutoDomain.max)
              }
              value={yAxisMaxInput}
              onChange={(e) => onYAxisMaxInputChange(e.target.value)}
              aria-label="Y-axis maximum"
            />
          </label>
        </div>
      </div>
      </>
      )}

      <div className="FilterBox">
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
              <option value="title">Article title (A-Z)</option>
              <option value="publication_date">Creation date (Old-New)</option>
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
              <option value="warning_tags_count">
                Warning tags (Low-High)
              </option>
              <option value="images_count">Images (Low-High)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AxisControls;
