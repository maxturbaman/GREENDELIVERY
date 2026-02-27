import type { NextApiRequest, NextApiResponse } from 'next';
import { send2FACode } from '../../lib/telegram';

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

    await send2FACode(Number(telegramId), String(code));

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Error sending 2FA code:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to send 2FA code' 
    });
  }
}
