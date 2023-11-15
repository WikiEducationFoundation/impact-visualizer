import _ from 'lodash';
import Topic from '../types/topic.type';

const TopicUtils = {
  formatAttributedArticles(topic: Topic, options: Object) {
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

  formatAttributedRevisions(topic: Topic, options: Object) {
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

  formatAttributedTokens(topic: Topic, options: Object) {
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
  }
}

export default TopicUtils;