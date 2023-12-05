import _ from 'lodash';

import ChartTimepoint from '../types/chart-timepoint.type';

const ChartUtils = {

  minForChart(timepoints, totalField): number {
    return _.reduce(timepoints, (accum, timepoint) => {
      return Math.min(accum as number, timepoint[totalField] as number);
    }, timepoints[0][totalField] as number);
  },

  maxForChart(timepoints, totalField): number {
    return _.reduce(timepoints, (accum, timepoint) => {
      return Math.max(accum as number, timepoint[totalField] as number);
    }, timepoints[0][totalField] as number);
  },

  prepValues(options): values {
    const { timepoints, attributedDeltaField,
            deltaField, totalField } = options;
    
    const values: ChartTimepoint[] = [];

    let attributedCounter = 0;
    let unattributedCounter = 0;

    timepoints.forEach((timepoint) => {
      attributedCounter += Math.max(0, timepoint[attributedDeltaField]);
      unattributedCounter += Math.max(0, timepoint[deltaField] - timepoint[attributedDeltaField]);

      values.push({
        date: timepoint.timestamp,
        value: unattributedCounter,
        type: 'Unattributed'
      });

      values.push({
        date: timepoint.timestamp,
        value: attributedCounter,
        type: 'Attributed'
      });
    })

    return values;
  },

  fieldsForStat(stat: String) {
    switch(stat) {
      case 'articles':
        return {
          totalField: 'articles_count',
          deltaField: 'articles_count_delta',
          attributedDeltaField: 'attributed_articles_created_delta'
        }
        break;
      case 'revisions':
        return {
          totalField: 'revisions_count',
          deltaField: 'revisions_count_delta',
          attributedDeltaField: 'attributed_revisions_count_delta'
        }
        break;
      case 'length':
        return {
          totalField: 'length',
          deltaField: 'length_delta',
          attributedDeltaField: 'attributed_length_delta'
        }
        break;
      case 'tokens':
        return {
          totalField: 'token_count',
          deltaField: 'token_count_delta',
          attributedDeltaField: 'attributed_token_count'
        }
        break;
      case 'wp10':
        return {
          totalField: 'average_wp10_prediction',
          deltaField: 'articles_count_delta',
          attributedDeltaField: 'attributed_articles_created_delta',
        }
        break;
    }
  }
}

export default ChartUtils;