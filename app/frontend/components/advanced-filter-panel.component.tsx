import React from "react";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import {
  CENTRALITY_MIN,
  CENTRALITY_MAX,
} from "../utils/bubble-chart-permalink";
import { RAW_ASSESSMENT_COLORS } from "../utils/bubble-chart-utils";

const gradeGroups = [
  { id: "fa", label: "Featured", grades: ["FA", "FL"], dot: RAW_ASSESSMENT_COLORS.FA },
  { id: "ga", label: "GA", grades: ["GA"], dot: RAW_ASSESSMENT_COLORS.GA },
  { id: "aclass", label: "A-Class", grades: ["A"], dot: RAW_ASSESSMENT_COLORS.A },
  { id: "bclass", label: "B-Class", grades: ["B"], dot: RAW_ASSESSMENT_COLORS.B },
  { id: "cclass", label: "C-Class", grades: ["C"], dot: RAW_ASSESSMENT_COLORS.C },
  { id: "start", label: "Start", grades: ["Start"], dot: RAW_ASSESSMENT_COLORS.Start },
  { id: "stub", label: "Stub", grades: ["Stub"], dot: RAW_ASSESSMENT_COLORS.Stub },
  { id: "list", label: "List", grades: ["List"], dot: RAW_ASSESSMENT_COLORS.List },
  {
    id: "unassessed",
    label: "Unassessed",
    grades: ["Unassessed"],
    dot: RAW_ASSESSMENT_COLORS.Unassessed,
  },
];

function QualityFilterButtons({
  onToggle,
  selected,
  onReset,
}: {
  onToggle: (grades: string[], on: boolean) => void;
  selected: Record<string, boolean>;
  onReset: () => void;
}) {
  return (
    <div className="QualityAssessment">
      <div className="FilterHead">
        <div className="BoxTitle">Filter by quality assessment*</div>
        <button type="button" className="ResetLink" onClick={onReset}>
          Reset all
        </button>
      </div>
      <div className="FilterList">
        {gradeGroups.map((g) => {
          const isOn = g.grades.every((x) => selected[x] !== false);
          return (
            <button
              key={g.id}
              type="button"
              className={`FilterRow ${isOn ? "is-on" : "is-off"}`}
              data-group={g.id}
              aria-pressed={isOn}
              onClick={() => onToggle(g.grades, !isOn)}
            >
              {isOn ? (
                <BsEye className="EyeIcon" />
              ) : (
                <BsEyeSlash className="EyeIcon" />
              )}
              <span className="Dot" style={{ backgroundColor: g.dot }} />
              <span className="Label">{g.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TagFilterButtons({
  tags,
  deselected,
  includeUntagged,
  onToggle,
  onIncludeUntaggedChange,
  onReset,
}: {
  tags: string[];
  deselected: Set<string>;
  includeUntagged: boolean;
  onToggle: (tag: string, on: boolean) => void;
  onIncludeUntaggedChange: (checked: boolean) => void;
  onReset: () => void;
}) {
  return (
    <div className="TagFilter">
      <div className="FilterHead">
        <div className="BoxTitle">Filter by tags</div>
        <label className="Checkbox">
          <input
            type="checkbox"
            checked={includeUntagged}
            onChange={(e) => onIncludeUntaggedChange(e.target.checked)}
            aria-label="Include untagged articles"
          />
          <span>include untagged</span>
        </label>
        <button type="button" className="ResetLink" onClick={onReset}>
          Reset all
        </button>
      </div>
      <div className="FilterList">
        {tags.map((tag) => {
          const isOn = !deselected.has(tag);
          return (
            <button
              key={tag}
              type="button"
              className={`FilterRow ${isOn ? "is-on" : "is-off"}`}
              aria-pressed={isOn}
              onClick={() => onToggle(tag, !isOn)}
            >
              {isOn ? (
                <BsEye className="EyeIcon" />
              ) : (
                <BsEyeSlash className="EyeIcon" />
              )}
              <span className="Label">{tag}</span>
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
  onReset,
}: {
  moveChecked: boolean;
  editChecked: boolean;
  onMoveChange: (checked: boolean) => void;
  onEditChange: (checked: boolean) => void;
  onReset: () => void;
}) {
  const rows = [
    { label: "Move restriction", checked: moveChecked, onChange: onMoveChange },
    { label: "Edit restriction", checked: editChecked, onChange: onEditChange },
  ];
  return (
    <div className="ProtectionFilter">
      <div className="FilterHead">
        <div className="BoxTitle">Filter by article protection</div>
        <button type="button" className="ResetLink" onClick={onReset}>
          Reset
        </button>
      </div>
      <div className="FilterList">
        {rows.map((row) => (
          <button
            key={row.label}
            type="button"
            className={`FilterRow ${row.checked ? "is-on" : "is-off"}`}
            aria-pressed={row.checked}
            onClick={() => row.onChange(!row.checked)}
          >
            {row.checked ? (
              <BsEye className="EyeIcon" />
            ) : (
              <BsEyeSlash className="EyeIcon" />
            )}
            <span className="Label">{row.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CentralityFilter({
  min,
  max,
  includeUnassessed,
  onMinChange,
  onMaxChange,
  onIncludeUnassessedChange,
  onReset,
}: {
  min: number;
  max: number;
  includeUnassessed: boolean;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  onIncludeUnassessedChange: (checked: boolean) => void;
  onReset: () => void;
}) {
  const minPercent =
    ((min - CENTRALITY_MIN) / (CENTRALITY_MAX - CENTRALITY_MIN)) * 100;
  const maxPercent =
    ((max - CENTRALITY_MIN) / (CENTRALITY_MAX - CENTRALITY_MIN)) * 100;

  return (
    <div className="CentralityFilter">
      <div className="FilterHead">
        <div className="BoxTitle">Filter by centrality</div>
        <label className="Checkbox">
          <input
            type="checkbox"
            checked={includeUnassessed}
            onChange={(e) => onIncludeUnassessedChange(e.target.checked)}
            aria-label="Include articles with no centrality"
          />
          <span>include articles without centrality</span>
        </label>
        <button type="button" className="ResetLink" onClick={onReset}>
          Reset
        </button>
      </div>
      <div className="Value">
        {min}-{max}
      </div>
      <div className="Slider">
        <div className="Track" />
        <div
          className="Range"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
        <input
          type="range"
          min={CENTRALITY_MIN}
          max={CENTRALITY_MAX}
          step={1}
          value={min}
          onChange={(e) => onMinChange(Number(e.target.value))}
          aria-label="Minimum centrality"
          className="Input Input--min"
        />
        <input
          type="range"
          min={CENTRALITY_MIN}
          max={CENTRALITY_MAX}
          step={1}
          value={max}
          onChange={(e) => onMaxChange(Number(e.target.value))}
          aria-label="Maximum centrality"
          className="Input Input--max"
        />
      </div>
      <div className="Bounds">
        <span>{CENTRALITY_MIN} (min)</span>
        <span>{CENTRALITY_MAX} (max)</span>
      </div>
    </div>
  );
}

export interface AdvancedFilterPanelProps {
  tags: string[];
  deselectedTags: Set<string>;
  includeUntagged: boolean;
  onToggleTag: (tag: string, on: boolean) => void;
  onIncludeUntaggedChange: (checked: boolean) => void;
  onResetTags: () => void;

  centralityMin: number;
  centralityMax: number;
  includeNoCentrality: boolean;
  onCentralityMinChange: (value: number) => void;
  onCentralityMaxChange: (value: number) => void;
  onIncludeNoCentralityChange: (checked: boolean) => void;
  onResetCentrality: () => void;

  selectedGrades: Record<string, boolean>;
  onToggleGrades: (grades: string[], on: boolean) => void;
  onResetGrades: () => void;

  moveRestriction: boolean;
  editRestriction: boolean;
  onMoveRestrictionChange: (checked: boolean) => void;
  onEditRestrictionChange: (checked: boolean) => void;
  onResetProtection: () => void;
}

const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  tags,
  deselectedTags,
  includeUntagged,
  onToggleTag,
  onIncludeUntaggedChange,
  onResetTags,
  centralityMin,
  centralityMax,
  includeNoCentrality,
  onCentralityMinChange,
  onCentralityMaxChange,
  onIncludeNoCentralityChange,
  onResetCentrality,
  selectedGrades,
  onToggleGrades,
  onResetGrades,
  moveRestriction,
  editRestriction,
  onMoveRestrictionChange,
  onEditRestrictionChange,
  onResetProtection,
}) => {
  return (
    <div className={`AdvancedPanel ${tags.length ? "has-tags" : ""}`}>
      {tags.length > 0 && (
        <div className="FilterBox FilterBox--tags">
          <TagFilterButtons
            tags={tags}
            deselected={deselectedTags}
            includeUntagged={includeUntagged}
            onToggle={onToggleTag}
            onIncludeUntaggedChange={onIncludeUntaggedChange}
            onReset={onResetTags}
          />
        </div>
      )}

      <div className="FilterBox">
        <CentralityFilter
          min={centralityMin}
          max={centralityMax}
          includeUnassessed={includeNoCentrality}
          onMinChange={onCentralityMinChange}
          onMaxChange={onCentralityMaxChange}
          onIncludeUnassessedChange={onIncludeNoCentralityChange}
          onReset={onResetCentrality}
        />
      </div>

      <div className="FilterBox FilterBox--quality">
        <QualityFilterButtons
          onToggle={onToggleGrades}
          selected={selectedGrades}
          onReset={onResetGrades}
        />
      </div>

      <div className="FilterBox">
        <ProtectionFilterCheckboxes
          moveChecked={moveRestriction}
          editChecked={editRestriction}
          onMoveChange={onMoveRestrictionChange}
          onEditChange={onEditRestrictionChange}
          onReset={onResetProtection}
        />
      </div>
    </div>
  );
};

export default AdvancedFilterPanel;
