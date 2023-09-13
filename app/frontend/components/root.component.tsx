import _ from 'lodash';
import React from 'react';
import { Outlet } from "react-router-dom";

import TopicIndex from './topic-index.component';

function Root() {
  return (
    <>
      <header className="Header">
        <div className="Header-container">
          <img className="Header-logo" src="/images/logo.png" alt="WikiEdu" />
          <h1 className="u-h2">Visualizing Impact</h1>
        </div>
      </header>
      <Outlet />
    </>
  );
}

export default Root;