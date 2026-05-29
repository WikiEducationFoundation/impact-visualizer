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
      className="ArticleLangComparison"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="Panel">
        <div className="Header">
          <h3 className="Title">{articleTitle}</h3>
          <button
            className="Close"
            onClick={onClose}
            aria-label="Close"
          >
            <IoClose size={28} />
          </button>
        </div>

        <div className="Body">
          {loading && (
            <div className="Loading">
              <Spinner size="large" />
            </div>
          )}

          {error && (
            <div className="Error">
              Failed to load language comparison data.
            </div>
          )}

          {!loading && !error && data && (
            <table className="Table">
              <thead>
                <tr>
                  <th className="MetricHeader" />
                  {languages.map((lang) => {
                    const entry = data[lang];
                    return (
                      <th
                        key={lang}
                        className={`LangHeader${!entry ? " LangHeader--missing" : ""}`}
                      >
                        <span>{LANGUAGE_LABELS[lang] ?? lang} version</span>
                        {entry && (
                          <a
                            href={getWikiUrl(entry.title, { language: lang })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="Link"
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
                    <td className="MetricLabel">
                      {metric.label}
                    </td>
                    {languages.map((lang) => {
                      const entry = data[lang];
                      if (!entry) {
                        return (
                          <td
                            key={lang}
                            className="Cell Cell--missing"
                          >
                            <span className="MissingIcon">
                              <IoCloseCircle size={22} />
                            </span>
                          </td>
                        );
                      }

                      const value = entry[metric.key];
                      const max = maxValues[metric.key] || 1;
                      const barWidth = max > 0 ? (value / max) * 100 : 0;

                      return (
                        <td key={lang} className="Cell">
                          <div className="Inner">
                            <span className="Value">
                              {value.toLocaleString()}
                            </span>
                            <div className="Track">
                              <div
                                className="Bar"
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
                  <td className="MetricLabel" />
                  {languages.map((lang) => {
                    const entry = data[lang];
                    if (entry) {
                      return (
                        <td key={lang} className="Cell" />
                      );
                    }
                    return (
                      <td
                        key={lang}
                        className="Cell Cell--missing Cell--translate"
                      >
                        <a
                          className="TranslateLink"
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
