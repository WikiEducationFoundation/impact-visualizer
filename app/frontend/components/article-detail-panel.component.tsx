import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaArrowRight } from "react-icons/fa6";
import { FiExternalLink } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { BsTrash } from "react-icons/bs";
import Spinner from "./spinner.component";
import type { ArticleAnalytics } from "../types/bubble-chart.type";
import { getWikiUrl } from "../utils/search-utils";
import {
  fetchArticleWordFrequencies,
  PEACOCK_TERMS,
} from "../utils/word-cloud-utils";
import {
  fetchArticleNeeds,
  MICROTASK_GENERATOR_NAME,
  MICROTASK_GENERATOR_URL,
} from "../utils/article-quality-utils";

type Wiki = {
  language: string;
  project: string;
};

export type ArticleRow = {
  article: string;
  assessment_grade_color: string;
  protection_summary: string;
  has_move_restriction: boolean;
  has_edit_restriction: boolean;
} & ArticleAnalytics;

function ArticleDetailPanel({
  article,
  wiki,
  onClose,
  canEdit = false,
  onRemove,
  removing = false,
}: {
  article: ArticleRow;
  wiki?: Wiki;
  onClose: () => void;
  canEdit?: boolean;
  onRemove?: (title: string) => void;
  removing?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "peacock">("all");
  const lang = wiki?.language ?? "en";
  const project = wiki?.project ?? "wikipedia";
  const isWikipedia = project === "wikipedia";

  const { data: words = [], isLoading: loadingWords } = useQuery({
    queryKey: ["articleWordFrequencies", lang, project, article.article],
    queryFn: () => fetchArticleWordFrequencies(article.article, lang, project),
    staleTime: 60 * 60 * 1000,
  });

  const { data: needs = [], isLoading: loadingNeeds } = useQuery({
    queryKey: ["articleNeeds", lang, article.article],
    queryFn: () => fetchArticleNeeds(article.article, lang),
    enabled: isWikipedia,
    staleTime: 60 * 60 * 1000,
  });

  const displayedWords =
    activeTab === "peacock"
      ? words.filter((w) => PEACOCK_TERMS.has(w.word))
      : words;

  const maxCount = displayedWords[0]?.count ?? 1;

  const instanceLabel = wiki ? `${wiki.language}.${wiki.project}` : "—";

  const formattedDate = (() => {
    if (!article.publication_date) return "—";
    const d = new Date(article.publication_date);
    if (isNaN(d.getTime())) return article.publication_date;
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  })();

  const restrictionLabel = (() => {
    const parts: string[] = [];
    if (article.has_move_restriction) parts.push("move");
    if (article.has_edit_restriction) parts.push("edit");
    return parts.length > 0 ? parts.join(", ") : "no restriction";
  })();

  const wikiUrl = getWikiUrl(article.article, {
    language: wiki?.language,
    project: wiki?.project,
  });

  return (
    <div
      className="ArticleDetail"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="Panel">
        <div className="Header">
          <h3 className="Title">
            {article.article}
            <a
              href={wikiUrl}
              target="_blank"
              rel="noreferrer"
              className="TitleLink"
              aria-label="Open on Wikipedia"
            >
              <FiExternalLink size={18} />
            </a>
          </h3>
          {canEdit && onRemove && (
            <button
              type="button"
              className="RemoveBtn"
              onClick={() => onRemove(article.article)}
              disabled={removing}
              title="Remove this article from the topic"
            >
              <BsTrash size={14} aria-hidden="true" />
              <span>Remove from topic</span>
            </button>
          )}
          <button className="Close" onClick={onClose} aria-label="Close">
            <IoClose size={28} />
          </button>
        </div>

        <div className="Body">
          <div className="Info">
            <div className="Header">Article information</div>
            <div className="ColBody">
              <div className="Section">
                <div className="Title">General</div>
                <div className="Row">
                  <span className="Label">Instance</span>
                  <span className="Value">{instanceLabel}</span>
                </div>
                <div className="Row">
                  <span className="Label">Creation date</span>
                  <span className="Value">{formattedDate}</span>
                </div>
                <div className="Row">
                  <span className="Label">Restriction</span>
                  <span className="Value">{restrictionLabel}</span>
                </div>
              </div>

              <div className="Section">
                <div className="Title">Qualitative information</div>
                <div className="Row">
                  <span className="Label">Quality assessment</span>
                  <span className="Value">
                    {article.assessment_grade ?? "—"}
                  </span>
                </div>
                <div className="Row">
                  <span className="Label">Centrality</span>
                  <span className="Value">
                    {article.centrality != null
                      ? article.centrality.toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="Row">
                  <span className="Label">Warning tags</span>
                  <span className="Value">
                    {article.warning_tags_count != null
                      ? article.warning_tags_count.toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="Section">
                <div className="Title">Content data</div>
                <div className="Row">
                  <span className="Label">Article size (in byte)</span>
                  <span className="Value">
                    {article.article_size != null
                      ? article.article_size.toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="Row">
                  <span className="Label">Lead section size (in byte)</span>
                  <span className="Value">
                    {article.lead_section_size != null
                      ? article.lead_section_size.toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="Row">
                  <span className="Label">Discussion size (in byte)</span>
                  <span className="Value">
                    {article.talk_size != null
                      ? article.talk_size.toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="Row">
                  <span className="Label">Images</span>
                  <span className="Value">
                    {article.images_count != null
                      ? article.images_count.toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="Row">
                  <span className="Label">Linguistic versions</span>
                  <span className="Value">
                    {article.linguistic_versions_count != null
                      ? article.linguistic_versions_count.toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="Section">
                <div className="Title">User engagement data</div>
                <div className="Row">
                  <span className="Label">Avg daily views</span>
                  <span className="Value">
                    {article.average_daily_views != null
                      ? article.average_daily_views.toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="Row">
                  <span className="Label">Avg daily views (prev. year)</span>
                  <span className="Value">
                    {article.prev_average_daily_views != null
                      ? article.prev_average_daily_views.toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="Row">
                  <span className="Label">Editors</span>
                  <span className="Value">
                    {article.number_of_editors != null
                      ? article.number_of_editors.toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="Row">
                  <span className="Label">Incoming links</span>
                  <span className="Value">
                    {article.incoming_links_count != null
                      ? article.incoming_links_count.toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="Content">
            <div className="Header">
              <span className="Title">Content analysis</span>
              <span className="Subtitle">
                | Terms occurring more frequently
              </span>
            </div>
            <div className="Tabs">
              <button
                className={`Tab${activeTab === "all" ? " is-active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                All terms
              </button>
              <button
                className={`Tab${activeTab === "peacock" ? " is-active" : ""}`}
                onClick={() => setActiveTab("peacock")}
              >
                Peacock terms
              </button>
            </div>
            <div className="ColBody">
              <div className="WordCloud">
                {loadingWords && (
                  <div className="SpinnerWrap">
                    <Spinner size="large" />
                  </div>
                )}
                {!loadingWords && displayedWords.length === 0 && (
                  <span className="Message">No terms found.</span>
                )}
                {!loadingWords &&
                  displayedWords.map(({ word, count }) => (
                    <span
                      key={word}
                      className="Word"
                      style={{
                        fontSize: `${0.75 + Math.pow(count / maxCount, 0.5) * 2.75}rem`,
                      }}
                    >
                      {word}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <div className="Contrib">
            <div className="SectionHeader">Contribution</div>
            <div className="ColBody">
              <div className="Header">
                You can contribute to increase the quality of this article.
              </div>
              {loadingNeeds && (
                <div className="SpinnerWrap">
                  <Spinner size="large" />
                </div>
              )}
              {!loadingNeeds && !isWikipedia && (
                <span className="Message">
                  Contribution suggestions are available for Wikipedia articles
                  only.
                </span>
              )}
              {!loadingNeeds && isWikipedia && needs.length === 0 && (
                <span className="Message">
                  No specific improvements suggested for this article.
                </span>
              )}
              {!loadingNeeds && isWikipedia && needs.length > 0 && (
                <ul className="List">
                  {needs.map((item) => (
                    <li key={item} className="Item">
                      <FaArrowRight size={12} className="Arrow" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {!loadingNeeds && isWikipedia && (
                <div className="Credit">
                  Suggestions based on the Wikimedia{" "}
                  <a
                    href={MICROTASK_GENERATOR_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {MICROTASK_GENERATOR_NAME}
                  </a>{" "}
                  tool.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArticleDetailPanel;
