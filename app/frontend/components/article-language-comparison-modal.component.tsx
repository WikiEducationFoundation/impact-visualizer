import React from "react";
import { FiEdit2, FiExternalLink } from "react-icons/fi";
import { IoClose, IoCloseCircle } from "react-icons/io5";
import { useQuery } from "@tanstack/react-query";
import Spinner from "./spinner.component";
import TopicService from "../services/topic.service";
import type { LangComparisonData } from "../services/topic.service";
import { LANGUAGE_LABELS, getTranslateUrl } from "../utils/language-links";
import type { TargetLanguage } from "../utils/language-links";
import { getWikiUrl } from "../utils/search-utils";

type Wiki = {
  language: string;
  project: string;
};

const METRIC_ROWS: {
  key: keyof Omit<LangComparisonData, "title">;
  label: string;
}[] = [
  { key: "article_size", label: "Article size (in byte)" },
  { key: "lead_section_size", label: "Lead section size (in byte)" },
  { key: "talk_size", label: "Discussion size (in byte)" },
  { key: "images_count", label: "Images" },
  { key: "number_of_editors", label: "Editors" },
  { key: "revisions_count", label: "Edits" },
  { key: "linguistic_versions_count", label: "Total linguistic versions" },
];

interface ArticleLanguageComparisonModalProps {
  articleTitle: string;
  topicId: string | number;
  wiki?: Wiki;
  languages: readonly TargetLanguage[];
  onClose: () => void;
}

function ArticleLanguageComparisonModal({
  articleTitle,
  topicId,
  wiki,
  languages,
  onClose,
}: ArticleLanguageComparisonModalProps) {
  const sourceLang = wiki?.language ?? "en";

  const { data, status, error } = useQuery({
    queryKey: ["langComparison", topicId, articleTitle],
    queryFn: () =>
      TopicService.getArticleLanguageComparison(topicId, articleTitle),
    staleTime: 4 * 60 * 60 * 1000,
    gcTime: 4 * 60 * 60 * 1000,
  });

  const loading = status === "pending";

  const maxValues: Record<string, number> = {};
  if (data) {
    for (const metric of METRIC_ROWS) {
      let max = 0;
      for (const lang of languages) {
        const entry = data[lang];
        if (entry) {
          const val = entry[metric.key];
          if (val > max) max = val;
        }
      }
      maxValues[metric.key] = max;
    }
  }

  return (
    <div
      className="ArticleLangComparisonBackdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ArticleLangComparisonPanel">
        <div className="ArticleLangComparisonHeader">
          <h3 className="ArticleLangComparisonTitle">{articleTitle}</h3>
          <button
            className="ArticleLangComparisonClose"
            onClick={onClose}
            aria-label="Close"
          >
            <IoClose size={28} />
          </button>
        </div>

        <div className="ArticleLangComparisonBody">
          {loading && (
            <div className="ArticleLangComparisonLoading">
              <Spinner size="large" />
            </div>
          )}

          {error && (
            <div className="ArticleLangComparisonError">
              Failed to load language comparison data.
            </div>
          )}

          {!loading && !error && data && (
            <table className="ArticleLangComparisonTable">
              <thead>
                <tr>
                  <th className="ArticleLangComparisonMetricHeader" />
                  {languages.map((lang) => {
                    const entry = data[lang];
                    return (
                      <th
                        key={lang}
                        className={`ArticleLangComparisonLangHeader${!entry ? " ArticleLangComparisonLangHeader--missing" : ""}`}
                      >
                        <span>{LANGUAGE_LABELS[lang] ?? lang} version</span>
                        {entry && (
                          <a
                            href={getWikiUrl(entry.title, { language: lang })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ArticleLangComparisonHeaderLink"
                            aria-label={`Open ${LANGUAGE_LABELS[lang]} version`}
                          >
                            <FiExternalLink size={14} />
                          </a>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {METRIC_ROWS.map((metric) => (
                  <tr key={metric.key}>
                    <td className="ArticleLangComparisonMetricLabel">
                      {metric.label}
                    </td>
                    {languages.map((lang) => {
                      const entry = data[lang];
                      if (!entry) {
                        return (
                          <td
                            key={lang}
                            className="ArticleLangComparisonCell ArticleLangComparisonCell--missing"
                          >
                            <span className="ArticleLangComparisonMissingIcon">
                              <IoCloseCircle size={22} />
                            </span>
                          </td>
                        );
                      }

                      const value = entry[metric.key];
                      const max = maxValues[metric.key] || 1;
                      const barWidth = max > 0 ? (value / max) * 100 : 0;

                      return (
                        <td key={lang} className="ArticleLangComparisonCell">
                          <div className="ArticleLangComparisonCellInner">
                            <span className="ArticleLangComparisonValue">
                              {value.toLocaleString()}
                            </span>
                            <div className="ArticleLangComparisonBarTrack">
                              <div
                                className="ArticleLangComparisonBar"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr>
                  <td className="ArticleLangComparisonMetricLabel" />
                  {languages.map((lang) => {
                    const entry = data[lang];
                    if (entry) {
                      return (
                        <td key={lang} className="ArticleLangComparisonCell" />
                      );
                    }
                    return (
                      <td
                        key={lang}
                        className="ArticleLangComparisonCell ArticleLangComparisonCell--missing ArticleLangComparisonCell--translate"
                      >
                        <a
                          className="ArticleLangComparisonTranslateLink"
                          href={getTranslateUrl(articleTitle, sourceLang, lang)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FiEdit2 size={14} />
                          <span>Translate article</span>
                        </a>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default ArticleLanguageComparisonModal;
