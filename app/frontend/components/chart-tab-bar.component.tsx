import React from "react";
import { FaChevronUp, FaChevronDown } from "react-icons/fa6";

export interface ChartTabBarProps {
  activeTab: "overview" | "languages";
  onTabChange: (tab: "overview" | "languages") => void;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
}

const ChartTabBar: React.FC<ChartTabBarProps> = ({
  activeTab,
  onTabChange,
  advancedOpen,
  onToggleAdvanced,
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
        className={`Tab ${activeTab === "languages" ? "is-active" : ""}`}
        onClick={() => onTabChange("languages")}
      >
        Languages
      </button>
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
    </div>
  );
};

export default ChartTabBar;
