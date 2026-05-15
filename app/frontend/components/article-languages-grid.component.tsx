import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { BsInfoCircle } from "react-icons/bs";
import { FiEdit2 } from "react-icons/fi";
import { IoCloseCircle } from "react-icons/io5";
import Spinner from "./spinner.component";
import usePagination from "../hooks/usePagination";
import { LANGUAGE_LABELS, getTranslateUrl } from "../utils/language-links";
import { makeSqrtAreaScale } from "../utils/bubble-chart-utils";
import BubbleCell from "./bubble-cell.component";
import TopicService from "../services/topic.service";
import type { LangComparisonData } from "../services/topic.service";
import type {
  BubbleSizeFields,
  RadiusScale,
  RadiusScales,
} from "../types/bubble-chart.type";
import type { TargetLanguage } from "../utils/language-links";
import type { LangLinksProgress } from "../utils/language-links";

type Wiki = {
  language: string;
  project: string;
};

type ArticleRowForGrid = BubbleSizeFields & {
  article: string;
};

type ArticleLanguagesGridProps = {
  articles: ArticleRowForGrid[];
  allArticles?: ArticleRowForGrid[];
  languageLinks: Map<string, Set<string>>;
  wiki?: Wiki;
  loading: boolean;
  error?: string | null;
  languages: readonly TargetLanguage[];
  onArticleClick?: (articleTitle: string) => void;
  progress?: LangLinksProgress;
  topicId?: string | number;
};

const ITEMS_PER_PAGE = 10;
const LANG_FETCH_CONCURRENCY = 5;
const LANG_DATA_STALE_MS = 4 * 60 * 60 * 1000;

function LanguageCell({
  articleTitle,
  lang,
  exists,
  sourceLang,
  row,
  scales,
  langData,
  isLoading,
  isQueued,
}: {
  articleTitle: string;
  lang: string;
  exists: boolean;
  sourceLang: string;
  row: ArticleRowForGrid;
  scales: RadiusScales;
  langData?: LangComparisonData | null;
  isLoading?: boolean;
  isQueued?: boolean;
}) {
  if (!exists) {
    return (
      <td className="ArticleLangCell ArticleLangCell--missing">
        <span className="ArticleLangCellMissing">
          <IoCloseCircle size={18} />
          <span>Missing</span>
        </span>
        <a
          className="ArticleLangCellTranslate"
          href={getTranslateUrl(articleTitle, sourceLang, lang)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FiEdit2 size={14} />
          <span>Translate article</span>
        </a>
      </td>
    );
  }

  // The source-language column already has accurate data
  const isSourceLang = lang === sourceLang;

  const displayRow: ArticleRowForGrid =
    !isSourceLang && langData
      ? {
          ...row,
          article_size: langData.article_size,
          lead_section_size: langData.lead_section_size,
          talk_size: langData.talk_size,
          prev_article_size: null,
        }
      : row;

  return (
    <BubbleCell
      row={displayRow}
      scales={scales}
      isLoading={!isSourceLang && isLoading}
      isQueued={!isSourceLang && isQueued}
    />
  );
}

function PaginationBar({
  currentPage,
  totalPages,
  goToPage,
}: {
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis")[] = [];
  const maxVisible = 10;

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const start = Math.max(2, currentPage - 3);
    const end = Math.min(totalPages - 1, currentPage + 3);

    if (start > 2) pages.push("ellipsis");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <div className="ArticleLangPagination">
      <button
        className="ArticleLangPaginationBtn"
        disabled={currentPage === 1}
        onClick={() => goToPage(currentPage - 1)}
        aria-label="Previous page"
      >
        &lsaquo;
      </button>
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e${i}`} className="ArticleLangPaginationEllipsis">
            &hellip;
          </span>
        ) : (
          <button
            key={p}
            className={`ArticleLangPaginationBtn ${p === currentPage ? "is-active" : ""}`}
            onClick={() => goToPage(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        className="ArticleLangPaginationBtn"
        disabled={currentPage === totalPages}
        onClick={() => goToPage(currentPage + 1)}
        aria-label="Next page"
      >
        &rsaquo;
      </button>
    </div>
  );
}

const ArticleLanguagesGrid: React.FC<ArticleLanguagesGridProps> = ({
  articles,
  allArticles,
  languageLinks,
  wiki,
  loading,
  error,
  languages,
  onArticleClick,
  progress,
  topicId,
}) => {
  const { currentPageData, currentPage, totalPages, goToPage } = usePagination({
    data: articles,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  const sourceLang = wiki?.language ?? "en";

  const scaleSource = allArticles ?? articles;

  const radiusScales = useMemo<RadiusScales>(() => {
    const areaToRadius = (area: number) => Math.sqrt(area / Math.PI);
    const build = (
      field: keyof BubbleSizeFields,
      range: [number, number],
    ): RadiusScale => {
      const values = scaleSource.map((a) => a[field] ?? 0);
      const areaScale = makeSqrtAreaScale(values, range);
      return (v) => areaToRadius(areaScale(v ?? 0));
    };
    return {
      talk: build("talk_size", [50, 1500]),
      prevArticle: build("prev_article_size", [20, 600]),
      lead: build("lead_section_size", [30, 800]),
      article: build("article_size", [20, 600]),
    };
  }, [scaleSource]);

  const [unlockedIdx, setUnlockedIdx] = useState(LANG_FETCH_CONCURRENCY - 1);
  const pageKeyRef = useRef<string>("");
  // Stable page identity key — changes only when the set of articles changes
  const pageKey = currentPageData.map((r) => r.article).join("\0");

  const langQueries = useQueries({
    queries: currentPageData.map((row, i) => ({
      queryKey: ["langComparison", topicId, row.article],
      queryFn: ({ signal }) =>
        TopicService.getArticleLanguageComparison(topicId!, row.article, signal),
      enabled: !!topicId && !loading && i <= unlockedIdx,
      staleTime: LANG_DATA_STALE_MS,
      gcTime: LANG_DATA_STALE_MS,
    })),
  });

  // Maintain the sliding window: each time a query settles, advance the unlock
  // pointer so that a new query starts and concurrency stays at LANG_FETCH_CONCURRENCY.
  // Cached queries settle synchronously and fast-forward the window instantly.
  useEffect(() => {
    if (pageKey !== pageKeyRef.current) {
      pageKeyRef.current = pageKey;
      setUnlockedIdx(LANG_FETCH_CONCURRENCY - 1);
      return;
    }
    const settledCount = langQueries
      .slice(0, unlockedIdx + 1)
      .filter((q) => q.isSuccess || q.isError).length;

    const targetIdx = Math.min(
      settledCount + LANG_FETCH_CONCURRENCY - 1,
      currentPageData.length - 1,
    );

    if (targetIdx > unlockedIdx) {
      setUnlockedIdx(targetIdx);
    }
  }, [pageKey, langQueries, unlockedIdx, currentPageData.length]);

  const langDataByArticle = useMemo(() => {
    const map = new Map<string, Record<string, LangComparisonData | null>>();
    currentPageData.forEach((row, i) => {
      const result = langQueries[i];
      if (result?.data) {
        map.set(row.article, result.data);
      }
    });
    return map;
  }, [langQueries, currentPageData]);

  if (loading) {
    const pct =
      progress && progress.total > 0
        ? Math.round((progress.done / progress.total) * 100)
        : 0;

    return (
      <div className="ArticleLangGridLoading">
        <Spinner size="large" />
        <div className="ArticleLangGridLoadingText">
          Fetching language data&hellip;{" "}
          {progress && progress.total > 0 && (
            <span>
              {progress.done} / {progress.total} articles
            </span>
          )}
        </div>
        {progress && progress.total > 0 && (
          <div className="ArticleLangProgressTrack">
            <div
              className="ArticleLangProgressBar"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return <div className="ArticleLangGridError">{error}</div>;
  }

  if (articles.length === 0) {
    return (
      <div className="ArticleLangGridEmpty">
        No articles match the current filters.
      </div>
    );
  }

  return (
    <div className="ArticleLangGrid">
      <table className="ArticleLangTable">
        <thead>
          <tr>
            <th className="ArticleLangTableHeaderArticle">
              <div className="ArticleLangTableHeaderArticle__inner">
                <BsInfoCircle size={24} />
                <span>
                  Compare different linguistic versions of the article
                </span>
              </div>
            </th>
            {languages.map((lang) => (
              <th key={lang} className="ArticleLangTableHeaderLang">
                {LANGUAGE_LABELS[lang] ?? lang} version
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {currentPageData.map((row, rowIdx) => {
            const langs = languageLinks.get(row.article) ?? new Set<string>();
            const articleLangData = langDataByArticle.get(row.article);
            const inFetchPhase = !!topicId && !loading;
            const rowIsLoading =
              inFetchPhase && langQueries[rowIdx]?.isLoading === true;
            const rowIsQueued =
              inFetchPhase &&
              !rowIsLoading &&
              !langQueries[rowIdx]?.isSuccess &&
              !langQueries[rowIdx]?.isError;

            return (
              <tr key={row.article} className="ArticleLangRow">
                <td
                  className={`ArticleLangRowTitle${onArticleClick ? " ArticleLangRowTitle--clickable" : ""}`}
                  onClick={() => onArticleClick?.(row.article)}
                >
                  {row.article}
                </td>
                {languages.map((lang) => (
                  <LanguageCell
                    key={lang}
                    articleTitle={row.article}
                    lang={lang}
                    exists={langs.has(lang)}
                    sourceLang={sourceLang}
                    row={row}
                    scales={radiusScales}
                    langData={articleLangData?.[lang]}
                    isLoading={rowIsLoading && langs.has(lang)}
                    isQueued={rowIsQueued && langs.has(lang)}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        goToPage={goToPage}
      />
    </div>
  );
};

export default ArticleLanguagesGrid;
