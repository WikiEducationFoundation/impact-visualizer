import React, { MouseEventHandler } from 'react';
import _ from 'lodash';
import cn from 'classnames';
import { BsChevronDown } from 'react-icons/bs';

interface Props {
  stats: Array<Stat>,
  center?: boolean,
  active?: boolean,
  onSelect?: MouseEventHandler
};

interface Stat {
  value: string | number,
  label: string,
  primary?: boolean
}

function StatBlock({ stats, center, active, onSelect }: Props) {

  function renderStats() {
    return stats.map((stat: Stat) => {
      return (
        <div
          key={stat.label}
          className={cn({
            "StatBlock-stat": true,
            "StatBlock-stat--primary": stat.primary,
          })}
        >
          <div className="StatBlock-statValue">
            {stat.value.toLocaleString('en-US')}
          </div>
          <div className="StatBlock-statLabel">
            {stat.label}
          </div>
        </div>
      );
    });
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
      <div className="StatBlock-cue" aria-hidden="true">
        <BsChevronDown />
      </div>
      {active &&
        <div className="StatBlock-indicator" />
      }

      {renderStats()}
    </div>
  );
}

export default StatBlock;