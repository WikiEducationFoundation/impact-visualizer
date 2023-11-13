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
import QualityStatDetail from './quality-stat-detail.component';

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
              label: 'Articles Created',
              value: topic.articles_count_delta
            },
            {
              label: `Articles Created by ${editorLabel}`,
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
              label: `Revisions Created by ${editorLabel}`,
              value: topic.attributed_revisions_count_delta
            }
          ]}
        />

        {false &&
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
                label: `Change in Byte Size by ${editorLabel}`,
                value: topic.attributed_length_delta
              }
            ]}
          />
        }

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
              label: `Tokens Created by ${editorLabel}`,
              value: topic.attributed_token_count
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

          {activeStat !== 'wp10' &&
            <StatDetail
              stat={activeStat}
              topic={topic}
              topicTimepoints={topicTimepoints}
            />
          }

          {activeStat === 'wp10' &&
            <QualityStatDetail
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