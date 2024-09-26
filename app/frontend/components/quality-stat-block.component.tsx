import React, { MouseEventHandler } from 'react';
import _ from 'lodash';
import cn from 'classnames';
import pluralize from 'pluralize';

interface Props {
  stats: object,
  topic: object,
  center?: boolean,
  active?: boolean,
  onSelect?: MouseEventHandler
};

const categoryOrder = ['FA', 'FL', 'A', 'GA', 'B', 'C', 'Start', 'Stub', 'List', 'Missing'];

function QualityStatBlock({ stats, center, active, onSelect, topic }: Props) {

  function renderStats() {
    const output: Array<React.JSX.Element> = [];

    const sortedKeys = _.sortBy(_.keys(stats), (stat) => {
      const index = _.indexOf(categoryOrder, stat);
      return index;
    });

    sortedKeys.push('Missing');

    _.each(sortedKeys, (key) => {
      let count = stats[key];
      if (key === 'Missing') {
        count = topic.missing_articles_count;
      };
      output.push(
        <div
          key={key}
          className={cn({
            "StatBlock-stat": true,
            "StatBlock-stat--quality": true
          })}
        >
          <div className="StatBlock-qualityValue">
            <span>{key}</span> {count} {pluralize('Article', count)}
          </div>
        </div>
      )
    });
    
    return output;
  }

  return (
    <div
      className={cn({
        StatBlock: true,
        'StatBlock--center': center,
        'StatBlock--active': active
      })}
      onClick={onSelect}
    >
      <h3>Predicted Quality</h3>
      {active &&
        <div className="StatBlock-indicator" />
      }

      {renderStats()}
    </div>
  );
}

export default QualityStatBlock;