import _ from 'lodash';
import React, { useState } from 'react';
import moment from 'moment';
import pluralize from 'pluralize';
import { useLoaderData, Link } from "react-router-dom";

import Topic from '../types/topic.type';
import TopicTimepoint from '../types/topic-timepoint.type';
import StatBlock from './stat-block.component';
import QualityStatBlock from './quality-stat-block.component';
import StatDetail from './stat-detail.component';
import TopicUtils from '../utils/topic-utils';
import ChartUtils from '../utils/chart-utils';

function TopicDetail() {
  const [activeStat, setActiveStat] = useState('articles');

  const { topic, topicTimepoints } = 
    useLoaderData() as { topic: Topic, topicTimepoints: Array<TopicTimepoint> };

  const editorLabel = _.upperFirst(pluralize(topic.editor_label, topic.user_count));

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
          
          <h3 className="u-mb05">
            Focus Period: {moment(topic.start_date).format('MMMM YYYY')}
            {' '}–{' '}
            {topic.end_date ? moment(topic.end_date).format('MMMM YYYY') : moment().format('MMMM YYYY')}
          </h3>
          
          <h4 className="u-mb1">
            {topic.user_count}
            {' '}
            {editorLabel}
          </h4>

          {topic.description &&
            <p className='u-mb1'>
              {topic.description}
            </p>
          }
        </div>
        <hr />
      </div>
    );
  }

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
              label: `${pluralize('Article', topic.articles_count_delta)} Created`,
              value: topic.articles_count_delta
            },
            {
              label: `Articles Created by ${editorLabel}`,
              value: TopicUtils.formatAttributedArticles(topic)
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
              label: `${pluralize('Revision', topic.revisions_count_delta)} Created`,
              value: topic.revisions_count_delta
            },
            {
              label: `Revisions Created by ${editorLabel}`,
              value: TopicUtils.formatAttributedRevisions(topic)
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
              label: `${pluralize('Token', topic.token_count_delta)} Created`,
              value: topic.token_count_delta
            },
            {
              label: `Tokens Created by ${editorLabel}`,
              value: TopicUtils.formatAttributedTokens(topic)
            }
          ]}
        />

        <QualityStatBlock
          active={activeStat === 'wp10'}
          onSelect={() => handleStatSelect('wp10')}
          stats={topic.wp10_prediction_categories}
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

          <StatDetail
            stat={activeStat}
            topic={topic}
            topicTimepoints={topicTimepoints}
            fields={ChartUtils.fieldsForStat(activeStat)}
          />
        </div>
      </div>
    </section>
  );
}

export default TopicDetail;