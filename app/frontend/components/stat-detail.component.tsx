import React from 'react';
import _ from 'lodash';
import cn from 'classnames';

import Topic from '../types/topic.type';
import TopicTimepoint from '../types/topic-timepoint.type';
import ChartTimepoint from '../types/chart-timepoint.type';

import Chart from './chart.component';
import ChartUtils from '../utils/chart-utils';
import ChartSpec from '../utils/chart-spec';

interface StatFields {
  totalField: string,
  deltaField: string,
  attributedDeltaField: string
}

interface Props {
  fields: StatFields,
  topic: Topic,
  topicTimepoints: Array<TopicTimepoint>
};

function StatDetail({ topicTimepoints, fields }: Props) {
  const { totalField, deltaField, attributedDeltaField } = fields;

  const min = ChartUtils.minForChart(topicTimepoints, totalField);
  const max = ChartUtils.maxForChart(topicTimepoints, totalField);
  
  const values: ChartTimepoint[] = ChartUtils.prepValues({
    timepoints: topicTimepoints,
    deltaField,
    totalField,
    attributedDeltaField
  });

  const yLabel = _.startCase(totalField);

  const spec = ChartSpec.prepare({ values, yLabel, min, max })

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