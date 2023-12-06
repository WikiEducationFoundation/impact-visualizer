import _ from 'lodash';

import ChartTimepoint from '../types/chart-timepoint.type';
import StatFields from '../types/stat-fields.type';

const ChartUtils = {
  categoryOrder: ['FA', 'FL', 'A', 'GA', 'B', 'C', 'Start', 'Stub', 'List'],

  minForCumulativeChart(timepoints, totalField): number {
    return _.reduce(timepoints, (accum, timepoint) => {
      return Math.min(accum as number, timepoint[totalField] as number);
    }, timepoints[0][totalField] as number);
  },

  maxForCumulativeChart(timepoints, totalField): number {
    return _.reduce(timepoints, (accum, timepoint) => {
      return Math.max(accum as number, timepoint[totalField] as number);
    }, timepoints[0][totalField] as number);
  },

  maxForDeltaChart(timepoints, deltaField): number {
    const max = _.maxBy(timepoints, (timepoint) => {
      return timepoint[deltaField] as number;
    });
    return max[deltaField]
  },

  prepCumulativeValues(options): ChartTimepoint[] {
    const { timepoints, attributedDeltaField, deltaField } = options;
    
    const values: ChartTimepoint[] = [];

    let attributedCounter = 0;
    let unattributedCounter = 0;

    timepoints.forEach((timepoint) => {
      attributedCounter += Math.max(0, timepoint[attributedDeltaField]);
      unattributedCounter += Math.max(0, timepoint[deltaField] - timepoint[attributedDeltaField]);

      values.push({
        date: timepoint.timestamp,
        value: unattributedCounter,
        type: 'Other editors'
      });

      values.push({
        date: timepoint.timestamp,
        value: attributedCounter,
        type: 'Our participants'
      });
    })

    return values;
  },

  prepDeltaValues(options): ChartTimepoint[] {
    const { timepoints, attributedDeltaField, deltaField } = options;
    
    const values: ChartTimepoint[] = [];

    timepoints.forEach((timepoint) => {
      const attributed = Math.max(0, timepoint[attributedDeltaField]);
      const unattributed = Math.max(0, timepoint[deltaField] - timepoint[attributedDeltaField]);

      values.push({
        date: timepoint.timestamp,
        value: unattributed,
        type: 'Other editors'
      });

      values.push({
        date: timepoint.timestamp,
        value: attributed,
        type: 'Our participants'
      });
    })

    return values;
  },

  prepQualityValues(options): ChartTimepoint[] {
    const { timepoints } = options;

    const values: Array<ChartTimepoint> = [];
    let categories: Array<string> = [];
    
    timepoints.forEach((timepoint) => {
      categories.push(..._.keys(timepoint.wp10_prediction_categories));
    })

    categories = _.uniq(categories);
    categories = _.sortBy(categories, (category) => {
      const index = _.indexOf(this.categoryOrder, category);
      return index;
    });
    
    timepoints.forEach((timepoint) => {
      categories.forEach((category) => {
        values.push({
          date: timepoint.timestamp,
          count: timepoint.wp10_prediction_categories[category] || 0,
          category: category,
          categoryIndex: _.indexOf(this.categoryOrder, category)
        });
      })
    })

    return values;
  },

  fieldsForStat(stat: String): StatFields {
    if (stat === 'articles') {
      return {
        totalField: 'articles_count',
        deltaField: 'articles_count_delta',
        attributedDeltaField: 'attributed_articles_created_delta'
      }
    }

    if (stat === 'revisions') {
      return {
        totalField: 'revisions_count',
        deltaField: 'revisions_count_delta',
        attributedDeltaField: 'attributed_revisions_count_delta'
      }
    }

    if (stat == 'length') {
      return {
        totalField: 'length',
        deltaField: 'length_delta',
        attributedDeltaField: 'attributed_length_delta'
      }
    }
    
    if (stat == 'tokens') {
      return {
        totalField: 'token_count',
        deltaField: 'token_count_delta',
        attributedDeltaField: 'attributed_token_count'
      }
    }
    
    return {
      totalField: 'average_wp10_prediction',
      deltaField: 'articles_count_delta',
      attributedDeltaField: 'attributed_articles_created_delta',
    }
  }
}

export default ChartUtils;