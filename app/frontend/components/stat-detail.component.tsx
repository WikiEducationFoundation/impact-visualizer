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
  topicTimepoints: Array<TopicTimepoint>
};

function StatDetail({ topicTimepoints, fields, stat }: Props) {
  const { totalField, deltaField, attributedDeltaField } = fields;

  let values: ChartTimepoint[] = [];
  let yLabel: string = '';

  const min = ChartUtils.minForChart(topicTimepoints, totalField);
  const max = ChartUtils.maxForChart(topicTimepoints, totalField);

  if (stat === 'wp10') {
    yLabel = 'Predicted Quality';
    values = ChartUtils.prepQualityValues({
      timepoints: topicTimepoints
    });
  } else {
    yLabel = _.startCase(totalField);
    values = ChartUtils.prepValues({
      timepoints: topicTimepoints,
      deltaField,
      totalField,
      attributedDeltaField
    });
  }
  
  const spec = ChartSpec.prepare({ values, yLabel, min, max, stat })

  return (
    <div
      className={cn({
        StatDetail: true,
      })}
    >
      <Chart
        spec={spec}
      />
    </div>
  );
}

export default StatDetail;