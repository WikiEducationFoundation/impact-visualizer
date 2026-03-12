import React from "react";
import { GoTriangleLeft, GoTriangleRight } from "react-icons/go";
import { FiExternalLink } from "react-icons/fi";
import { getWikiUrl } from "../utils/search-utils";
import type { ArticleRow } from "./article-detail-panel.component";

interface FilteredArticlesSidebarProps {
  articles: ArticleRow[];
  wiki?: { language: string; project: string };
  isOpen: boolean;
  onToggle: () => void;
  onArticleClick?: (article: ArticleRow) => void;
}

const FilteredArticlesSidebar: React.FC<FilteredArticlesSidebarProps> = ({
  articles,
  wiki,
  isOpen,
  onToggle,
  onArticleClick,
}) => {
  return (
    <div className={`FilteredArticlesSidebar ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="FilteredArticlesSidebarToggle"
        onClick={onToggle}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        <span className="FilteredArticlesSidebarToggleIcon">
          {isOpen ? <GoTriangleRight /> : <GoTriangleLeft />}
        </span>
        <span className="FilteredArticlesSidebarToggleCount">
          {articles.length}
        </span>
      </button>
      <div className="FilteredArticlesSidebarContent">
        <div className="FilteredArticlesSidebarHeader">
          <span className="FilteredArticlesSidebarTitle">
            Filtered Articles
          </span>
          <span className="FilteredArticlesSidebarCount">
            {articles.length} article{articles.length !== 1 ? "s" : ""}
          </span>
        </div>
        <ul className="FilteredArticlesSidebarList">
          {articles.map((articleRow) => (
            <li
              key={articleRow.article}
              className="FilteredArticlesSidebarItem"
            >
              <button
                type="button"
                className="FilteredArticlesSidebarLink"
                onClick={() => onArticleClick?.(articleRow)}
              >
                {articleRow.article}
              </button>
              <a
                href={getWikiUrl(articleRow.article, {
                  language: wiki?.language,
                  project: wiki?.project,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="FilteredArticlesSidebarExternalLink"
                onClick={(e) => e.stopPropagation()}
              >
                <FiExternalLink />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FilteredArticlesSidebar;
