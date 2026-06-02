import React, { RefObject, useCallback, useState } from "react";
import { downloadAsTXT } from "../utils/search-utils";
import useOutsideClick from "../hooks/useOutsideClick";

interface WikitextButtonProps<T extends unknown[]> {
  articles: T;
  filteredArticles?: T;
  wikitextConvert: (articles: T) => string;
  filename: string;
}

export default function WikitextButton<T extends unknown[]>({
  articles,
  filteredArticles,
  wikitextConvert,
  filename,
}: WikitextButtonProps<T>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const wrapperRef = useOutsideClick(closeMenu);

  const runExport = (scope: T, suffix: string) => {
    downloadAsTXT(wikitextConvert(scope), `${filename}${suffix}`);
  };

  if (!filteredArticles) {
    return (
      <button onClick={() => runExport(articles, "")} className="ExportButton">
        Export to Wikitext
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
    <div
      className="ExportButtonGroup"
      ref={wrapperRef as RefObject<HTMLDivElement>}
    >
      <button
        type="button"
        className="ExportButton"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        Export to Wikitext
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
