import axios from 'axios';
import util from './util';

const api = axios.create({
  baseURL: '', //endereço do back-end
});

export default api;
