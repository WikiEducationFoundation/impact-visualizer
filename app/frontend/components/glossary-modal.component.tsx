import React from "react";
import { BsBook } from "react-icons/bs";
import { IoClose } from "react-icons/io5";
import { RAW_ASSESSMENT_COLORS } from "../utils/bubble-chart-utils";

type GlossaryTerm = { name: string; def: string; color?: string };
type GlossarySection = {
  title: string;
  intro?: string;
  terms: GlossaryTerm[];
};

const GLOSSARY_SECTIONS: GlossarySection[] = [
  {
    title: "Quality assessment grades",
    intro:
      "Ratings assigned by the Wikipedia community to reflect article quality. May be inconsistent across articles.",
    terms: [
      {
        name: "Featured Article (FA) / Featured List (FL)",
        color: RAW_ASSESSMENT_COLORS.FA,
        def: "Wikipedia's highest quality rating, awarded after in-depth peer review.",
      },
      {
        name: "A-Class",
        color: RAW_ASSESSMENT_COLORS.A,
        def: "Well-organized and essentially complete, reviewed by a WikiProject.",
      },
      {
        name: "Good Article (GA)",
        color: RAW_ASSESSMENT_COLORS.GA,
        def: "Reviewed and confirmed to meet the Good Article criteria, but not yet Featured.",
      },
      {
        name: "B-Class",
        color: RAW_ASSESSMENT_COLORS.B,
        def: "Mostly complete, but still needs work to reach Good Article standards.",
      },
      {
        name: "C-Class",
        color: RAW_ASSESSMENT_COLORS.C,
        def: "Substantial, but missing important content or containing some irrelevant material.",
      },
      {
        name: "Start",
        color: RAW_ASSESSMENT_COLORS.Start,
        def: "Started but still quite incomplete.",
      },
      {
        name: "Stub",
        color: RAW_ASSESSMENT_COLORS.Stub,
        def: "Very short, with only basic information.",
      },
      {
        name: "List",
        color: RAW_ASSESSMENT_COLORS.List,
        def: "Primarily a list of items rather than prose.",
      },
      {
        name: "Unassessed",
        color: RAW_ASSESSMENT_COLORS.Unassessed,
        def: "No quality grade has been assigned yet.",
      },
    ],
  },
  {
    title: "Article metrics",
    terms: [
      {
        name: "Average daily views",
        def: "The average number of times the article is viewed per day over the focus period.",
      },
      {
        name: "Number of editors",
        def: "The count of distinct editors who have contributed to the article.",
      },
      {
        name: "Incoming links",
        def: "The number of other Wikipedia articles that link to this one.",
      },
      {
        name: "Article size",
        def: "The byte size of the article's wikitext content.",
      },
      {
        name: "Lead section size",
        def: "The byte size of the article's introduction (before the table of contents).",
      },
      {
        name: "Talk / Discussion page size",
        def: "The byte size of the article's talk page, where editors discuss changes.",
      },
      {
        name: "Images",
        def: "The number of images embedded in the article.",
      },
      {
        name: "Warning tags",
        def: 'Maintenance tags flagging quality concerns (e.g., "needs citations").',
      },
      {
        name: "Linguistic versions",
        def: "The number of other-language Wikipedias with an article on this topic.",
      },
      {
        name: "Centrality",
        def: "A score (1-10) measuring how central or important an article is to its topic.",
      },
      {
        name: "Publication date",
        def: "The date the article was first created on Wikipedia.",
      },
    ],
  },
  {
    title: "Tags",
    terms: [
      {
        name: "Tag",
        def: "A topic-specific label assigned to articles, used to filter the chart down to a subset of articles.",
      },
    ],
  },
  {
    title: "Page protections",
    intro:
      "Administrative controls applied to high-traffic or contentious pages.",
    terms: [
      {
        name: "Move restriction",
        def: "Prevents the article from being renamed except by administrators.",
      },
      {
        name: "Edit restriction",
        def: "Limits who can edit the article (e.g., semi-protected, extended-confirmed, or fully-protected).",
      },
    ],
  },
];

interface GlossaryModalProps {
  onClose: () => void;
}

const GlossaryModal: React.FC<GlossaryModalProps> = ({ onClose }) => {
  return (
    <div
      className="GlossaryModal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="Panel">
        <div className="Header">
          <div className="TitleGroup">
            <BsBook size={20} className="HeaderIcon" />
            <h3 className="Title">Glossary</h3>
          </div>
          <button
            type="button"
            className="Close"
            onClick={onClose}
            aria-label="Close glossary"
          >
            <IoClose size={24} />
          </button>
        </div>
        <div className="Body">
          {GLOSSARY_SECTIONS.map((section) => (
            <section key={section.title} className="Section">
              <h4 className="SectionTitle">{section.title}</h4>
              {section.intro && <p className="SectionIntro">{section.intro}</p>}
              <dl className="Terms">
                {section.terms.map((t) => (
                  <div key={t.name} className="Term">
                    <dt className="TermName">
                      {t.color && (
                        <span
                          className="TermDot"
                          style={{ backgroundColor: t.color }}
                          aria-hidden="true"
                        />
                      )}
                      <span>{t.name}</span>
                    </dt>
                    <dd className="TermDef">{t.def}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GlossaryModal;
