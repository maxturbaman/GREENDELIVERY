import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { telegramId, code } = req.body;

    if (!telegramId || !code) {
      return res.status(400).json({ error: 'Missing telegramId or code' });
    }

    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || 'https://telegram-bot.blck.my';

    const response = await fetch(`${workerUrl}/send-2fa-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telegramId,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send 2FA code');
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Error sending 2FA code:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to send 2FA code' 
    });
  }
}
