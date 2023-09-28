import _ from 'lodash';
import React from 'react';
import { useLoaderData } from "react-router-dom";

import Topic from '../types/topic.type';
import TopicPreview from './topic-preview.component';

function TopicIndex() {
  const { topics } = useLoaderData() as { topics: Array<Topic> };

  return (
    <section className="Section u-lg-pr05">
      <div className="Container Container--padded">
        <div className="TopicIndex">
          {topics.map(topic => (
            <TopicPreview key={topic.id} topic={topic} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default TopicIndex;