import React, { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BsInfoCircle } from "react-icons/bs";
import type { Result } from "vega-embed";
import Spinner from "./spinner.component";
import AxisControls from "./axis-controls.component";
import TimeTravelControls from "./time-travel-controls.component";
import TimeTravelBubblePanel from "./time-travel-bubble-panel.component";
import TopicService from "../services/topic.service";
import type { XAxisKey } from "../types/bubble-chart.type";
import type { TimeTravelSnapshot } from "../types/time-travel.type";
import {
  buildTimeTravelRows,
  buildTimeTravelSpec,
  computeSharedScales,
  locateArticle,
  TIME_TRAVEL_X_AXIS_OPTIONS,
} from "../utils/time-travel-vega";
import type { ScreenPoint } from "../utils/time-travel-vega";
import { compareArticlesByPublicationDateAsc } from "../utils/bubble-chart-utils";

const FOUR_HOURS = 4 * 60 * 60 * 1000;

const Y_AXIS_OPTIONS = [
  { value: "average_daily_views" as const, label: "Avg daily views" },
];

export type TimeTravelQuery = {
  articles: string[];
  startYear: number;
  endYear: number;
};

export interface TimeTravelPanelProps {
  topicId: string | number;
  articleTitles: string[];
  publicationDates: Record<string, string | null>;
  selectedArticles: string[];
  onSelectedArticlesChange: (titles: string[]) => void;
  startYear: number;
  endYear: number;
  onStartYearChange: (year: number) => void;
  onEndYearChange: (year: number) => void;
  query: TimeTravelQuery | null;
  onFetch: () => void;
  xAxisKey: XAxisKey;
  onXAxisKeyChange: (key: XAxisKey) => void;
  xAxisMode: "ranked" | "scaled";
  onXAxisModeChange: (mode: "ranked" | "scaled") => void;
  yAxisScaleType: "linear" | "log";
  onYAxisScaleTypeChange: (type: "linear" | "log") => void;
  showLabels: boolean;
  onShowLabelsChange: (show: boolean) => void;
}

// Both panels are sorted by the end-year values so an article keeps the same
// horizontal slot on the left and the right.
function sortTitles(
  titles: string[],
  endSnapshots: Record<string, TimeTravelSnapshot | null>,
  xAxisKey: XAxisKey,
  publicationDates: Record<string, string | null>,
): string[] {
  if (xAxisKey === "title") return [...titles].sort();

  if (xAxisKey === "publication_date") {
    return [...titles].sort((a, b) =>
      compareArticlesByPublicationDateAsc(
        { article: a, publication_date: publicationDates[a] ?? null },
        { article: b, publication_date: publicationDates[b] ?? null },
      ),
    );
  }

  return [...titles].sort((a, b) => {
    const first = endSnapshots[a]?.[xAxisKey] ?? 0;
    const second = endSnapshots[b]?.[xAxisKey] ?? 0;
    if (first !== second) return first - second;
    return a.localeCompare(b);
  });
}

function sameQuery(
  query: TimeTravelQuery | null,
  articles: string[],
  startYear: number,
  endYear: number,
): boolean {
  if (!query) return false;
  return (
    query.startYear === startYear &&
    query.endYear === endYear &&
    query.articles.length === articles.length &&
    [...query.articles].sort().join("|") === [...articles].sort().join("|")
  );
}

const TimeTravelPanel: React.FC<TimeTravelPanelProps> = ({
  topicId,
  articleTitles,
  publicationDates,
  selectedArticles,
  onSelectedArticlesChange,
  startYear,
  endYear,
  onStartYearChange,
  onEndYearChange,
  query,
  onFetch,
  xAxisKey,
  onXAxisKeyChange,
  xAxisMode,
  onXAxisModeChange,
  yAxisScaleType,
  onYAxisScaleTypeChange,
  showLabels,
  onShowLabelsChange,
}) => {
  const viewsRef = useRef<{ start: Result | null; end: Result | null }>({
    start: null,
    end: null,
  });
  const hoveredRef = useRef<string | null>(null);
  const [hovered, setHovered] = useState<{
    article: string;
    start: ScreenPoint | null;
    end: ScreenPoint | null;
  } | null>(null);

  const { data, isFetching, error } = useQuery({
    queryKey: [
      "timeTravel",
      String(topicId),
      query?.startYear,
      query?.endYear,
      [...(query?.articles ?? [])].sort().join("|"),
    ],
    queryFn: ({ signal }) =>
      TopicService.getArticleTimeTravel(
        topicId,
        query!.articles,
        query!.startYear,
        query!.endYear,
        signal,
      ),
    enabled: !!query && query.articles.length > 0,
    staleTime: FOUR_HOURS,
    gcTime: FOUR_HOURS,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const panels = useMemo(() => {
    if (!data || !query) return null;

    const titles = query.articles;
    const startSnapshots: Record<string, TimeTravelSnapshot | null> = {};
    const endSnapshots: Record<string, TimeTravelSnapshot | null> = {};
    for (const title of titles) {
      startSnapshots[title] = data[title]?.[String(query.startYear)] ?? null;
      endSnapshots[title] = data[title]?.[String(query.endYear)] ?? null;
    }

    const ordered = sortTitles(
      titles,
      endSnapshots,
      xAxisKey,
      publicationDates,
    );

    const startRows = buildTimeTravelRows(
      ordered,
      startSnapshots,
      endSnapshots,
      publicationDates,
    );
    const endRows = buildTimeTravelRows(
      ordered,
      endSnapshots,
      startSnapshots,
      publicationDates,
    );

    const scales = computeSharedScales([...startRows, ...endRows]);

    let xDomain: [number, number] | [string, string] | null = null;
    if (xAxisMode === "scaled" && xAxisKey !== "title") {
      const values = [...startRows, ...endRows]
        .map((row) =>
          xAxisKey === "publication_date"
            ? row.publication_date
            : (row[xAxisKey] as number | null),
        )
        .filter((value) => value !== null && value !== undefined);
      if (values.length) {
        xDomain =
          xAxisKey === "publication_date"
            ? ([
                (values as string[]).slice().sort()[0],
                (values as string[]).slice().sort().reverse()[0],
              ] as [string, string])
            : ([
                Math.min(...(values as number[])),
                Math.max(...(values as number[])),
              ] as [number, number]);
      }
    }

    const common = {
      scales,
      xAxisKey,
      xAxisMode,
      xDomain,
      yAxisScaleType,
      showLabels,
    };

    return {
      startYear: query.startYear,
      endYear: query.endYear,
      startRows,
      endRows,
      startSpec: buildTimeTravelSpec({ ...common, rows: startRows }),
      endSpec: buildTimeTravelSpec({ ...common, rows: endRows }),
    };
  }, [
    data,
    query,
    publicationDates,
    xAxisKey,
    xAxisMode,
    yAxisScaleType,
    showLabels,
  ]);

  const handleHover = (article: string | null) => {
    if (hoveredRef.current === article) return;
    hoveredRef.current = article;
    for (const embedded of [viewsRef.current.start, viewsRef.current.end]) {
      if (!embedded) continue;
      embedded.view.signal("hover_article", article);
      embedded.view.runAsync();
    }
    setHovered(
      article
        ? {
            article,
            start: locateArticle(viewsRef.current.start, article),
            end: locateArticle(viewsRef.current.end, article),
          }
        : null,
    );
  };

  const registerView = (panel: "start" | "end", view: Result | null) => {
    viewsRef.current[panel] = view;
    hoveredRef.current = null;
    setHovered(null);
  };

  const upToDate = sameQuery(query, selectedArticles, startYear, endYear);

  return (
    <div className="TimeTravel">
      <div className="Explainer">
        <BsInfoCircle size={24} aria-hidden="true" />
        <span>
          Time travel compares the same articles at two points in time. Pick two
          years to see how each article's size, lead section, discussion page
          and daily visits changed between them, then hover an article to read
          its stats for both years at once.
        </span>
      </div>

      <TimeTravelControls
        articleTitles={articleTitles}
        selectedArticles={selectedArticles}
        onSelectedArticlesChange={onSelectedArticlesChange}
        startYear={startYear}
        endYear={endYear}
        onStartYearChange={onStartYearChange}
        onEndYearChange={onEndYearChange}
        onFetch={onFetch}
        fetchDisabled={selectedArticles.length === 0 || isFetching || upToDate}
        fetching={isFetching}
      />

      {panels && (
        <AxisControls
          idPrefix="timetravel"
          hideYAxisRange
          xAxisOptions={TIME_TRAVEL_X_AXIS_OPTIONS}
          yAxisOptions={Y_AXIS_OPTIONS}
          yAxisKey="average_daily_views"
          onYAxisKeyChange={() => undefined}
          yAxisScaleType={yAxisScaleType}
          onYAxisScaleTypeChange={onYAxisScaleTypeChange}
          yAxisMinInput=""
          onYAxisMinInputChange={() => undefined}
          yAxisMaxInput=""
          onYAxisMaxInputChange={() => undefined}
          yAxisAutoDomain={{ min: null, max: null }}
          xAxisKey={xAxisKey}
          onXAxisKeyChange={onXAxisKeyChange}
          xAxisMode={xAxisMode}
          onXAxisModeChange={onXAxisModeChange}
        />
      )}

      {panels && (
        <div className="DisplayOptions">
          <label className="ShowLabels">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => onShowLabelsChange(e.target.checked)}
            />
            <span>Show labels</span>
          </label>
        </div>
      )}

      {!query && !isFetching && (
        <div className="Panels--empty">
          Pick articles and choose two years, then select Fetch data.
        </div>
      )}

      {isFetching && (
        <div className="Panels--loading">
          <Spinner size="large" />
          <div>
            Fetching {query?.startYear} and {query?.endYear} snapshots from
            Wikipedia…
          </div>
        </div>
      )}

      {error && !isFetching && (
        <div className="Panels--error">
          Failed to load time travel data. Please try again later.
        </div>
      )}

      {panels && !isFetching && (
        <>
          <div className="Panels">
            <TimeTravelBubblePanel
              year={panels.startYear}
              otherYear={panels.endYear}
              spec={panels.startSpec}
              rows={panels.startRows}
              showChange={panels.startYear > panels.endYear}
              hoveredArticle={hovered?.article ?? null}
              hoveredPosition={hovered?.start ?? null}
              onHover={handleHover}
              onReady={(view) => registerView("start", view)}
            />
            <TimeTravelBubblePanel
              year={panels.endYear}
              otherYear={panels.startYear}
              spec={panels.endSpec}
              rows={panels.endRows}
              showChange={panels.endYear > panels.startYear}
              hoveredArticle={hovered?.article ?? null}
              hoveredPosition={hovered?.end ?? null}
              onHover={handleHover}
              onReady={(view) => registerView("end", view)}
            />
          </div>

          <div className="Footnote">
            * Bubbles are drawn from article, lead section and discussion page
            sizes at each year. Hovering an article opens its stats for both
            years at once. Quality assessment is not shown here because
            Wikipedia only publishes present-day grades.
          </div>
        </>
      )}
    </div>
  );
};

export default TimeTravelPanel;
