// Serverless function — proxies subscribe requests to Substack.

const PUBLICATIONS = {
  kellyvohs: 'https://kellyvohs.substack.com/api/v1/free',
  vohs: 'https://vohs.substack.com/api/v1/free'
};

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const { email, publication } = req.body || {};
  const url = PUBLICATIONS[publication];

  if (!email || !url) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ status: 'error', message: 'Email and valid publication are required' });
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email }).toString(),
      redirect: 'manual'
    });

    if (response.status < 400) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ status: 'ok' });
    }

    throw new Error(`Substack returned ${response.status}`);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(502).json({ status: 'error', message: err.message });
  }
}
