import React from "react";
import { List } from "react-window";
import { GoTriangleLeft, GoTriangleRight } from "react-icons/go";
import { FiExternalLink } from "react-icons/fi";
import { getWikiUrl } from "../utils/search-utils";
import type { ArticleRow } from "./article-detail-panel.component";

const ITEM_HEIGHT = 42;
const LIST_HEIGHT = 600;

interface FilteredArticlesSidebarProps {
  articles: ArticleRow[];
  wiki?: { language: string; project: string };
  isOpen: boolean;
  onToggle: () => void;
  onArticleClick?: (article: ArticleRow) => void;
}

interface SidebarRowProps {
  articles: ArticleRow[];
  wiki?: { language: string; project: string };
  onArticleClick?: (article: ArticleRow) => void;
}

function SidebarRow(props: SidebarRowProps): React.ReactElement | null {
  const { articles, wiki, onArticleClick } = props;
  const { index, style } = props as unknown as {
    index: number;
    style: React.CSSProperties;
  };
  const articleRow = articles[index];
  if (!articleRow) return null;

  return (
    <li style={style} className="FilteredArticlesSidebarItem">
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
  );
}

const FilteredArticlesSidebar: React.FC<FilteredArticlesSidebarProps> =
  React.memo(({ articles, wiki, isOpen, onToggle, onArticleClick }) => {
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
          {isOpen && (
            <List
              className="FilteredArticlesSidebarList"
              rowComponent={SidebarRow}
              rowCount={articles.length}
              rowHeight={ITEM_HEIGHT}
              rowProps={{ articles, wiki, onArticleClick }}
              overscanCount={10}
              style={{ maxHeight: LIST_HEIGHT }}
            />
          )}
        </div>
      </div>
    );
  });

FilteredArticlesSidebar.displayName = "FilteredArticlesSidebar";

export default FilteredArticlesSidebar;
