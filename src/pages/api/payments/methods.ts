import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Forward the request to the backend
  try {
  const backendUrl = 'http://localhost:4000/payments/methods';
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies or auth headers if needed
        ...(req.headers.cookie ? { 'Cookie': req.headers.cookie } : {}),
      },
      credentials: 'include',
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch payment methods' });
  }
}
