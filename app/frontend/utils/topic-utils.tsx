import _ from 'lodash';
import Topic from '../types/topic.type';
import pluralize from 'pluralize';

const TopicUtils = {
  pluralizeTokenOrWord(topic: Topic, count?: number) {
    let label = 'Token';
    if (topic.convert_tokens_to_words) {
      label = 'Word';
    };
    return pluralize(label, (count || topic.token_count_delta))
  },

  tokenOrWordCount(topic: Topic, count: number)   {
    if (topic.convert_tokens_to_words && topic.tokens_per_word > 0) {
      return Math.round(count / topic.tokens_per_word);
    };
    return count;
  },

  formatAttributedArticles(topic: Topic, options?: Object) {
    const attributedDelta = topic.attributed_articles_created_delta;
    const totalDelta = topic.articles_count_delta;

    const percentage = Math.round((attributedDelta / totalDelta) * 100);
    
    let formattedPercentage = `${percentage}%`;
    
    if (percentage < 1 || isNaN(percentage)) {
      formattedPercentage = `<1%`;
    } 

    if (_.get(options, 'percentageOnly')) {
      return formattedPercentage;
    }

    return `${attributedDelta.toLocaleString('en-US')} (${formattedPercentage})`;
  },

  formatAttributedRevisions(topic: Topic, options?: Object) {
    const percentage = Math.round((topic.attributed_revisions_count_delta /
                                   topic.revisions_count_delta) * 100);
    
    let formattedPercentage = `${percentage}%`;
    
    if (percentage < 1 || isNaN(percentage)) {
      formattedPercentage = `<1%`;
    } 

    if (_.get(options, 'percentageOnly')) {
      return formattedPercentage;
    }

    return `${topic.attributed_revisions_count_delta.toLocaleString('en-US')} (${formattedPercentage})`;
  },

  formatAttributedTokensOrWords(topic: Topic, options?: Object) {
    const attributedDelta = this.tokenOrWordCount(topic, topic.attributed_token_count)
    const totalDelta = this.tokenOrWordCount(topic, topic.token_count_delta);

    const percentage = Math.round((attributedDelta / totalDelta) * 100);
    
    let formattedPercentage = `${percentage}%`;
    
    if (percentage < 1 || isNaN(percentage)) {
      formattedPercentage = `<1%`;
    } 

    if (_.get(options, 'percentageOnly')) {
      return formattedPercentage;
    }

    return `${attributedDelta.toLocaleString('en-US')} (${formattedPercentage})`;
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