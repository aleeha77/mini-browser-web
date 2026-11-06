const API_BASE = 'http://localhost:3001';

export async function fetchSite(address: string) {
  const res = await fetch(`${API_BASE}/sites/${address}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`404: Address "${address}" does not exist.`);
    }
    throw new Error('Failed to fetch site.');
  }
  return res.json();
}

export async function recordVisit(userId: string, address: string, method: string) {
  await fetch(`${API_BASE}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, address, navigationMethod: method }),
  });
}

export async function fetchHistory(userId: string) {
  const res = await fetch(`${API_BASE}/history/${userId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch history.');
  }
  return res.json();
}