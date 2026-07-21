import React from "react";
import { BsBook, BsImage, BsLink45Deg, BsCheck2 } from "react-icons/bs";
import { MdLegendToggle } from "react-icons/md";
import CSVButton from "./CSV-button.component";
import WikitextButton from "./wikitext-button.component";
import {
  convertAnalyticsToCSV,
  convertAnalyticsToWikitext,
} from "../utils/bubble-chart-utils";

type AnalyticsRows = Parameters<typeof convertAnalyticsToCSV>[0];

export interface ChartToolbarProps {
  articles: AnalyticsRows;
  filteredArticles: AnalyticsRows;
  hasData: boolean;
  linkCopied: boolean;
  onSaveImage: () => void;
  onCopyLink: () => void;
  onOpenLegend: () => void;
  onOpenGlossary: () => void;
}

const ChartToolbar: React.FC<ChartToolbarProps> = ({
  articles,
  filteredArticles,
  hasData,
  linkCopied,
  onSaveImage,
  onCopyLink,
  onOpenLegend,
  onOpenGlossary,
}) => {
  return (
    <div className="TitleRow">
      <h2 className="u-mb0">Article analytics over chosen focus period</h2>
      <CSVButton
        articles={articles}
        filteredArticles={filteredArticles}
        csvConvert={convertAnalyticsToCSV}
        filename="article-analytics"
      />
      <WikitextButton
        articles={articles}
        filteredArticles={filteredArticles}
        wikitextConvert={convertAnalyticsToWikitext}
        filename="article-analytics"
      />
      <button
        type="button"
        className="ShareBtn"
        onClick={onSaveImage}
        disabled={!hasData}
        title="Download the current chart as a PNG with credits"
      >
        <BsImage size={14} aria-hidden="true" />
        <span>Save image</span>
      </button>
      <button
        type="button"
        className="ShareBtn"
        onClick={onCopyLink}
        title="Copy a link to this exact chart view"
      >
        {linkCopied ? (
          <BsCheck2 size={16} aria-hidden="true" />
        ) : (
          <BsLink45Deg size={16} aria-hidden="true" />
        )}
        <span>{linkCopied ? "Copied" : "Copy link"}</span>
      </button>
      <button type="button" className="GlossaryBtn" onClick={onOpenLegend}>
        <MdLegendToggle size={14} />
        <span>Legend</span>
      </button>
      <button type="button" className="GlossaryBtn" onClick={onOpenGlossary}>
        <BsBook size={14} />
        <span>Glossary</span>
      </button>
    </div>
  );
};

export default ChartToolbar;
