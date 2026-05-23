// NPM
import _ from "lodash";
import React, { useState, useEffect, useRef } from "react";
import cn from "classnames";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Types
import Topic from "../types/topic.type";

// Misc
import TopicService from "../services/topic.service";

type PhaseStatus = "pending" | "running" | "complete" | "error";

type Phase = {
  key: "import" | "analytics" | "timepoints";
  label: string;
  status: PhaseStatus;
  percent: number | null;
  startedAt: number | null;
  detail: string | null;
  countLabel: string | null;
  subStages?: SubStage[];
};

type SubStage = {
  key: string;
  label: string;
  state: "pending" | "current" | "complete";
};

const TIMEPOINT_STAGES: { key: string; label: string }[] = [
  { key: "classify", label: "Classifying" },
  { key: "article_timepoints", label: "Article timepoints" },
  { key: "tokens", label: "Tokens" },
  { key: "topic_timepoints", label: "Topic timepoints" },
];

// 30 bars total, split 3/12/15 so each phase's section is sized to
// the rough share of total wall-clock time it consumes:
//   import    ~10% (CSV / TB ingest is quick — minutes)
//   analytics ~40% (~17 articles/min × N articles via Wikipedia API)
//   timeline  ~50% (4-stage build dominates for typical topics)
// Each bar covers 1/30 of overall progress, so the wave-of-bars
// animation rate stays uniform — there are just more bars in the
// longer phases. Heights mimic the real "articles per timepoint"
// bar chart shape (uneven, occasional tall outliers).
const PHASE_BAR_COUNTS = [3, 12, 15];
const N_BARS = PHASE_BAR_COUNTS.reduce((a, b) => a + b, 0);
const PHASE_WEIGHTS = PHASE_BAR_COUNTS.map((n) => n / N_BARS);

// Heights follow a deliberate macro-shape — rising sharply through
// the first ~60% of the chart, plateauing around the analytics→
// timeline transition, then drifting down through the final ~40% —
// with sawtooth variation inside each phase so it reads like a real
// "articles per timepoint" distribution rather than a uniform ramp.
const BAR_HEIGHTS = [
  // import (3) — small, gently rising
  0.25, 0.30, 0.32,
  // analytics (12) — rising in clusters with occasional dips
  0.42, 0.45, 0.40, 0.52, 0.58, 0.55, 0.65, 0.62, 0.70, 0.78, 0.85, 0.82,
  // timeline (15)
  // 15–17: late rise into peak
  0.88, 0.95, 0.90,
  // 18–22: plateau around the ~60% mark
  0.93, 0.92, 0.86, 0.94, 0.88,
  // 23–29: gentle decline with one bump (the "final ~40%")
  0.84, 0.80, 0.82, 0.74, 0.68, 0.62, 0.55,
];

function phaseIdxForBar(i: number): number {
  let cumulative = 0;
  for (let p = 0; p < PHASE_BAR_COUNTS.length; p++) {
    cumulative += PHASE_BAR_COUNTS[p];
    if (i < cumulative) return p;
  }
  return PHASE_BAR_COUNTS.length - 1;
}

function isRunning(status: string | null | undefined) {
  return status === "working" || status === "queued" || status === "retrying";
}

function isFailed(status: string | null | undefined) {
  return status === "failed" || status === "interrupted";
}

function derive(jobStatus: string | null | undefined, dataExists: boolean): PhaseStatus {
  if (isRunning(jobStatus)) return "running";
  if (isFailed(jobStatus)) return "error";
  return dataExists ? "complete" : "pending";
}

function buildImportPhase(topic: Topic): Phase {
  const isTb = !!topic.tb_handle;
  const hasUsersCsv = !isTb && !!topic.users_csv_filename;
  const articlesDone = topic.articles_count > 0;
  const usersDone = !hasUsersCsv || topic.user_count > 0;
  const dataExists = articlesDone && usersDone;

  const articlesRunning = isRunning(topic.articles_import_status);
  const usersRunning = isRunning(topic.users_import_status);

  let status: PhaseStatus;
  if (articlesRunning || usersRunning) status = "running";
  else if (
    isFailed(topic.articles_import_status) ||
    isFailed(topic.users_import_status)
  )
    status = "error";
  else status = dataExists ? "complete" : "pending";

  const articlesPct = topic.articles_import_percent_complete ?? 0;
  const usersPct = topic.users_import_percent_complete ?? 0;
  let percent: number | null = null;
  let startedAt: number | null = null;
  if (status === "running") {
    if (hasUsersCsv) {
      percent = Math.round((articlesPct + usersPct) / 2);
      startedAt = _.min(
        [topic.articles_import_started_at, topic.users_import_started_at].filter(
          (v) => v != null,
        ) as number[],
      ) ?? null;
    } else {
      percent = articlesPct;
      startedAt = topic.articles_import_started_at;
    }
  }

  const detail = status === "running"
    ? hasUsersCsv
      ? `Importing — articles ${articlesPct}% · users ${usersPct}%`
      : `Importing articles · ${articlesPct}%`
    : null;

  let countLabel: string | null = null;
  if (status === "complete") {
    const parts = [`${topic.articles_count} articles`];
    if (hasUsersCsv) parts.push(`${topic.user_count} users`);
    countLabel = parts.join(" · ");
  }

  return {
    key: "import",
    label: isTb ? "Import" : "Import",
    status,
    percent,
    startedAt,
    detail,
    countLabel,
  };
}

function buildAnalyticsPhase(topic: Topic): Phase {
  const status = derive(
    topic.generate_article_analytics_status,
    !!topic.has_analytics,
  );

  const fetched = topic.generate_article_analytics_articles_fetched;
  const total = topic.generate_article_analytics_articles_total;
  const skipped = topic.generate_article_analytics_skipped;

  let detail: string | null = null;
  if (status === "running") {
    const lines: string[] = [];
    if (topic.generate_article_analytics_message) {
      lines.push(topic.generate_article_analytics_message);
    }
    if (_.isNumber(fetched) && _.isNumber(total)) {
      const skippedSuffix =
        _.isNumber(skipped) && skipped > 0 ? ` (${skipped} not found)` : "";
      lines.push(`${fetched} / ${total} articles${skippedSuffix}`);
    }
    detail = lines.join(" · ") || null;
  }

  return {
    key: "analytics",
    label: "Analytics",
    status,
    percent: status === "running" ? topic.generate_article_analytics_percent_complete : null,
    startedAt: status === "running" ? topic.generate_article_analytics_started_at : null,
    detail,
    countLabel: null,
  };
}

function buildTimepointsPhase(topic: Topic): Phase {
  const status = derive(topic.incremental_topic_build_status, !!topic.has_stats);

  const currentStageKey = topic.incremental_topic_build_stage;
  const currentIdx = currentStageKey
    ? TIMEPOINT_STAGES.findIndex((s) => s.key === currentStageKey)
    : -1;

  const subStages: SubStage[] = TIMEPOINT_STAGES.map((stage, idx) => {
    if (status === "complete") return { ...stage, state: "complete" as const };
    if (status === "pending" || currentIdx === -1) {
      return { ...stage, state: "pending" as const };
    }
    if (idx < currentIdx) return { ...stage, state: "complete" as const };
    if (idx === currentIdx) return { ...stage, state: "current" as const };
    return { ...stage, state: "pending" as const };
  });

  const detail = status === "running"
    ? buildTimepointsDetail(topic, currentStageKey)
    : null;

  return {
    key: "timepoints",
    label: "Timeline",
    status,
    percent: status === "running" ? topic.incremental_topic_build_percent_complete : null,
    startedAt: status === "running" ? topic.incremental_topic_build_started_at : null,
    detail,
    countLabel: null,
    subStages,
  };
}

// Label for the at/total counter depends on which stage is running —
// classify counts articles, article_timepoints counts (article × timestamp)
// cells, tokens counts articles, topic_timepoints counts timestamps.
const STAGE_AT_LABEL: Record<string, string> = {
  classify: "articles classified",
  article_timepoints: "timepoint cells",
  tokens: "articles processed",
  topic_timepoints: "timestamps summarized",
};

function buildTimepointsDetail(
  topic: Topic,
  stageKey: string | null,
): string | null {
  const lines: string[] = [];

  const stageMessage =
    topic.incremental_topic_build_stage_message ||
    topic.incremental_topic_build_message;
  if (stageMessage) lines.push(stageMessage);

  const at = topic.incremental_topic_build_at;
  const total = topic.incremental_topic_build_total;
  if (_.isNumber(at) && _.isNumber(total) && total > 0) {
    const label = (stageKey && STAGE_AT_LABEL[stageKey]) || "steps";
    lines.push(`${at.toLocaleString()} / ${total.toLocaleString()} ${label}`);
  }

  const tsDone = topic.incremental_topic_build_timestamps_done;
  const tsTotal = topic.incremental_topic_build_timestamps_total;
  if (_.isNumber(tsDone) && _.isNumber(tsTotal) && tsTotal > 0) {
    lines.push(
      `${tsDone.toLocaleString()} / ${tsTotal.toLocaleString()} timestamps`,
    );
  }

  return lines.length > 0 ? lines.join(" · ") : null;
}

function buildPhases(topic: Topic): Phase[] {
  const phases = [
    buildImportPhase(topic),
    buildAnalyticsPhase(topic),
    buildTimepointsPhase(topic),
  ];

  // Re-generation correction: once a phase is running, every downstream
  // phase whose only claim to "complete" is leftover data from a
  // previous cycle (has_stats, has_analytics) should read as pending.
  // Otherwise the chart fills past the active phase — e.g. while
  // analytics is regenerating, timeline still has last cycle's stats
  // and would otherwise show as 100% done.
  let downstream = false;
  return phases.map((p) => {
    if (downstream && p.status === "complete") {
      return {
        ...p,
        status: "pending" as const,
        percent: null,
        startedAt: null,
        detail: null,
        countLabel: null,
      };
    }
    if (p.status === "running") downstream = true;
    return p;
  });
}

// Phase weights (matching PHASE_WEIGHTS) determine how much each phase
// contributes to the overall percent. Import is ~10%, analytics ~40%,
// timeline ~50% — so the chart animation rate matches actual job
// duration (a 50%-complete analytics phase advances overall by 20%).
function computeOverallPercent(phases: Phase[]): number {
  let total = 0;
  phases.forEach((p, i) => {
    const weight = (PHASE_WEIGHTS[i] ?? 1 / phases.length) * 100;
    if (p.status === "complete") total += weight;
    else if (p.status === "running")
      total += (Math.max(0, p.percent ?? 0) / 100) * weight;
  });
  return Math.min(100, total);
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatEta(seconds: number): string {
  if (seconds < 30) return "less than a minute";
  if (seconds < 60) return "under 1 min";
  if (seconds < 3600) return `~${Math.round(seconds / 60)} min`;
  const hrs = Math.round((seconds / 3600) * 10) / 10;
  return `~${hrs} hr`;
}

function computeEtaSeconds(
  percent: number | null,
  startedAt: number | null,
  nowMs: number,
): number | null {
  if (!startedAt || !percent || percent < 5) return null;
  const elapsedSec = nowMs / 1000 - startedAt;
  if (elapsedSec <= 0) return null;
  const totalSec = elapsedSec / (percent / 100);
  return Math.max(0, Math.round(totalSec - elapsedSec));
}

// Skeleton bar chart that fills in left-to-right as the pipeline
// progresses. The bar shape and varied heights echo the real
// "articles created at each timepoint" chart that this topic will
// display once generation completes — so the loading state previews
// the eventual deliverable.
function ProgressChart({
  overallPercent,
  phases,
}: {
  overallPercent: number;
  phases: Phase[];
}) {
  const N = N_BARS;
  const cellW = 300 / N; // 10 px per cell
  const barW = cellW - 2;

  return (
    <svg
      className="ProgressChart"
      viewBox={`0 0 300 60`}
      preserveAspectRatio="none"
      aria-label={`Progress: ${Math.round(overallPercent)}%`}
    >
      <line x1="0" y1="59" x2="300" y2="59" className="ProgressChart-baseline" />

      {BAR_HEIGHTS.map((target, i) => {
        const phaseIdx = phaseIdxForBar(i);
        const phase = phases[phaseIdx];

        const slotStart = (i / N) * 100;
        const slotEnd = ((i + 1) / N) * 100;
        let fillRatio = 0;
        if (overallPercent >= slotEnd) fillRatio = 1;
        else if (overallPercent > slotStart)
          fillRatio = (overallPercent - slotStart) / (slotEnd - slotStart);

        const visibleHeight = target * fillRatio * 54;
        const y = 58 - visibleHeight;
        const isActive =
          phase.status === "running" &&
          overallPercent > slotStart &&
          overallPercent < slotEnd;

        return (
          <rect
            key={i}
            x={i * cellW + 1}
            y={y}
            width={barW}
            height={visibleHeight}
            className={cn(
              "ProgressChart-bar",
              `ProgressChart-bar--phase-${phaseIdx}`,
              `ProgressChart-bar--${phase.status}`,
              { "ProgressChart-bar--active": isActive },
            )}
          />
        );
      })}
    </svg>
  );
}

function PhaseLegend({ phases }: { phases: Phase[] }) {
  return (
    <div className="ProgressLegend">
      {phases.map((phase, idx) => (
        <div
          key={phase.key}
          className={cn(
            "ProgressLegend-item",
            `ProgressLegend-item--${phase.status}`,
            `ProgressLegend-item--phase-${idx}`,
          )}
        >
          <span className="ProgressLegend-marker">
            {phase.status === "complete" && <span className="ProgressLegend-check">✓</span>}
            {phase.status === "running" && <span className="ProgressLegend-dot" />}
            {phase.status === "pending" && <span className="ProgressLegend-dotPending" />}
            {phase.status === "error" && "!"}
          </span>
          <span className="ProgressLegend-label">{phase.label}</span>
        </div>
      ))}
    </div>
  );
}

function OverflowMenu({
  topic,
  onRestart,
  isStarting,
}: {
  topic: Topic;
  onRestart: () => void;
  isStarting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="TopicOverflow" ref={ref}>
      <button
        type="button"
        className="TopicOverflow-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
      >
        ⋯
      </button>
      {open && (
        <div className="TopicOverflow-menu" role="menu">
          <button
            type="button"
            className="TopicOverflow-item"
            disabled={isStarting}
            onClick={() => {
              setOpen(false);
              onRestart();
            }}
          >
            Restart data generation
          </button>
          <Link
            to={`/my-topics/edit/${topic.id}`}
            className="TopicOverflow-item"
            onClick={() => setOpen(false)}
          >
            Edit topic
          </Link>
        </div>
      )}
    </div>
  );
}

function TopicGenerationProgress({ topic }: { topic: Topic }) {
  const queryClient = useQueryClient();
  const nowMs = useNow(1000);
  const canEdit = !!topic.owned;

  const startMutation = useMutation<Topic, unknown, void>({
    mutationFn: () => TopicService.start_data_generation(topic.id),
    onSuccess: (data) => {
      queryClient.setQueryData(["topic", topic.id.toString()], data);
    },
  });

  const phases = buildPhases(topic);
  const state = topic.data_generation_state || "idle";
  const overallPercent = state === "complete" ? 100 : computeOverallPercent(phases);

  const currentPhase = phases.find((p) => p.status === "running") || null;
  const currentEta = currentPhase
    ? computeEtaSeconds(currentPhase.percent, currentPhase.startedAt, nowMs)
    : null;

  const canStart =
    state === "idle" &&
    (topic.articles_count > 0 || !!topic.articles_csv_filename);
  const cannotStartReason =
    state === "idle" && !canStart
      ? !topic.tb_handle && !topic.articles_csv_filename
        ? "Attach an articles CSV from Edit Topic before generating data."
        : null
      : null;

  return (
    <div className="TopicProgress">
      <div className="TopicProgress-header">
        <h4 className="TopicProgress-title">
          {state === "idle" && "Data generation"}
          {state === "running" && "Generating data"}
          {state === "complete" && "Data is up to date"}
        </h4>
        {state === "running" && currentEta != null && (
          <span className="TopicProgress-eta">{formatEta(currentEta)} left</span>
        )}
        {canEdit && state !== "idle" && (
          <OverflowMenu
            topic={topic}
            onRestart={() => startMutation.mutate()}
            isStarting={startMutation.isPending}
          />
        )}
      </div>

      <ProgressChart overallPercent={overallPercent} phases={phases} />
      <PhaseLegend phases={phases} />

      {currentPhase?.detail && (
        <div className="TopicProgress-detail" aria-live="polite">
          {currentPhase.detail}
        </div>
      )}

      {currentPhase?.subStages && (
        <div className="TopicProgress-subStages">
          {currentPhase.subStages.map((sub) => (
            <span
              key={sub.key}
              className={cn(
                "TopicProgress-subStage",
                `TopicProgress-subStage--${sub.state}`,
              )}
            >
              {sub.label}
            </span>
          ))}
        </div>
      )}

      {canEdit && state === "idle" && canStart && (
        <button
          type="button"
          className="Button TopicProgress-startButton"
          disabled={startMutation.isPending}
          onClick={() => startMutation.mutate()}
        >
          {startMutation.isPending ? "Starting…" : "Start data generation"}
        </button>
      )}

      {canEdit && state === "idle" && !canStart && (
        <div className="TopicProgress-finePrint">
          {cannotStartReason ||
            "Add articles to this topic before generating data."}
        </div>
      )}

      {canEdit && state === "idle" && (
        <Link to={`/my-topics/edit/${topic.id}`} className="TopicProgress-editLink">
          Edit topic
        </Link>
      )}

      {canEdit && (
        <div className="TopicProgress-finePrint">
          Generation runs in the background. You can navigate away.
        </div>
      )}
    </div>
  );
}

export default TopicGenerationProgress;
