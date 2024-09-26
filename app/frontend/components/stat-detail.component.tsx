import React from 'react';
import _ from 'lodash';
import cn from 'classnames';

import Topic from '../types/topic.type';
import StatFields from '../types/stat-fields.type';
import TopicTimepoint from '../types/topic-timepoint.type';
import ChartTimepoint from '../types/chart-timepoint.type';

import Chart from './chart.component';
import ChartUtils from '../utils/chart-utils';
import ChartSpec from '../utils/chart-spec';

interface Props {
  stat: string,
  fields: StatFields,
  topic: Topic,
  type: string,
  topicTimepoints: Array<TopicTimepoint>
};

function StatDetail({ topicTimepoints, fields, stat, type, topic }: Props) {
  const { totalField, deltaField, attributedDeltaField } = fields;

  if (topicTimepoints.length === 0) {
    return null;
  }

  let values: ChartTimepoint[] = [];
  let yLabel: string = '';
  let min: number = 0;
  let max: number = 0;
  let title: string = '';

  if (stat === 'wp10') {
    yLabel = 'Predicted Quality';
    title = `Predicted quality of articles over time`;
    values = ChartUtils.prepQualityValues({
      timepoints: topicTimepoints,
      topic
    });
  } else {
    if (type === 'cumulative') {
      yLabel = _.startCase(totalField);
      title = `Cumulative change to ${_.lowerCase(totalField)}`;
      min = ChartUtils.minForCumulativeChart(topicTimepoints, totalField);
      max = ChartUtils.maxForCumulativeChart(topicTimepoints, totalField);
      values = ChartUtils.prepCumulativeValues({
        timepoints: topicTimepoints,
        deltaField,
        totalField,
        attributedDeltaField
      });
    }
    if (type === 'delta') {
      yLabel = _.startCase(`${stat} Created`);
      title = `${_.startCase(stat)} created at each timepoint`;
      min = 0;
      max = ChartUtils.maxForDeltaChart(topicTimepoints, deltaField);
      values = ChartUtils.prepDeltaValues({
        timepoints: topicTimepoints,
        deltaField,
        totalField,
        attributedDeltaField
      });
    }
  }
  
  const spec = ChartSpec.prepare({
    values, yLabel, min, max, stat,
    type, timeUnit: topic.chart_time_unit 
  })

  return (
    <div
      className={cn({
        StatDetail: true,
      })}

      style={{
        border: '1px solid #e2e2e2'
      }}
    > 
      {title &&
        <h2 className="u-mb2">
          {title}
        </h2>
      }
      <Chart
        spec={spec}
      />
    </div>
  );
}

export default StatDetail;