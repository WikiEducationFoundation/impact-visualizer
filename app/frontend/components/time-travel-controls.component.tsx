import React from "react";
import { BsInfoCircle } from "react-icons/bs";
import TimeTravelArticlePicker from "./time-travel-article-picker.component";
import { MIN_TIME_TRAVEL_YEAR } from "../utils/time-travel-vega";

export interface TimeTravelControlsProps {
  articleTitles: string[];
  selectedArticles: string[];
  onSelectedArticlesChange: (titles: string[]) => void;
  startYear: number;
  endYear: number;
  onStartYearChange: (year: number) => void;
  onEndYearChange: (year: number) => void;
  onFetch: () => void;
  fetchDisabled: boolean;
  fetching: boolean;
}

const TimeTravelControls: React.FC<TimeTravelControlsProps> = ({
  articleTitles,
  selectedArticles,
  onSelectedArticlesChange,
  startYear,
  endYear,
  onStartYearChange,
  onEndYearChange,
  onFetch,
  fetchDisabled,
  fetching,
}) => {
  const maxYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = MIN_TIME_TRAVEL_YEAR; year <= maxYear; year += 1) {
    years.push(year);
  }

  return (
    <>
      <div className="Controls">
        <div className="YearRow">
          <label className="YearField">
            <span className="YearLabel">Start year</span>
            <select
              className="SortSelect"
              value={startYear}
              onChange={(e) => onStartYearChange(Number(e.target.value))}
            >
              {years
                .filter((year) => year < maxYear)
                .map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
            </select>
          </label>
          <label className="YearField">
            <span className="YearLabel">End year</span>
            <select
              className="SortSelect"
              value={endYear}
              onChange={(e) => onEndYearChange(Number(e.target.value))}
            >
              {years
                .filter((year) => year > startYear)
                .map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
            </select>
          </label>

          <div className="ArticleRow">
            <span className="YearLabel">Articles to compare</span>
            <TimeTravelArticlePicker
              articleTitles={articleTitles}
              selected={selectedArticles}
              onChange={onSelectedArticlesChange}
            />
          </div>
        </div>

        <div className="FetchRow">
          <button
            type="button"
            className="FetchButton"
            disabled={fetchDisabled}
            onClick={onFetch}
          >
            {fetching ? "Fetching…" : "Fetch data"}
          </button>
        </div>
      </div>

      <div className="Note">
        <span>
          Wikimedia's pageview data begins in July 2015, so earlier years can't
          be compared. Sizes are measured on 31 December of each year, or today
          for the current year.
        </span>
      </div>
    </>
  );
};

export default TimeTravelControls;
