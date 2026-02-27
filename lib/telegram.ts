const localBotUrl = process.env.TELEGRAM_BOT_LOCAL_URL || 'http://localhost:4000';

export async function send2FACode(telegramId: number, code: string) {
  const response = await fetch(`${localBotUrl}/send-2fa-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramId, code }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'No se pudo enviar el código 2FA');
  }
}

export async function notifyOrderStatus(telegramId: number, orderId: number, status: string) {
  const response = await fetch(`${localBotUrl}/notify-order-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramId, orderId, status }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'No se pudo notificar el cambio de estado');
  }
}