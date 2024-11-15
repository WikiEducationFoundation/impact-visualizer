import axios from 'axios';
import Qs from 'qs';

export default axios.create({
  baseURL: '/api',
  headers: {
    'Content-type': 'application/json'
  }
});
