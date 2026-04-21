const API_BASE = '/api';

async function fetchAPI(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export async function getCategories() {
  return fetchAPI('/categories');
}

export async function getApps({ category, search, sort, freeOnly, page, limit }) {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (search) params.append('search', search);
  if (sort) params.append('sort', sort);
  if (freeOnly) params.append('free_only', 'true');
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  return fetchAPI(`/apps?${params.toString()}`);
}

export async function getApp(handle) {
  return fetchAPI(`/apps/${handle}`);
}

export async function getStats() {
  return fetchAPI('/stats');
}
