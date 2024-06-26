import _ from 'lodash';
import { AxiosResponse } from 'axios';

import http from './http-common';
import Topic from '../types/topic.type';
import Wiki from '../types/wiki.type';
import TopicTimepoint from '../types/topic-timepoint.type';

class DataService {
  getAllTopics() {
    return http.get<Array<Topic>>('/topics')
      .then((response: AxiosResponse) => {
        return _.get(response, 'data.topics');
      })
  }

  getAllOwnedTopics() {
    return http.get<Array<Topic>>('/topics?owned=true')
      .then((response: AxiosResponse) => {
        return _.get(response, 'data.topics');
      })
  }

  getTopic(id: string) {
    return http.get<Topic>(`/topics/${id}`)
      .then((response: AxiosResponse) => {
        return _.get(response, 'data');
      })
  }

  getAllWikis() {
    return http.get<Wiki>(`/wikis`)
      .then((response: AxiosResponse) => {
        return _.get(response, 'data.wikis');
      })
  }

  getTopicTimepoints(id: string) {
    return http.get<Array<TopicTimepoint>>(`/topics/${id}/topic_timepoints`)
      .then((response: AxiosResponse) => {
        return _.get(response, 'data.topic_timepoints');
      })
  }

  createTopic(params) {
    return http.post<Topic>(
      '/topics',
      { topic: params },
      { headers: { 'Content-Type': 'multipart/form-data'} })
      .then((response: AxiosResponse) => {
        return _.get(response, 'data');
      })
  }
}

export default new DataService();
