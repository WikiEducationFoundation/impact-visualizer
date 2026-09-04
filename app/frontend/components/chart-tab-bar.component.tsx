import React from "react";
import { FaChevronUp, FaChevronDown } from "react-icons/fa6";

export type ChartTab = "overview" | "languages" | "timeTravel";

export interface ChartTabBarProps {
  activeTab: ChartTab;
  onTabChange: (tab: ChartTab) => void;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  showAdvancedToggle?: boolean;
}

const ChartTabBar: React.FC<ChartTabBarProps> = ({
  activeTab,
  onTabChange,
  advancedOpen,
  onToggleAdvanced,
  showAdvancedToggle = true,
}) => {
  return (
    <div className="TabBar">
      <button
        type="button"
        className={`Tab ${activeTab === "overview" ? "is-active" : ""}`}
        onClick={() => onTabChange("overview")}
      >
        Articles overview
      </button>
      <button
        type="button"
        data-tour="languages-tab"
        className={`Tab ${activeTab === "languages" ? "is-active" : ""}`}
        onClick={() => onTabChange("languages")}
      >
        Languages
      </button>
      <button
        type="button"
        data-tour="time-travel-tab"
        className={`Tab ${activeTab === "timeTravel" ? "is-active" : ""}`}
        onClick={() => onTabChange("timeTravel")}
      >
        Time travel
      </button>
      {showAdvancedToggle && (
        <button
          type="button"
          className="AdvancedToggle"
          aria-expanded={advancedOpen}
          onClick={onToggleAdvanced}
        >
          <span className="AdvancedToggleLabel">Advanced Filters</span>
          {advancedOpen ? (
            <FaChevronUp size={14} />
          ) : (
            <FaChevronDown size={14} />
          )}
        </button>
      )}
    </div>
  );
};

export default ChartTabBar;
