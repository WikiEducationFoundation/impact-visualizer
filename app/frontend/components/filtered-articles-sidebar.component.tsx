import React, { useMemo, useState } from "react";
import { List } from "react-window";
import { GoTriangleLeft, GoTriangleRight } from "react-icons/go";
import { FiExternalLink } from "react-icons/fi";
import { BsEye, BsEyeSlash, BsTrash, BsPlusLg } from "react-icons/bs";
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
  excludedOutliers?: Set<string>;
  onToggleOutlier?: (article: string) => void;
  onClearOutliers?: () => void;
  canEdit?: boolean;
  onRemoveArticle?: (title: string) => void;
  removing?: boolean;
  onAddArticleClick?: () => void;
}

interface SidebarRowProps {
  articles: ArticleRow[];
  wiki?: { language: string; project: string };
  onArticleClick?: (article: ArticleRow) => void;
  excludedOutliers?: Set<string>;
  onToggleOutlier?: (article: string) => void;
  canEdit?: boolean;
  onRemoveArticle?: (title: string) => void;
  removing?: boolean;
}

function SidebarRow(props: SidebarRowProps): React.ReactElement | null {
  const {
    articles,
    wiki,
    onArticleClick,
    excludedOutliers,
    onToggleOutlier,
    canEdit,
    onRemoveArticle,
    removing,
  } = props;
  const { index, style } = props as unknown as {
    index: number;
    style: React.CSSProperties;
  };
  const articleRow = articles[index];
  if (!articleRow) return null;

  const isExcluded = excludedOutliers?.has(articleRow.article) ?? false;

  return (
    <li style={style} className={`Item ${isExcluded ? "is-excluded" : ""}`}>
      {onToggleOutlier && (
        <button
          type="button"
          className={`TrimBtn ${isExcluded ? "is-excluded" : ""}`}
          onClick={() => onToggleOutlier(articleRow.article)}
          title={isExcluded ? "Restore to chart" : "Trim from chart"}
          aria-label={
            isExcluded
              ? `Restore ${articleRow.article} to chart`
              : `Trim ${articleRow.article} from chart`
          }
        >
          {isExcluded ? <BsEyeSlash /> : <BsEye />}
        </button>
      )}
      <button
        type="button"
        className="Link"
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
        className="ExternalLink"
        onClick={(e) => e.stopPropagation()}
      >
        <FiExternalLink />
      </a>
      {canEdit && onRemoveArticle && (
        <button
          type="button"
          className="RemoveBtn"
          onClick={() => onRemoveArticle(articleRow.article)}
          disabled={removing}
          title="Remove from topic"
          aria-label={`Remove ${articleRow.article} from topic`}
        >
          <BsTrash />
        </button>
      )}
    </li>
  );
}

const FilteredArticlesSidebar: React.FC<FilteredArticlesSidebarProps> =
  React.memo(
    ({
      articles,
      wiki,
      isOpen,
      onToggle,
      onArticleClick,
      excludedOutliers,
      onToggleOutlier,
      onClearOutliers,
      canEdit,
      onRemoveArticle,
      removing,
      onAddArticleClick,
    }) => {
      const [excludedOnly, setExcludedOnly] = useState<boolean>(false);
      const showAddButton = !!(canEdit && onAddArticleClick);

      const excludedCount = useMemo(() => {
        if (!excludedOutliers?.size) return 0;
        return articles.reduce(
          (count, row) => count + (excludedOutliers.has(row.article) ? 1 : 0),
          0,
        );
      }, [articles, excludedOutliers]);

      const hasExcluded = excludedCount > 0;
      const showExcludedOnly = hasExcluded && excludedOnly;

      const displayedArticles = useMemo(() => {
        if (!showExcludedOnly) return articles;
        return articles.filter(
          (row) => excludedOutliers?.has(row.article) ?? false,
        );
      }, [articles, showExcludedOnly, excludedOutliers]);

      return (
        <div className={`FilteredArticlesSidebar ${isOpen ? "is-open" : ""}`}>
          <button
            type="button"
            className="Toggle"
            onClick={onToggle}
            aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          >
            <span className="Icon">
              {isOpen ? <GoTriangleRight /> : <GoTriangleLeft />}
            </span>
            <span className="Count">{articles.length}</span>
          </button>
          <div className="Content">
            <div className="Header">
              <div className="HeaderTop">
                <span className="Title">Filtered Articles</span>
                <span className="HeaderActions">
                  <span className="Count">
                    {displayedArticles.length} article
                    {displayedArticles.length !== 1 ? "s" : ""}
                  </span>
                  {showAddButton && (
                    <button
                      type="button"
                      className="AddToggleBtn"
                      onClick={onAddArticleClick}
                      title="Add an article to this topic"
                    >
                      <BsPlusLg />
                      <span>Add</span>
                    </button>
                  )}
                </span>
              </div>
              {hasExcluded && (
                <div className="TrimControls">
                  <label className="TrimFilter">
                    <input
                      type="checkbox"
                      checked={excludedOnly}
                      onChange={(e) => setExcludedOnly(e.target.checked)}
                    />
                    <span>Excluded only ({excludedCount})</span>
                  </label>
                  {onClearOutliers && (
                    <button
                      type="button"
                      className="ClearBtn"
                      onClick={onClearOutliers}
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}
            </div>
            {isOpen && (
              <List
                className="List"
                rowComponent={SidebarRow}
                rowCount={displayedArticles.length}
                rowHeight={ITEM_HEIGHT}
                rowProps={{
                  articles: displayedArticles,
                  wiki,
                  onArticleClick,
                  excludedOutliers,
                  onToggleOutlier,
                  canEdit,
                  onRemoveArticle,
                  removing,
                }}
                overscanCount={10}
                style={{ maxHeight: LIST_HEIGHT }}
              />
            )}
          </div>
        </div>
      );
    },
  );

FilteredArticlesSidebar.displayName = "FilteredArticlesSidebar";

export default FilteredArticlesSidebar;
