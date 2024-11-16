import _ from 'lodash';
import { AxiosResponse } from 'axios';
import { FieldValues } from 'react-hook-form';
import queryString from 'query-string';
import Qs from 'qs';

import http from './http-common';
import Topic from '../types/topic.type';
import Classification from '../types/classification.type';
import Wiki from '../types/wiki.type';
import TopicTimepoint from '../types/topic-timepoint.type';


class TopicService {
  getAllClassifications() {
    return http.get<Array<Classification>>('/classifications')
      .then((response: AxiosResponse) => {
        return _.get(response, 'data.classifications');
      })
  }

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

  getTopic(id: number | string) {
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

  getTopicTimepoints(id: number | string) {
    return http.get<Array<TopicTimepoint>>(`/topics/${id}/topic_timepoints`)
      .then((response: AxiosResponse) => {
        return _.get(response, 'data.topic_timepoints');
      })
  }

  createTopic(params: FieldValues) {
    return http.post<Topic>(
      '/topics',
      { topic: params },
      { headers: { 'Content-Type': 'multipart/form-data'} })
      .then((response: AxiosResponse) => {
        return _.get(response, 'data');
      })
  }

  updateTopic(id: number | string, params: FieldValues) {
    return http.put<Topic>(
      `/topics/${id}`,
      { topic: params },
      { 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded'}
      })
      .then((response: AxiosResponse) => {
        return _.get(response, 'data');
      })
  }

  deleteTopic(id: number | string) {
    return http.delete(`/topics/${id}`)
      .then((response: AxiosResponse) => {
        return _.get(response, 'data');
      })
  }

  import_users(id: number | string) {
    return http.get<Topic>(`/topics/${id}/import_users`)
      .then((response: AxiosResponse) => {
        return _.get(response, 'data');
      })
  }

  import_articles(id: number | string) {
    return http.get<Topic>(`/topics/${id}/import_articles`)
      .then((response: AxiosResponse) => {
        return _.get(response, 'data');
      })
  }

  generate_timepoints(id: number | string, params) {
    return http.get<Topic>(`/topics/${id}/generate_timepoints?${queryString.stringify(params)}`)
      .then((response: AxiosResponse) => {
        return _.get(response, 'data');
      })
  }

}

export default new TopicService();
