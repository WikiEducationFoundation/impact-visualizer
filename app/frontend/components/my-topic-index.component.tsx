import _ from 'lodash';
import React from 'react';
import { useLoaderData, Link } from "react-router-dom";

import Topic from '../types/topic.type';
import TopicPreview from './topic-preview.component';

function MyTopicIndex() {
  const { topics } = useLoaderData() as { topics: Array<Topic> };

  const filteredTopics = _.filter(topics, (topic): Boolean => {
    return !!(topic.name && topic.slug && topic.start_date);
  }) as Array<Topic>;

  return (
    <section className="Section u-lg-pr05">
      <div className="Container Container--padded">
        <div className="u-mb2">
          <Link
            className="Button"
            to="/my-topics/new"
          >
            Create a New Topic
          </Link>
        </div>
        <div className="TopicIndex">
          {filteredTopics.map(topic => (
            <TopicPreview key={topic.id} topic={topic} />
          ))}
          {filteredTopics.length === 0 &&
            <div className="TopicIndex-noResults">
              You have no topics yet.
              {' '}
              <Link to="/my-topics/new">Create one now</Link>.
            </div>
          }
        </div>
      </div>
    </section>
  );
}

export default MyTopicIndex;