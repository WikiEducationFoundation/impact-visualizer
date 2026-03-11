import React, { useEffect, useState } from "react";
import { FaArrowRight } from "react-icons/fa6";
import { FiExternalLink } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import Spinner from "./spinner.component";
import type { ArticleAnalytics } from "../types/bubble-chart.type";
import { getWikiUrl } from "../utils/search-utils";
import {
  computeWordFrequencies,
  PEACOCK_TERMS,
} from "../utils/word-cloud-utils";

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

const contributions = [
  "Add reliable, high-quality sources",
  "Improve the lead section by adding some information",
  "Remove the warning tags",
  "Add internal and external links thoughtfully",
  "When appropriate, add some images",
  "Copyedit for clarity and consistency",
];

function ArticleDetailPanel({
  article,
  wiki,
  onClose,
}: {
  article: ArticleRow;
  wiki?: Wiki;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "peacock">("all");
  const [words, setWords] = useState<{ word: string; count: number }[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);

  useEffect(() => {
    setLoadingWords(true);
    setWords([]);
    const lang = wiki?.language ?? "en";
    const project = wiki?.project ?? "wikipedia";
    const url =
      `https://${lang}.${project}.org/w/api.php?` +
      `action=query&prop=extracts&explaintext=true&exsectionformat=plain` +
      `&titles=${encodeURIComponent(article.article)}&format=json&origin=*`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const pages = data?.query?.pages ?? {};
        const page = Object.values(pages)[0] as any;
        const extract: string = page?.extract ?? "";
        setWords(computeWordFrequencies(extract));
      })
      .catch(() => setWords([]))
      .finally(() => setLoadingWords(false));
  }, [article.article, wiki]);

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
      className="ArticleDetailPanelBackdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ArticleDetailPanel">
        <div className="ArticleDetailPanelHeader">
          <h3 className="ArticleDetailPanelTitle">
            {article.article}
            <a
              href={wikiUrl}
              target="_blank"
              rel="noreferrer"
              className="ArticleDetailPanelTitleLink"
              aria-label="Open on Wikipedia"
            >
              <FiExternalLink size={18} />
            </a>
          </h3>
          <button
            className="ArticleDetailPanelClose"
            onClick={onClose}
            aria-label="Close"
          >
            <IoClose size={28} />
          </button>
        </div>

        <div className="ArticleDetailPanelBody">
          <div className="ArticleDetailInfo">
            <div className="ArticleDetailInfoHeader">Article information</div>
            <div className="ArticleDetailColBody">
              <div className="ArticleDetailInfoSection">
                <div className="ArticleDetailInfoSectionTitle">General</div>
                <div className="ArticleDetailInfoRow">
                  <span className="ArticleDetailInfoLabel">Instance</span>
                  <span className="ArticleDetailInfoValue">
                    {instanceLabel}
                  </span>
                </div>
                <div className="ArticleDetailInfoRow">
                  <span className="ArticleDetailInfoLabel">Creation date</span>
                  <span className="ArticleDetailInfoValue">
                    {formattedDate}
                  </span>
                </div>
                <div className="ArticleDetailInfoRow">
                  <span className="ArticleDetailInfoLabel">Restriction</span>
                  <span className="ArticleDetailInfoValue">
                    {restrictionLabel}
                  </span>
                </div>
              </div>

              <div className="ArticleDetailInfoSection">
                <div className="ArticleDetailInfoSectionTitle">
                  Qualitative information
                </div>
                <div className="ArticleDetailInfoRow">
                  <span className="ArticleDetailInfoLabel">
                    Quality assessment
                  </span>
                  <span className="ArticleDetailInfoValue">
                    {article.assessment_grade ?? "—"}
                  </span>
                </div>
                <div className="ArticleDetailInfoRow">
                  <span className="ArticleDetailInfoLabel">Warning tags</span>
                  <span className="ArticleDetailInfoValue">
                    {article.warning_tags_count.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="ArticleDetailInfoSection">
                <div className="ArticleDetailInfoSectionTitle">
                  Content data
                </div>
                <div className="ArticleDetailInfoRow">
                  <span className="ArticleDetailInfoLabel">
                    Article size (in byte)
                  </span>
                  <span className="ArticleDetailInfoValue">
                    {article.article_size.toLocaleString()}
                  </span>
                </div>
                <div className="ArticleDetailInfoRow">
                  <span className="ArticleDetailInfoLabel">
                    Lead section size (in byte)
                  </span>
                  <span className="ArticleDetailInfoValue">
                    {article.lead_section_size.toLocaleString()}
                  </span>
                </div>
                <div className="ArticleDetailInfoRow">
                  <span className="ArticleDetailInfoLabel">
                    Discussion size (in byte)
                  </span>
                  <span className="ArticleDetailInfoValue">
                    {article.talk_size.toLocaleString()}
                  </span>
                </div>
                <div className="ArticleDetailInfoRow">
                  <span className="ArticleDetailInfoLabel">Images</span>
                  <span className="ArticleDetailInfoValue">
                    {article.images_count.toLocaleString()}
                  </span>
                </div>
                <div className="ArticleDetailInfoRow">
                  <span className="ArticleDetailInfoLabel">
                    Linguistic versions
                  </span>
                  <span className="ArticleDetailInfoValue">
                    {article.linguistic_versions_count.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="ArticleDetailInfoSection">
                <div className="ArticleDetailInfoSectionTitle">
                  User engagement data
                </div>
                <div className="ArticleDetailInfoRow">
                  <span className="ArticleDetailInfoLabel">
                    Avg daily views
                  </span>
                  <span className="ArticleDetailInfoValue">
                    {article.average_daily_views.toLocaleString()}
                  </span>
                </div>
                <div className="ArticleDetailInfoRow">
                  <span className="ArticleDetailInfoLabel">
                    Avg daily views (prev. year)
                  </span>
                  <span className="ArticleDetailInfoValue">
                    {article.prev_average_daily_views != null
                      ? article.prev_average_daily_views.toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="ArticleDetailInfoRow">
                  <span className="ArticleDetailInfoLabel">Editors</span>
                  <span className="ArticleDetailInfoValue">
                    {article.number_of_editors.toLocaleString()}
                  </span>
                </div>
                <div className="ArticleDetailInfoRow">
                  <span className="ArticleDetailInfoLabel">Incoming links</span>
                  <span className="ArticleDetailInfoValue">
                    {article.incoming_links_count.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="ArticleDetailContent">
            <div className="ArticleDetailContentHeader">
              <span className="ArticleDetailContentTitle">
                Content analysis
              </span>
              <span className="ArticleDetailContentSubtitle">
                | Terms occurring more frequently
              </span>
            </div>
            <div className="ArticleDetailContentTabs">
              <button
                className={`ArticleDetailContentTab${activeTab === "all" ? " is-active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                All terms
              </button>
              <button
                className={`ArticleDetailContentTab${activeTab === "peacock" ? " is-active" : ""}`}
                onClick={() => setActiveTab("peacock")}
              >
                Peacock terms
              </button>
            </div>
            <div className="ArticleDetailColBody">
              <div className="ArticleDetailWordCloud">
                {loadingWords && (
                  <div className="ArticleDetailWordCloudSpinner">
                    <Spinner size="large" />
                  </div>
                )}
                {!loadingWords && displayedWords.length === 0 && (
                  <span className="ArticleDetailWordCloudMessage">
                    No terms found.
                  </span>
                )}
                {!loadingWords &&
                  displayedWords.map(({ word, count }) => (
                    <span
                      key={word}
                      className="ArticleDetailWordCloudWord"
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

          <div className="ArticleDetailContrib">
            <div className="ArticleDetailContribSectionHeader">
              Contribution
            </div>
            <div className="ArticleDetailColBody">
              <div className="ArticleDetailContribHeader">
                You can contribute to increase the quality of this article.
              </div>
              <ul className="ArticleDetailContribList">
                {contributions.map((item) => (
                  <li key={item} className="ArticleDetailContribItem">
                    <FaArrowRight
                      size={12}
                      className="ArticleDetailContribArrow"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArticleDetailPanel;
