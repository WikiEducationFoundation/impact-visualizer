import _ from "lodash";
import React from "react";
import { Link, Outlet, ScrollRestoration } from "react-router-dom";
import { MdOutlineArrowDropDown, MdFeedback } from "react-icons/md";

import UserStatus from "./user-status.component";

const SEARCH_TOOLS = [
  {
    path: "/search/wikidata-tool",
    label: "Wikidata Tool",
    short:
      "Find articles by their characteristics, such as people of a given occupation, gender, or nationality, using Wikidata.",
  },
  {
    path: "/search/wikipedia-category-tool",
    label: "Wikipedia Category Tool",
    short:
      "Collect articles by browsing a Wikipedia category and its subcategories.",
  },
  {
    path: "/search/wiki-dashboard-course-tool",
    label: "Education Dashboard Course Tool",
    short:
      "Import the articles edited in a Wiki Education / Programs & Events Dashboard course.",
  },
  {
    path: "/search/wiki-dashboard-user-tool",
    label: "Education Dashboard User Tool",
    short:
      "Import the articles a single editor worked on, from their Dashboard profile.",
  },
  {
    path: "/search/petscan-tool",
    label: "Petscan Tool",
    short:
      "Import a ready-made list of articles from PetScan using its query ID.",
  },
  {
    path: "/search/pagepile-tool",
    label: "Pagepile Tool",
    short: "Import a saved list of pages from PagePile using its ID.",
  },
  {
    path: "/search/user-set-tool",
    label: "User Set Tool",
    short:
      "Get the articles edited by a predefined group of Wiki Education participants.",
  },
];

function Root() {
  return (
    <>
      <header className="Header">
        <div className="Header-container">
          <div className="Header-left">
            <Link to={"/"}>
              <img
                className="Header-logo"
                src="/images/logo.png"
                alt="WikiEdu"
              />
            </Link>

            <Link to={"/"}>
              <h1 className="u-h2 u-mr3 Header-title">Visualizing Impact</h1>
            </Link>

            <div className="Header-nav">
              <div className="dropdown">
                <div className="dropbtn u-color-blue">
                  Tools <MdOutlineArrowDropDown />
                </div>
                <div className="dropdown-content">
                  {SEARCH_TOOLS.map((tool) => (
                    <Link
                      key={tool.path}
                      to={tool.path}
                      className="Dropdown-tool"
                    >
                      <span className="Dropdown-toolName">{tool.label}</span>
                      <span className="Dropdown-toolDesc">{tool.short}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="Header-right">
            <a
              className="Button Button--feedback u-mr1"
              href="https://meta.wikimedia.org/wiki/Talk:Visual_Analytics_for_Sustainability_and_Climate_Change/Tool?action=edit&section=new"
              target="_blank"
              rel="noopener noreferrer"
            >
              Give Feedback
              <MdFeedback className="Button-icon" />
            </a>
            <UserStatus />
          </div>
        </div>
      </header>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

export default Root;
