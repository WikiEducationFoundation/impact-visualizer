import React, { MouseEventHandler } from 'react';
import _ from 'lodash';
import cn from 'classnames';

interface Props {
  stats: Array<number>,
  center?: boolean,
  active?: boolean,
  onSelect?: MouseEventHandler
};

interface Stat {
  value: number,
  label: string,
  primary?: boolean
}

const categoryOrder = ['FA', 'FL', 'A', 'GA', 'B', 'C', 'Start', 'Stub', 'List'];

function QualityStatBlock({ stats, center, active, onSelect }: Props) {

  function renderStats() {
    const output: Array<React.JSX.Element> = [];

    const sortedKeys = _.sortBy(_.keys(stats), (stat) => {
      const index = _.indexOf(categoryOrder, stat);
      return index;
    });

    _.each(sortedKeys, (key) => {
      output.push(
        <div
          key={key}
          className={cn({
            "StatBlock-stat": true,
            "StatBlock-stat--quality": true
          })}
        >
          <div className="StatBlock-qualityValue">
            <span>{key}</span> {stats[key]} Articles
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