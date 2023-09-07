import _ from 'lodash';
import { AxiosResponse } from 'axios';

import http from './http-common';
import Topic from '../types/topic.type';
import TopicTimepoint from '../types/topic-timepoint.type';

class TopicDataService {
  getAll() {
    return http.get<Array<Topic>>('/topics')
      .then((response: AxiosResponse) => {
        return _.get(response, 'data.topics');
      })
  }

  get(id: string) {
    return http.get<Topic>(`/topics/${id}`)
      .then((response: AxiosResponse) => {
        return _.get(response, 'data');
      })
  }

  getTopicTimepoints(id: string) {
    return http.get<Array<TopicTimepoint>>(`/topics/${id}/topic_timepoints`)
      .then((response: AxiosResponse) => {
        return _.get(response, 'data.topic_timepoints');
      })
  }
}

export default new TopicDataService();
