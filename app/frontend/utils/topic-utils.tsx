import _ from 'lodash';
import Topic from '../types/topic.type';

const TopicUtils = {
  formatAttributedArticles(topic: Topic, options?: Object) {
    const percentage = Math.round((topic.attributed_articles_created_delta /
                                   topic.articles_count_delta) * 100);
    
    let formattedPercentage = `${percentage}%`;
    
    if (percentage < 1) {
      formattedPercentage = `<1%`;
    } 

    if (_.get(options, 'percentageOnly')) {
      return formattedPercentage;
    }

    return `${topic.attributed_articles_created_delta.toLocaleString('en-US')} (${formattedPercentage})`;
  },

  formatAttributedRevisions(topic: Topic, options?: Object) {
    const percentage = Math.round((topic.attributed_revisions_count_delta /
                                   topic.revisions_count_delta) * 100);
    
    let formattedPercentage = `${percentage}%`;
    
    if (percentage < 1) {
      formattedPercentage = `<1%`;
    } 

    if (_.get(options, 'percentageOnly')) {
      return formattedPercentage;
    }

    return `${topic.attributed_revisions_count_delta.toLocaleString('en-US')} (${formattedPercentage})`;
  },

  formatAttributedTokens(topic: Topic, options?: Object) {
    const percentage = Math.round((topic.attributed_token_count /
                                   topic.token_count_delta) * 100);
    
    let formattedPercentage = `${percentage}%`;
    
    if (percentage < 1) {
      formattedPercentage = `<1%`;
    } 

    if (_.get(options, 'percentageOnly')) {
      return formattedPercentage;
    }

    return `${topic.attributed_token_count.toLocaleString('en-US')} (${formattedPercentage})`;
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

export default TopicUtils;