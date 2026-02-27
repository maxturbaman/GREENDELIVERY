const express = require('express');
const Database = require('better-sqlite3');

const app = express();
app.use(express.json({ limit: '100kb' }));

const PORT = Number(process.env.TELEGRAM_BOT_PORT || 4000);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DB_PATH = process.env.BOT_DB_PATH || '/app/data/greendelivery.db';
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://gd.blck.my';
const INTERNAL_TOKEN = process.env.TELEGRAM_INTERNAL_TOKEN || '';
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    username TEXT UNIQUE,
    password TEXT,
    first_name TEXT,
    phone TEXT,
    address TEXT,
    approved INTEGER NOT NULL DEFAULT 0,
    role_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total REAL NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

const insertRole = db.prepare('INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)');
insertRole.run(1, 'admin', 'Administrador - Control total');
insertRole.run(2, 'courier', 'Mensajero - Gestión de entregas');
insertRole.run(3, 'customer', 'Cliente - Solo ver sus órdenes');

const sessions = new Map();
let lastUpdateId = 0;
let pollingInProgress = false;

const CUSTOMER_MENU_KEYBOARD = {
  keyboard: [
    [{ text: '🛍️ Nueva orden' }, { text: '🧾 Historial' }],
    [{ text: '❌ Cancelar' }],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
};

function ensureBotToken(res) {
  if (!BOT_TOKEN) {
    res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN no configurado' });
    return false;
  }
  return true;
}

function ensureInternalToken(req, res) {
  if (!INTERNAL_TOKEN) {
    console.warn('[SECURITY] TELEGRAM_INTERNAL_TOKEN no configurado; endpoints internos del bot quedan desprotegidos');
    return true;
  }

  const provided = req.headers['x-internal-token'];
  if (!provided || String(provided) !== INTERNAL_TOKEN) {
    res.status(401).json({ error: 'Unauthorized internal request' });
    return false;
  }

  return true;
}

function ensureWebhookSecret(req, res) {
  if (!TELEGRAM_WEBHOOK_SECRET) {
    return true;
  }

  const provided = req.headers['x-telegram-bot-api-secret-token'];
  if (!provided || String(provided) !== TELEGRAM_WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Invalid webhook secret' });
    return false;
  }

  return true;
}

async function sendMessage(chatId, text, options = {}) {
  const response = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Error enviando mensaje a Telegram');
  }
}

async function sendPhoto(chatId, photoUrl, caption, options = {}) {
  const response = await fetch(`${TELEGRAM_API_BASE}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML',
      ...options,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Error enviando imagen por Telegram');
  }
}

async function sendMediaGroup(chatId, media) {
  const response = await fetch(`${TELEGRAM_API_BASE}/sendMediaGroup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      media,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Error enviando álbum por Telegram');
  }
}

async function answerCallbackQuery(callbackQueryId, text) {
  const response = await fetch(`${TELEGRAM_API_BASE}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Error respondiendo callback de Telegram');
  }
}

async function editMessageText(chatId, messageId, text, options = {}) {
  const response = await fetch(`${TELEGRAM_API_BASE}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...options,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Error editando mensaje de Telegram');
  }
}

async function editMessageReplyMarkup(chatId, messageId, replyMarkup) {
  const response = await fetch(`${TELEGRAM_API_BASE}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Error actualizando botones de Telegram');
  }
}

function getCustomerByTelegramId(telegramId) {
  return db
    .prepare(
      `SELECT id, telegram_id, approved, role_id
       FROM users
       WHERE telegram_id = ?
       LIMIT 1`
    )
    .get(Number(telegramId));
}

function getActiveProducts() {
  const products = db
    .prepare(
      `SELECT id, name, description, price, active
       FROM products
       WHERE active = 1
       ORDER BY id ASC`
    )
    .all();

  const images = db
    .prepare(
      `SELECT id, product_id, image_url, order_index
       FROM product_images
       ORDER BY order_index ASC, id ASC`
    )
    .all();

  const imagesByProduct = new Map();
  for (const image of images) {
    if (!imagesByProduct.has(image.product_id)) imagesByProduct.set(image.product_id, []);
    imagesByProduct.get(image.product_id).push(image.image_url);
  }

  return products.map((product) => ({
    ...product,
    image_urls: imagesByProduct.get(product.id) || [],
  }));
}

function resolvePublicImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  if (imageUrl.startsWith('/')) return `${PUBLIC_BASE_URL}${imageUrl}`;
  return `${PUBLIC_BASE_URL}/uploads/products/${imageUrl}`;
}

function getCustomerOrderHistory(customerId) {
  const orders = db
    .prepare(
      `SELECT id, status, total, notes, created_at, updated_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`
    )
    .all(customerId);

  if (!orders.length) return [];

  const orderIds = orders.map((order) => order.id);
  const placeholders = orderIds.map(() => '?').join(',');
  const items = db
    .prepare(
      `SELECT oi.order_id, oi.quantity, oi.price, p.name as product_name
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id IN (${placeholders})
       ORDER BY oi.order_id DESC, oi.id ASC`
    )
    .all(...orderIds);

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.order_id]) acc[item.order_id] = [];
    acc[item.order_id].push(item);
    return acc;
  }, {});

  return orders.map((order) => ({
    ...order,
    items: groupedItems[order.id] || [],
  }));
}

function createOrder(customerId, items, address, customerComment) {
  const uniqueProductIds = [...new Set(items.map((item) => item.productId))];
  const placeholders = uniqueProductIds.map(() => '?').join(',');

  const products = db
    .prepare(`
      SELECT id, name, price, active
      FROM products
      WHERE id IN (${placeholders})
    `)
    .all(...uniqueProductIds);

  const productMap = new Map(products.map((product) => [product.id, product]));

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product || !product.active) {
      throw new Error(`Producto inválido o inactivo: ${item.productId}`);
    }
  }

  const total = items.reduce((sum, item) => {
    const product = productMap.get(item.productId);
    return sum + product.price * item.quantity;
  }, 0);

  const orderInsert = db
    .prepare(
      `INSERT INTO orders (user_id, status, total, completed, notes)
       VALUES (?, 'pending', ?, 0, ?)`
    )
    .run(
      customerId,
      total,
      [
        `Dirección de entrega: ${address}`,
        customerComment ? `Comentario courier: ${customerComment}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    );

  const orderId = Number(orderInsert.lastInsertRowid);

  const insertOrderItem = db.prepare(
    `INSERT INTO order_items (order_id, product_id, quantity, price)
     VALUES (?, ?, ?, ?)`
  );

  for (const item of items) {
    const product = productMap.get(item.productId);
    insertOrderItem.run(orderId, item.productId, item.quantity, Number(product.price));
  }

  return { orderId, total };
}

function buildProductsMessage(products) {
  if (!products.length) {
    return '📭 No hay productos activos en este momento.';
  }

  const lines = products.map(
    (product) => `• ID ${product.id}: ${product.name} - $${Number(product.price).toFixed(2)}`
  );

  return [
    '🛍️ <b>Productos disponibles</b> (uno por mensaje)',
    '',
    'Usa los botones debajo de cada producto para ajustar cantidad.',
    'Puedes combinar varios productos en una sola orden.',
    '',
    ...lines,
  ].join('\n');
}

function buildProductCardButtons(productId, quantity) {
  return {
    inline_keyboard: [
      [
        { text: '➖', callback_data: `card:dec:${productId}` },
        { text: `Cantidad: ${quantity}`, callback_data: `card:qty:${productId}` },
        { text: '➕', callback_data: `card:inc:${productId}` },
      ],
      [{ text: '🗑️ Quitar', callback_data: `card:rm:${productId}` }],
    ],
  };
}

function buildOrderActionsButtons() {
  return {
    inline_keyboard: [
      [
        { text: '🧺 Ver selección', callback_data: 'pick:summary' },
        { text: '✅ Finalizar selección', callback_data: 'pick:done' },
      ],
    ],
  };
}

function buildSelectedItemsSummary(items, products) {
  const entries = Object.entries(items || {});
  if (!entries.length) return 'Aún no has agregado productos.';

  const productMap = new Map(products.map((product) => [String(product.id), product]));
  const lines = entries.map(([productId, quantity]) => {
    const product = productMap.get(String(productId));
    const name = product?.name || `Producto ${productId}`;
    return `• ${name}: ${quantity}`;
  });

  return ['🧺 <b>Tu selección actual</b>', ...lines].join('\n');
}

function normalizeCustomerInput(text) {
  const value = (text || '').trim();

  const map = {
    '🛍️ Nueva orden': '/orden',
    '🧾 Historial': '/historial',
    '❌ Cancelar': '/cancel',
    '⏭️ Sin comentario': '/sincomentario',
    '/rden': '/orden',
  };

  return map[value] || value;
}

async function handleCustomerMessage(message) {
  const telegramId = message?.from?.id;
  const chatId = message?.chat?.id;
  const text = normalizeCustomerInput(message?.text || '');

  if (!telegramId || !chatId || !text) return;

  console.log(`[BOT] msg telegramId=${telegramId} text="${text}"`);

  const user = getCustomerByTelegramId(telegramId);
  if (!user || user.role_id !== 3 || !user.approved) {
    console.log(
      `[BOT] Ignorado telegramId=${telegramId} reason=${!user ? 'no_user' : user.role_id !== 3 ? 'not_customer' : 'not_approved'}`
    );
    return;
  }

  const currentSession = sessions.get(telegramId);

  if (text === '/cancel') {
    sessions.delete(telegramId);
    await sendMessage(chatId, '❌ Operación cancelada. Usa /orden para iniciar una nueva solicitud.');
    return;
  }

  if (text.startsWith('/start') || text === '/menu') {
    sessions.delete(telegramId);
    console.log(`[BOT] /start recibido telegramId=${telegramId}`);
    await sendMessage(
      chatId,
      [
        '👋 Bienvenido a <b>GreenDelivery</b>.',
        '',
        'Comandos disponibles:',
        '• <b>/orden</b> - Crear una nueva orden',
        '• <b>/historial</b> - Ver historial de órdenes',
        '• <b>/cancel</b> - Cancelar flujo actual',
      ].join('\n'),
      { reply_markup: CUSTOMER_MENU_KEYBOARD }
    );
    return;
  }

  if (text === '/historial' || text === '/ordenes') {
    const history = getCustomerOrderHistory(user.id);
    if (!history.length) {
      await sendMessage(chatId, '📭 No tienes órdenes registradas todavía.');
      return;
    }

    const statusLabel = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      in_transit: 'En camino',
      im_here: 'Estoy aquí',
      delivered: 'Entregada',
    };

    const messages = history.map((order) => {
      const itemLines = order.items.length
        ? order.items.map((item) => `   - ${item.product_name || 'Producto'} x${item.quantity} ($${Number(item.price).toFixed(2)})`).join('\n')
        : '   - Sin items';

      return [
        `🧾 <b>Orden #${order.id}</b>`,
        `Estado: <b>${statusLabel[order.status] || order.status}</b>`,
        `Total: <b>$${Number(order.total || 0).toFixed(2)}</b>`,
        `Fecha: ${new Date(order.created_at).toLocaleString('es-ES')}`,
        'Items:',
        itemLines,
      ].join('\n');
    });

    for (const messageText of messages) {
      await sendMessage(chatId, messageText);
    }

    return;
  }

  if (text === '/orden' || text === '/rden') {
    const products = getActiveProducts();
    if (!products.length) {
      await sendMessage(chatId, '📭 No hay productos activos en este momento.');
      return;
    }

    for (const product of products) {
      const currentQty = 0;
      const caption = [
        `🛍️ <b>${product.name}</b>`,
        product.description ? `${product.description}` : null,
        `Precio: <b>$${Number(product.price).toFixed(2)}</b>`,
      ].filter(Boolean).join('\n');
      const productControls = {
        reply_markup: buildProductCardButtons(product.id, currentQty),
      };

      const imageUrls = (product.image_urls || []).map((imageUrl) => resolvePublicImageUrl(imageUrl)).filter(Boolean);
      if (imageUrls.length > 1) {
        try {
          await sendMediaGroup(
            chatId,
            imageUrls.map((url) => ({
              type: 'photo',
              media: url,
            }))
          );
          await sendMessage(chatId, caption, productControls);
        } catch (_error) {
          await sendMessage(chatId, caption, productControls);
        }
      } else if (imageUrls.length === 1) {
        try {
          await sendPhoto(chatId, imageUrls[0], caption, productControls);
        } catch (_error) {
          await sendMessage(chatId, caption, productControls);
        }
      } else {
        await sendMessage(chatId, caption, productControls);
      }
    }

    sessions.set(telegramId, { step: 'awaiting_product_selection', items: {} });
    await sendMessage(chatId, buildProductsMessage(products), { reply_markup: buildOrderActionsButtons() });
    return;
  }

  if (currentSession?.step === 'awaiting_address') {
    const address = text;
    if (address.length < 5) {
      await sendMessage(chatId, '⚠️ Dirección demasiado corta. Envía una dirección válida.');
      return;
    }

    sessions.set(telegramId, {
      step: 'awaiting_comment',
      items: currentSession.items,
      address,
    });

    await sendMessage(
      chatId,
      '💬 Envía un comentario para el courier (ej: referencias, timbre, portón). Si no deseas agregar comentario, usa <b>/sincomentario</b>.',
      {
        reply_markup: {
          keyboard: [[{ text: '⏭️ Sin comentario' }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  if (currentSession?.step === 'awaiting_comment') {
    const comment = text === '/sincomentario' ? '' : text;

    try {
      const { orderId, total } = createOrder(user.id, currentSession.items, currentSession.address, comment);
      sessions.delete(telegramId);

      await sendMessage(
        chatId,
        [
          '✅ <b>Orden creada correctamente</b>',
          `🧾 Número de orden: <b>#${orderId}</b>`,
          `💵 Total: <b>$${Number(total).toFixed(2)}</b>`,
          '📌 Estado inicial: <b>pending</b>',
          comment ? `🗒️ Comentario courier: <b>${comment}</b>` : '🗒️ Comentario courier: <b>Sin comentario</b>',
          '',
          'Te notificaremos cuando cambie el estado de tu orden.',
        ].join('\n')
        ,
        { reply_markup: CUSTOMER_MENU_KEYBOARD }
      );
    } catch (error) {
      sessions.delete(telegramId);
      await sendMessage(
        chatId,
        `❌ No se pudo crear la orden: ${error.message || 'Error desconocido'}`
      );
    }

    return;
  }

  await sendMessage(
    chatId,
    'Usa los botones del menú o escribe <b>/orden</b> para crear una orden y <b>/historial</b> para ver tus órdenes.',
    { reply_markup: CUSTOMER_MENU_KEYBOARD }
  );
}

async function handleCustomerCallbackQuery(callbackQuery) {
  const callbackQueryId = callbackQuery?.id;
  const data = callbackQuery?.data || '';
  const telegramId = callbackQuery?.from?.id;
  const chatId = callbackQuery?.message?.chat?.id;

  if (!callbackQueryId || !telegramId || !chatId || !data) return;

  const user = getCustomerByTelegramId(telegramId);
  if (!user || user.role_id !== 3 || !user.approved) {
    await answerCallbackQuery(callbackQueryId, 'No autorizado');
    return;
  }

  const currentSession = sessions.get(telegramId);
  if (!currentSession || currentSession.step !== 'awaiting_product_selection') {
    await answerCallbackQuery(callbackQueryId, 'Inicia una orden con /orden');
    return;
  }

  if (data.startsWith('card:')) {
    const [, action, productIdRaw] = data.split(':');
    const productId = Number(productIdRaw);
    if (!productId || Number.isNaN(productId)) {
      await answerCallbackQuery(callbackQueryId, 'Producto inválido');
      return;
    }

    const products = getActiveProducts();
    const product = products.find((item) => item.id === productId);
    if (!product) {
      sessions.delete(telegramId);
      await answerCallbackQuery(callbackQueryId, 'Producto no disponible');
      await sendMessage(chatId, '❌ El producto ya no está disponible. Usa /orden para iniciar de nuevo.');
      return;
    }

    const currentQty = Number((currentSession.items || {})[String(productId)] || 0);
    let quantity = currentQty;

    if (action === 'qty') {
      await answerCallbackQuery(callbackQueryId, `Cantidad actual: ${quantity}`);
      return;
    }

    if (action === 'inc') {
      quantity = Math.min(currentQty + 1, 999);
    }

    if (action === 'dec') {
      quantity = Math.max(currentQty - 1, 0);
    }

    if (action === 'rm') {
      quantity = 0;
    }

    if (!['inc', 'dec', 'rm'].includes(action)) {
      await answerCallbackQuery(callbackQueryId, 'Acción no soportada');
      return;
    }

    const nextItems = {
      ...(currentSession.items || {}),
    };

    if (quantity <= 0) {
      delete nextItems[String(product.id)];
    } else {
      nextItems[String(product.id)] = quantity;
    }

    sessions.set(telegramId, {
      step: 'awaiting_product_selection',
      items: nextItems,
    });

    await answerCallbackQuery(
      callbackQueryId,
      quantity > 0 ? `${product.name}: ${quantity}` : `${product.name} quitado`
    );

    await editMessageReplyMarkup(
      chatId,
      callbackQuery.message.message_id,
      buildProductCardButtons(product.id, quantity)
    );

    return;
  }

  if (data === 'pick:summary') {
    const products = getActiveProducts();
    await answerCallbackQuery(callbackQueryId, 'Mostrando selección');
    await sendMessage(chatId, buildSelectedItemsSummary(currentSession.items || {}, products));
    return;
  }

  if (data === 'pick:done') {
    const selectedItems = currentSession.items || {};
    const hasItems = Object.keys(selectedItems).length > 0;
    if (!hasItems) {
      await answerCallbackQuery(callbackQueryId, 'Agrega al menos un producto');
      await sendMessage(chatId, '⚠️ Debes seleccionar al menos un producto antes de finalizar.');
      return;
    }

    const products = getActiveProducts();
    sessions.set(telegramId, {
      step: 'awaiting_address',
      items: Object.entries(selectedItems).map(([productId, quantity]) => ({
        productId: Number(productId),
        quantity: Number(quantity),
      })),
    });

    await answerCallbackQuery(callbackQueryId, 'Selección finalizada');
    await sendMessage(
      chatId,
      `${buildSelectedItemsSummary(selectedItems, products)}\n\n📍 Ahora envía la <b>dirección de entrega</b> de tu orden.`
    );
    return;
  }

  if (!data.startsWith('pick:')) {
    await answerCallbackQuery(callbackQueryId, 'Acción no soportada');
    return;
  }

  await answerCallbackQuery(callbackQueryId, 'Acción no soportada');
}

async function pollTelegramUpdates() {
  if (!BOT_TOKEN) return;
  if (pollingInProgress) return;

  pollingInProgress = true;
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offset: lastUpdateId + 1,
        timeout: 20,
        allowed_updates: ['message', 'callback_query'],
      }),
    });

    const payload = await response.json();
    if (!payload?.ok || !Array.isArray(payload.result)) {
      return;
    }

    for (const update of payload.result) {
      lastUpdateId = Number(update.update_id || lastUpdateId);
      if (update?.message) {
        await handleCustomerMessage(update.message);
      }
      if (update?.callback_query) {
        await handleCustomerCallbackQuery(update.callback_query);
      }
    }
  } catch (error) {
    console.error('[BOT] Error polling updates:', error?.message || error);
  } finally {
    pollingInProgress = false;
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'telegram-local-bot' });
});

app.post('/telegram/webhook', async (req, res) => {
  if (!ensureWebhookSecret(req, res)) return;

  try {
    const update = req.body;
    if (update?.message) {
      await handleCustomerMessage(update.message);
    }
    if (update?.callback_query) {
      await handleCustomerCallbackQuery(update.callback_query);
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Webhook error' });
  }
});

app.post('/send-2fa-code', async (req, res) => {
  if (!ensureInternalToken(req, res)) return;
  if (!ensureBotToken(res)) return;

  try {
    const { telegramId, code } = req.body;

    if (!telegramId || !code) {
      return res.status(400).json({ error: 'Missing telegramId or code' });
    }

    await sendMessage(
      Number(telegramId),
      `🔐 <b>GreenDelivery - Código 2FA</b>\n\nTu código es: <b>${String(code)}</b>\n\n⏱️ Expira en 5 minutos.`
    );

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error enviando código 2FA' });
  }
});

app.post('/notify-order-status', async (req, res) => {
  if (!ensureInternalToken(req, res)) return;
  if (!ensureBotToken(res)) return;

  try {
    const { telegramId, orderId, status } = req.body;

    if (!telegramId || !orderId || !status) {
      return res.status(400).json({ error: 'Missing telegramId, orderId or status' });
    }

    const statusLabel = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      in_transit: 'En camino',
      im_here: 'Estoy aquí',
      delivered: 'Entregada',
    }[String(status)] || String(status);

    const statusMessage = {
      pending: `📦 <b>Actualización de orden</b>\n\nOrden #${Number(orderId)}\nEstado: <b>Pendiente</b>\nEstamos procesando tu pedido.`,
      confirmed: `✅ <b>Actualización de orden</b>\n\nOrden #${Number(orderId)}\nEstado: <b>Confirmada</b>\nTu pedido fue confirmado.`,
      in_transit: `🚚 <b>Actualización de orden</b>\n\nOrden #${Number(orderId)}\nEstado: <b>En camino</b>\nEl courier va en ruta.`,
      im_here: `📍 <b>Actualización de orden</b>\n\nOrden #${Number(orderId)}\nEstado: <b>Estoy aquí</b>\nEl courier ya llegó al punto de entrega.`,
      delivered: `🎉 <b>Actualización de orden</b>\n\nOrden #${Number(orderId)}\nEstado: <b>Entregada</b>\nTu pedido fue entregado correctamente.`,
    }[String(status)] || `📦 <b>Actualización de orden</b>\n\nOrden #${Number(orderId)}\nNuevo estado: <b>${statusLabel}</b>`;

    await sendMessage(Number(telegramId), statusMessage);

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error notificando orden' });
  }
});

app.listen(PORT, () => {
  console.log(`[BOT] Telegram local bot escuchando en puerto ${PORT}`);
  if (!BOT_TOKEN) {
    console.warn('[BOT] TELEGRAM_BOT_TOKEN no configurado, polling deshabilitado');
    return;
  }

  pollTelegramUpdates();
  setInterval(() => {
    pollTelegramUpdates();
  }, 3000);
});
