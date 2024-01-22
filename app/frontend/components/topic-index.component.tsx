import _ from 'lodash';
import React from 'react';
import { useLoaderData } from "react-router-dom";

import Topic from '../types/topic.type';
import TopicPreview from './topic-preview.component';

function TopicIndex() {
  const { topics } = useLoaderData() as { topics: Array<Topic> };

  const filteredTopics = _.filter(topics, (topic): Boolean => {
    return !!(topic.name && topic.slug && topic.start_date);
  }) as Array<Topic>;

  return (
    <section className="Section u-lg-pr05">
      <div className="Container Container--padded">
        <div className="TopicIndex">
          {filteredTopics.map(topic => (
            <TopicPreview key={topic.id} topic={topic} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default TopicIndex;