import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from './App';
import { api } from './lib/api';

vi.mock('axios', () => ({ default: { get: vi.fn().mockResolvedValue({ data: [] }), create: () => ({ get: vi.fn(), post: vi.fn() }) } }));
vi.mock('./lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() }, errorMessage: e => e.message }));
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  api.get.mockImplementation(path => path === '/me' ? Promise.reject(new Error('Please log in')) : Promise.resolve({ data: [] }));
});
afterEach(cleanup);
it('opens the existing barber homepage from the application entry', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: /Your barber/ })).toBeTruthy();
  expect(screen.queryByText('Student Management System')).toBeNull();
});
it('redirects an anonymous direct profile visit to login', async () => {
  window.history.replaceState({}, '', '/profile');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeTruthy();
});
it('blocks customers from the shop management route', async () => {
  window.history.replaceState({}, '', '/services');
  api.get.mockImplementation(path => Promise.resolve({ data: path === '/me' ? { name: 'Customer', role: 'customer' } : { items: [], counts: {}, total: 0 } }));
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeTruthy();
});
