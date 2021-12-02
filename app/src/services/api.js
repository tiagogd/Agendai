import axios from 'axios';

const api = axios.create({
  baseURL: '', //endereço do back-end
});

export default api;
