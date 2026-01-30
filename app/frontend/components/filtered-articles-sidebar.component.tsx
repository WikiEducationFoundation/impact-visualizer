import React from "react";
import { GoTriangleLeft, GoTriangleRight } from "react-icons/go";

interface FilteredArticlesSidebarProps {
  articles: { article: string }[];
  wiki?: { language: string; project: string };
  isOpen: boolean;
  onToggle: () => void;
}

const FilteredArticlesSidebar: React.FC<FilteredArticlesSidebarProps> = ({
  articles,
  wiki,
  isOpen,
  onToggle,
}) => {
  const language = wiki?.language || "en";
  const project = wiki?.project || "wikipedia";

  const getWikiUrl = (articleName: string) =>
    `https://${language}.${project}.org/wiki/${encodeURIComponent(
      articleName.replace(/ /g, "_"),
    )}`;

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
          {articles.map(({ article }) => (
            <li key={article} className="FilteredArticlesSidebarItem">
              <a
                href={getWikiUrl(article)}
                target="_blank"
                rel="noopener noreferrer"
                className="FilteredArticlesSidebarLink"
              >
                {article}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FilteredArticlesSidebar;
