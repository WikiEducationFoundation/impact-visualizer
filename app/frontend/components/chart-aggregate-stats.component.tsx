import React from "react";

export interface ChartAggregateStatsProps {
  stats: {
    totalArticles: number;
    millionVisits: number | null;
    averageTotalViews: number | null;
    averageArticleSize: number | null;
    startDateLabel: string | null;
  };
}

const ChartAggregateStats: React.FC<ChartAggregateStatsProps> = ({ stats }) => {
  return (
    <div className="Stats">
      <div className="StatCell">
        <span className="StatValue">
          {stats.totalArticles.toLocaleString()}
        </span>
        <span className="StatLabel">Total articles</span>
      </div>

      <div className="StatCell">
        <span className="StatValue">
          {stats.millionVisits !== null
            ? stats.millionVisits.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "—"}
        </span>
        <span className="StatLabel">
          Million visits
          {stats.startDateLabel ? ` (since ${stats.startDateLabel})` : ""}
        </span>
      </div>

      <div className="StatCell">
        <span className="StatValue">
          {stats.averageTotalViews !== null
            ? stats.averageTotalViews.toLocaleString()
            : "—"}
        </span>
        <span className="StatLabel">Average total views per article</span>
      </div>

      <div className="StatCell">
        <span className="StatValue">
          {stats.averageArticleSize !== null
            ? stats.averageArticleSize.toLocaleString()
            : "—"}
        </span>
        <span className="StatLabel">Average article size (bytes)</span>
      </div>
    </div>
  );
};

export default ChartAggregateStats;
