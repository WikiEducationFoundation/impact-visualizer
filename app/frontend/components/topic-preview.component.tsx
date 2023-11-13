import _ from 'lodash';
import { Link } from "react-router-dom";
import moment from 'moment';
import React from 'react';
import pluralize from 'pluralize';

import Topic from '../types/topic.type';

function TopicPreview({topic}: {topic: Topic}) {
  const editorLabel = _.upperFirst(pluralize(topic.editor_label, topic.user_count));

  return (
    <Link
      to={`/topics/${topic.id}`}
      className='TopicPreview'
    >
      <h2>
        {topic.name}
      </h2>
      
      <h3>
        {topic.user_count}
        {' '}
        {editorLabel}
      </h3>

      <h4>
        {moment(topic.start_date).format('MMMM YYYY')}
        {' '}–{' '}
        {topic.end_date ? moment(topic.end_date).format('MMMM YYYY') : moment().format('MMMM YYYY')}
      </h4>

      <p className='u-mb1'>
        {topic.description}
      </p>

      <ul className="TopicPreview-stats u-mb1">
        <li className="TopicPreview-stat">
          <div className="TopicPreview-statValue">
            {topic.articles_count}
          </div>
          <div className="TopicPreview-statLabel">
            Total Articles
          </div>
        </li>

        <li className="TopicPreview-stat">
          <div className="TopicPreview-statValue">
            {topic.revisions_count}
          </div>
          <div className="TopicPreview-statLabel">
            Total Revisions
          </div>
        </li>

        <li className="TopicPreview-stat">
          <div className="TopicPreview-statValue">
            {topic.token_count}
          </div>
          <div className="TopicPreview-statLabel">
            Total Tokens
          </div>
        </li>
      </ul>

      <div className="Button">
        Learn More
      </div>
    </Link>
  );
}

export default TopicPreview;