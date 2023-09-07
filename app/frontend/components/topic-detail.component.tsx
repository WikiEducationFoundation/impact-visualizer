import _ from 'lodash';
import React from 'react';
import moment from 'moment';
import { useLoaderData, Link } from "react-router-dom";

import Topic from '../types/topic.type';
import TopicTimepoint from '../types/topic-timepoint.type';

function TopicDetail() {
  const { topic, topicTimepoints } = 
    useLoaderData() as { topic: Topic, topicTimepoints: Array<TopicTimepoint> };

  function renderTopicTimepoints() {
    return topicTimepoints.map((timepoint : TopicTimepoint) => {
      return (
        <div
          key={timepoint.id}
          className='TopicTimepoint'
        >
          <h3>
            {moment(timepoint.timestamp).format('L')}
          </h3>
          <ul>
            <li>articles_count: {timepoint.articles_count}</li>
            <li>articles_count_delta: {timepoint.articles_count_delta}</li>
            <li>attributed_articles_created_delta: {timepoint.attributed_articles_created_delta}</li>
            <li>attributed_length_delta: {timepoint.attributed_length_delta}</li>
            <li>attributed_revisions_count_delta: {timepoint.attributed_revisions_count_delta}</li>
            <li>attributed_token_count: {timepoint.attributed_token_count}</li>
            <li>average_wp10_prediction: {timepoint.average_wp10_prediction}</li>
            <li>length: {timepoint.length}</li>
            <li>length_delta: {timepoint.length_delta}</li>
            <li>revisions_count: {timepoint.revisions_count}</li>
            <li>revisions_count_delta: {timepoint.revisions_count_delta}</li>
            <li>timestamp: {timepoint.timestamp}</li>
            <li>token_count: {timepoint.token_count}</li>
            <li>token_count_delta: {timepoint.token_count_delta}</li>
          </ul>
        </div>
      );
    })
  };

  return (
    <section className="Section">
      <div className="Container Container--padded">
        <div className='TopicDetail'>
          <Link to='/'>← Back to all Topics</Link>

          <h1 className='u-mt1'>
            {topic.name}
          </h1>

          <ul>
            <li>
              Date range: 
              {' '}
              {moment(topic.start_date).format('L')}
              {' '}–{' '}
              {topic.end_date ? moment(topic.end_date).format('L') : 'now'}
            </li>
            <li>Articles count: {topic.articles_count}</li>
            <li>Articles count delta: {topic.articles_count_delta}</li>
            <li>Attributed articles created delta: {topic.attributed_articles_created_delta}</li>
            <li>Attributed length delta: {topic.attributed_length_delta}</li>
            <li>Attributed revisions count delta: {topic.attributed_revisions_count_delta}</li>
            <li>Attributed token count: {topic.attributed_token_count}</li>
            <li>Average wp10 prediction: {topic.average_wp10_prediction}</li>
            <li>Length: {topic.length}</li>
            <li>Length delta: {topic.length_delta}</li>
            <li>Revisions count: {topic.revisions_count}</li>
            <li>Revisions count delta: {topic.revisions_count_delta}</li>
            <li>Token count: {topic.token_count}</li>
            <li>Token count delta: {topic.token_count_delta}</li>
          </ul>
        </div>

        <div className='TopicTimepoints'>
          {renderTopicTimepoints()}
        </div>
      </div>
    </section>
  );
}

export default TopicDetail;