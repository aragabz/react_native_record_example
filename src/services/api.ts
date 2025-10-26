import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8083', // Updated to match your curl command
  // timeout: 30000, // Increased timeout for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens, logging, etc.
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    
    console.log('url: ' + config.url)
    console.log('url: ' + config.baseURL)
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors globally
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('Response Error:', error.response?.status, error.message);
    console.error('Response Error:', JSON.stringify(error));
    // Handle common errors
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      console.log('Unauthorized - redirect to login');
    }
    
    return Promise.reject(error);
  }
);

export default api;
export { api };