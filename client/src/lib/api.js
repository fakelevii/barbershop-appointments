import axios from 'axios';
export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 15000 });
export function errorMessage(error) { return error.response?.data?.message || 'Unable to reach the server. Please try again.'; }
export function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date()); }
export function displayDate(value) { return new Intl.DateTimeFormat('en-PH', { timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short' }).format(new Date(value)); }
