import _ from 'lodash';
import React, { useState } from 'react';
import moment from 'moment';
import pluralize from 'pluralize';
import { useLoaderData, Link } from "react-router-dom";

import Topic from '../types/topic.type';
import TopicTimepoint from '../types/topic-timepoint.type';
import StatBlock from './stat-block.component';
import StatDetail from './stat-detail.component';
import SankeyStatDetail from './sankey-stat-detail.component';

function TopicDetail() {
  const [activeStat, setActiveStat] = useState('articles');

  const { topic, topicTimepoints } = 
    useLoaderData() as { topic: Topic, topicTimepoints: Array<TopicTimepoint> };

  function handleStatSelect(key: string) {
    setActiveStat(key);
  }

  function renderIntro() {
    return (
      <div className='u-mb2'>
        <div className="u-limitWidth50">
          <h1 className='u-mt1 u-h1'>
            {topic.name}
          </h1>
          
          <h3>
            {topic.user_count} Topic {pluralize('Editor', topic.user_count)}
          </h3>

          <h4>
            {moment(topic.start_date).format('MMMM YYYY')}
            {' '}–{' '}
            {topic.end_date ? moment(topic.end_date).format('MMMM YYYY') : moment().format('MMMM YYYY')}
          </h4>

          <p className='u-mb1'>
            {topic.description}
          </p>
        </div>
        <hr />
      </div>
    );
  }

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

  function renderStatBlocks() {
    return (
      <div className='StatBlocks u-mb2'>
        <StatBlock
          active={activeStat === 'articles'}
          onSelect={() => handleStatSelect('articles')}
          stats={[
            {
              label: 'Total Articles',
              value: topic.articles_count,
              primary: true
            },
            {
              label: 'Articles Created',
              value: topic.articles_count_delta
            },
            {
              label: 'Articles Created by Topic Editors',
              value: topic.attributed_articles_created_delta
            }
          ]}
        />

        <StatBlock
          active={activeStat === 'revisions'}
          onSelect={() => handleStatSelect('revisions')}
          stats={[
            {
              label: 'Total Revisions',
              value: topic.revisions_count,
              primary: true
            },
            {
              label: 'Revisions Created',
              value: topic.revisions_count_delta
            },
            {
              label: 'Revisions Created by Topic Editors',
              value: topic.attributed_revisions_count_delta
            }
          ]}
        />

        <StatBlock
          active={activeStat === 'length'}
          onSelect={() => handleStatSelect('length')}
          stats={[
            {
              label: 'Total Byte Size',
              value: topic.length,
              primary: true
            },
            {
              label: 'Change in Byte Size',
              value: topic.length_delta
            },
            {
              label: 'Change in Byte Size by Topic Editors',
              value: topic.attributed_length_delta
            }
          ]}
        />

        <StatBlock
          active={activeStat === 'tokens'}
          onSelect={() => handleStatSelect('tokens')}
          stats={[
            {
              label: 'Total Tokens',
              value: topic.token_count,
              primary: true
            },
            {
              label: 'Tokens Created',
              value: topic.token_count_delta
            },
            {
              label: 'Tokens Created by Topic Editors',
              value: topic.attributed_token_count
            }
          ]}
        />

        <StatBlock
          active={activeStat === 'wp10'}
          onSelect={() => handleStatSelect('wp10')}
          center
          stats={[
            {
              label: 'Average wp10 Prediction',
              value: topic.average_wp10_prediction,
              primary: true
            }
          ]}
        />
      </div>
    );
  }

  return (
    <section className="Section">
      <div className="Container Container--padded">
        <div className='TopicDetail'>
          <Link to='/'>← Back to all Topics</Link>

          {renderIntro()}
          {renderStatBlocks()}

          {activeStat !== 'wp10' &&
            <StatDetail
              stat={activeStat}
              topic={topic}
              topicTimepoints={topicTimepoints}
            />
          }

          {activeStat === 'wp10' &&
            <SankeyStatDetail
              stat={activeStat}
              topic={topic}
              topicTimepoints={topicTimepoints}
            />
          }


        </div>
      </div>
    </section>
  );
}

export default TopicDetail;