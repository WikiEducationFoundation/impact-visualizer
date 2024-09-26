// NPM
import _ from 'lodash';
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

// Components
import TopicPreview from './topic-preview.component';
import Spinner from './spinner.component';

// Types
import Topic from '../types/topic.type';

// Services
import TopicService from '../services/topic.service';

function MyTopicIndex() {
  const { status, data: topics } = useQuery({
    queryKey: ['my-topics'],
    queryFn: TopicService.getAllOwnedTopics
  });

  const filteredTopics = _.filter(topics, (topic): Boolean => {
    return !!(topic.name && topic.slug);
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
          {status === 'pending' && <Spinner />}

          {filteredTopics.map(topic => (
            <TopicPreview key={topic.id} topic={topic} />
          ))}
          {filteredTopics.length === 0 && status !== 'pending' &&
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
