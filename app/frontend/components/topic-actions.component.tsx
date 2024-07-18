// NPM
import _ from 'lodash';
import React from 'react';
import { Link } from "react-router-dom";

// Types

// Components
import TopicAction from './topic-action.component';

// Utils

function renderActions(topic) {
  const output:React.JSX.Element[] = [];
  const actions:String[] = [];
  let proceed = true;

  if (proceed && !topic.users_csv_filename) {
    actions.push('users');
    proceed = false;
  }

  if (proceed && !topic.articles_csv_filename) {
    actions.push('articles');
    proceed = false;
  }

  if (proceed && topic.user_count === 0) {
    actions.push('users');
    proceed = false;
  }

  if (proceed && topic.articles_count === 0) {
    actions.push('articles');
    proceed = false;
  }

  if (topic.user_count > 0 && topic.articles_count > 0 && 
      topic.summaries_count === 0) {
    actions.push('timepoints');
    proceed = false;
  }

  if (proceed) {
    actions.push('timepoints');
    actions.push('users');
    actions.push('articles');
  }

  actions.forEach((action) => {
    output.push(
      <TopicAction
        topic={topic}
        key={action as React.Key}
        actionKey={action}
      />
    )
  })

  return output;
}

function TopicActions({ topic }) {
  return (
    <div className="TopicActions">
      <h4>Management Actions</h4>
      
      <div className="TopicActions-actions">
        {renderActions(topic)}
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