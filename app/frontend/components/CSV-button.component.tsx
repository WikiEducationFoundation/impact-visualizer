import React, { RefObject, useCallback, useState } from "react";
import { downloadAsCSV } from "../utils/search-utils";
import useOutsideClick from "../hooks/useOutsideClick";

interface CSVButtonProps<T extends unknown[]> {
  articles: T;
  filteredArticles?: T;
  csvConvert: (articles: T) => string;
  filename: string;
}

export default function CSVButton<T extends unknown[]>({
  articles,
  filteredArticles,
  csvConvert,
  filename,
}: CSVButtonProps<T>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const wrapperRef = useOutsideClick(closeMenu);

  const runExport = (scope: T, suffix: string) => {
    downloadAsCSV(csvConvert(scope), `${filename}${suffix}`);
  };

  if (!filteredArticles) {
    return (
      <button
        onClick={() => runExport(articles, "")}
        className="ExportButton"
      >
        Export to CSV
      </button>
    );
  }

  const totalCount = articles.length;
  const filteredCount = filteredArticles.length;
  const filteredIsRedundant = filteredCount === totalCount;
  const filteredIsEmpty = filteredCount === 0;
  const filteredDisabled = filteredIsRedundant || filteredIsEmpty;

  let filteredHint: string | undefined;
  if (filteredIsEmpty) filteredHint = "No articles match the current filters";
  else if (filteredIsRedundant) filteredHint = "Same as all articles";

  return (
    <div className="ExportButtonGroup" ref={wrapperRef as RefObject<HTMLDivElement>}>
      <button
        type="button"
        className="ExportButton"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        Export to CSV
        <span className="ExportButtonCaret" aria-hidden="true">
          ▾
        </span>
      </button>
      {menuOpen && (
        <div role="menu" className="ExportButtonMenu">
          <button
            type="button"
            role="menuitem"
            className="ExportButtonMenuItem"
            onClick={() => {
              runExport(articles, "");
              setMenuOpen(false);
            }}
          >
            All articles ({totalCount.toLocaleString()})
          </button>
          <button
            type="button"
            role="menuitem"
            className="ExportButtonMenuItem"
            disabled={filteredDisabled}
            title={filteredHint}
            onClick={() => {
              if (filteredDisabled) return;
              runExport(filteredArticles, "-filtered");
              setMenuOpen(false);
            }}
          >
            Filtered articles ({filteredCount.toLocaleString()})
          </button>
        </div>
      )}
    </div>
  );
}
