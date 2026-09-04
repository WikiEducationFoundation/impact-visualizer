import React from "react";
import type { TimeTravelRow } from "../types/time-travel.type";
import type { ScreenPoint } from "../utils/time-travel-vega";

type StatField =
  | "average_daily_views"
  | "article_size"
  | "lead_section_size"
  | "talk_size";

type OtherField =
  | "other_average_daily_views"
  | "other_article_size"
  | "other_lead_section_size"
  | "other_talk_size";

const STATS: { label: string; field: StatField; otherField: OtherField }[] = [
  {
    label: "Daily visits",
    field: "average_daily_views",
    otherField: "other_average_daily_views",
  },
  { label: "Size", field: "article_size", otherField: "other_article_size" },
  {
    label: "Lead size",
    field: "lead_section_size",
    otherField: "other_lead_section_size",
  },
  { label: "Talk size", field: "talk_size", otherField: "other_talk_size" },
];

const FLIP_BELOW = 260;
const HALF_WIDTH = 108;

export interface TimeTravelTooltipProps {
  row: TimeTravelRow;
  year: number;
  otherYear: number;
  showChange: boolean;
  position: ScreenPoint;
}

function change(value: number | null, other: number | null) {
  if (value === null || other === null || other <= 0) return null;
  if (value === other) return { modifier: "flat", label: "(0%)" };
  const percent = ((value - other) / other) * 100;
  return {
    modifier: value > other ? "up" : "down",
    label: `(${percent > 0 ? "+" : ""}${percent.toFixed(1)}%)`,
  };
}

const TimeTravelTooltip: React.FC<TimeTravelTooltipProps> = ({
  row,
  year,
  otherYear,
  showChange,
  position,
}) => {
  const below = position.y < FLIP_BELOW;
  const left = Math.min(
    Math.max(position.x, HALF_WIDTH),
    window.innerWidth - HALF_WIDTH,
  );

  return (
    <div
      className="TimeTravelTooltip"
      style={{
        left,
        top: position.y,
        transform: below
          ? "translate(-50%, 20px)"
          : "translate(-50%, calc(-100% - 20px))",
      }}
    >
      <div className="Title">{row.article}</div>
      <div className="Subtitle">
        in {year}
        {showChange && ` · change vs ${otherYear}`}
      </div>

      <div className="Rows">
        {row.exists ? (
          STATS.map(({ label, field, otherField }) => {
            const value = row[field];
            const delta = showChange ? change(value, row[otherField]) : null;
            return (
              <div className="Row" key={field}>
                <span className="Label">{label}</span>
                <span className="Value">
                  {value === null ? "n/a" : value.toLocaleString("en-US")}
                  {delta && (
                    <span className={`Change Change--${delta.modifier}`}>
                      {delta.label}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        ) : (
          <>
            <div className="Row">
              <span className="Label">Status</span>
              <span className="Value">Did not exist in {year}</span>
            </div>
            <div className="Row">
              <span className="Label">Created</span>
              <span className="Value">
                {row.publication_date
                  ? new Date(row.publication_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "unknown"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TimeTravelTooltip;
