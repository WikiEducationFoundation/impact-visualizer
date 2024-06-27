// NPM
import _ from 'lodash';
import React from 'react';
import { Link } from "react-router-dom";

// Types

// Components
import TopicAction from './topic-action.component';

// Utils

function TopicActions({ topic }) {
  return (
    <div className="TopicActions">
      <h4>Management Actions</h4>
      
      <div className="TopicActions-actions">
        <TopicAction
          topic={topic}
          actionKey="users"
        />

        <TopicAction
          topic={topic}
          actionKey="articles"
        />

        <TopicAction
          topic={topic}
          actionKey="timepoints"
        />
      </div>

      <div className="TopicActions-finePrint">
        Actions execute the background, you <strong>may</strong> navigate
        away from the page after initiating.
      </div>
      
      <Link
        to={`/my-topics/edit/${topic.id}`}
        className="Button"
      >
        Edit Topic
      </Link>

    </div>
  )
}

export default TopicActions;