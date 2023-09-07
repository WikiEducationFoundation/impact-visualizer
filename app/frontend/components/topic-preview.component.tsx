import _ from 'lodash';
import { Link } from "react-router-dom";
import moment from 'moment';
import React from 'react';

import Topic from '../types/topic.type';

function TopicPreview({topic}: {topic: Topic}) {
  return (
    <div className='TopicPreview'>
      <h2>
        {topic.name}
      </h2>
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
      <Link
        to={`/topics/${topic.id}`}
      >
        See more
      </Link>
    </div>
  );
}

export default TopicPreview;