import _ from "lodash";
import React from "react";
import { Link, Outlet } from "react-router-dom";
import { MdOutlineArrowDropDown } from "react-icons/md";

function Root() {
  return (
    <>
      <header className="Header">
        <div className="Header-container">
          <Link to={"/"}>
            <img className="Header-logo" src="/images/logo.png" alt="WikiEdu" />
          </Link>

          <h1 className="u-h2 u-mr3 Header-title">Visualizing Impact</h1>
          <div className="Header-nav">
            <div className="dropdown">
              <div className="dropbtn u-color-blue">
                Tools <MdOutlineArrowDropDown />
              </div>
              <div className="dropdown-content">
                <Link to="/search/wikidata-tool">Wikidata Tool</Link>
                <Link to="/search/wikipedia-category-tool">
                  Wikipedia Category Tool
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>
      <Outlet />
    </>
  );
}

export default Root;
