import _ from 'lodash';
import { Link } from "react-router-dom";
import moment from 'moment';
import React from 'react';
import pluralize from 'pluralize';

import Topic from '../types/topic.type';
import TopicUtils from '../utils/topic-utils';

function TopicPreview({topic}: {topic: Topic}) {
  const editorLabel = _.upperFirst(pluralize(topic.editor_label, topic.user_count));

  return (
    <Link
      to={`/topics/${topic.id}`}
      className='TopicPreview'
    >
      <div className="TopicPreview-header">
        <h2>
          {topic.name}
        </h2>

        <h3>
          {topic.articles_count.toLocaleString('en-US')} Total Articles
        </h3>
      </div>
      
      <div className="TopicPreview-body">
        <h3 className="u-mb05">
          Focus Period: {moment(topic.start_date).format('MMMM YYYY')}
          {' '}–{' '}
          {topic.end_date ? moment(topic.end_date).format('MMMM YYYY') : moment().format('MMMM YYYY')}
        </h3>
        
        <h4 className="u-mb1">
          {topic.user_count.toLocaleString('en-US')}
          {' '}
          {editorLabel}
        </h4>

        {topic.description &&
          <p className='u-mb1'>
            {topic.description}
          </p>
        }

        <ul className="TopicPreview-stats u-mb1">
          <li className="TopicPreview-stat">
            <div className="TopicPreview-innerStat">
              <div className="TopicPreview-statValue">
                {topic.articles_count_delta.toLocaleString('en-US')}
              </div>
              <div className="TopicPreview-statLabel">
                {pluralize('Article', topic.articles_count_delta)} Created
              </div>
            </div>
            <div className="TopicPreview-innerStat">
              <div className="TopicPreview-statValue">
                {TopicUtils.formatAttributedArticles(topic, { percentageOnly: true })}
              </div>
              <div className="TopicPreview-statLabel">
                Created by {editorLabel}
              </div>
            </div>
          </li>

          <li className="TopicPreview-stat">
            <div className="TopicPreview-innerStat">
              <div className="TopicPreview-statValue">
                {topic.revisions_count_delta.toLocaleString('en-US')}
              </div>
              <div className="TopicPreview-statLabel">
                {pluralize('Revision', topic.revisions_count_delta)} Created
              </div>
            </div>
            <div className="TopicPreview-innerStat">
              <div className="TopicPreview-statValue">
                {TopicUtils.formatAttributedRevisions(topic, { percentageOnly: true })}
              </div>
              <div className="TopicPreview-statLabel">
                Created by {editorLabel}
              </div>
            </div>
          </li>

          <li className="TopicPreview-stat">
            <div className="TopicPreview-innerStat">
              <div className="TopicPreview-statValue">
                {topic.token_count_delta.toLocaleString('en-US')}
              </div>
              <div className="TopicPreview-statLabel">
                {pluralize('Token', topic.token_count_delta)} Created
              </div>
            </div>
            <div className="TopicPreview-innerStat">
              <div className="TopicPreview-statValue">
                {TopicUtils.formatAttributedTokens(topic, { percentageOnly: true })}
              </div>
              <div className="TopicPreview-statLabel">
                Created by {editorLabel}
              </div>
            </div>
          </li>
        </ul>

        <div className="Button">
          Learn More
        </div>
      </div>

    </Link>
  );
}

export default TopicPreview;