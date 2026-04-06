import React from "react";
import { BsInfoCircle } from "react-icons/bs";
import { FiEdit2 } from "react-icons/fi";
import { IoCloseCircle } from "react-icons/io5";
import usePagination from "../hooks/usePagination";
import type { TargetLanguage } from "../utils/language-links";

type Wiki = {
  language: string;
  project: string;
};

interface ArticleLanguagesGridProps {
  articles: { article: string }[];
  languageLinks: Map<string, Set<string>>;
  wiki?: Wiki;
  loading: boolean;
  error?: string | null;
  languages: readonly TargetLanguage[];
}

const ITEMS_PER_PAGE = 10;

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  it: "Italian",
  fr: "French",
  es: "Spanish",
  de: "German",
};

function getTranslateUrl(
  articleTitle: string,
  sourceLang: string,
  targetLang: string,
): string {
  const encoded = encodeURIComponent(articleTitle.replace(/ /g, "_"));
  return `https://${targetLang}.wikipedia.org/wiki/Special:ContentTranslation?page=${encoded}&from=${sourceLang}&to=${targetLang}`;
}

function LanguageCell({
  articleTitle,
  lang,
  exists,
  sourceLang,
}: {
  articleTitle: string;
  lang: string;
  exists: boolean;
  sourceLang: string;
}) {
  if (exists) {
    return (
      <td className="ArticleLangCell ArticleLangCell--present">
        <span className="ArticleLangCellDot" />
      </td>
    );
  }

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
  languageLinks,
  wiki,
  loading,
  error,
  languages,
}) => {
  const { currentPageData, currentPage, totalPages, goToPage } = usePagination({
    data: articles,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  const sourceLang = wiki?.language ?? "en";

  if (loading) {
    return (
      <div className="ArticleLangGridLoading">
        Loading language data&hellip;
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
          {currentPageData.map((row) => {
            const langs = languageLinks.get(row.article) ?? new Set<string>();
            return (
              <tr key={row.article} className="ArticleLangRow">
                <td className="ArticleLangRowTitle">{row.article}</td>
                {languages.map((lang) => (
                  <LanguageCell
                    key={lang}
                    articleTitle={row.article}
                    lang={lang}
                    exists={langs.has(lang)}
                    sourceLang={sourceLang}
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
