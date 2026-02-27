import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import formidable from 'formidable';
import db from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({ uploadDir, keepExtensions: true, multiples: true });

  return new Promise((resolve, reject) => {
    form.parse(req, (err: any, fields: formidable.Fields, files: formidable.Files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function toLocalImagePath(imageUrl: string) {
  if (!imageUrl.startsWith('/uploads/products/')) return null;
  return path.join(process.cwd(), 'public', imageUrl);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = requireAuth(req, res, { roles: ['admin'] });
  if (!user) return;

  try {
    const productId = Number(req.query.id);
    if (!productId) {
      return res.status(400).json({ error: 'Missing product id' });
    }

    if (req.method === 'PUT') {
      const { fields, files } = await parseForm(req);

      const name = String(fields.name || '');
      const description = String(fields.description || '');
      const price = Number(fields.price || 0);
      const active = String(fields.active || 'true') === 'true';

      if (!name || Number.isNaN(price)) {
        return res.status(400).json({ error: 'Datos inválidos del producto' });
      }

      db.prepare(
        'UPDATE products SET name = ?, description = ?, price = ?, active = ? WHERE id = ?'
      ).run(name, description || null, price, active ? 1 : 0, productId);

      const removeRaw = String(fields.removeImageIds || '[]');
      let removeImageIds: number[] = [];
      try {
        removeImageIds = JSON.parse(removeRaw);
      } catch (_error) {
        removeImageIds = [];
      }

      if (removeImageIds.length > 0) {
        const placeholders = removeImageIds.map(() => '?').join(',');
        const toRemove = db
          .prepare(
            `SELECT id, image_url FROM product_images WHERE product_id = ? AND id IN (${placeholders})`
          )
          .all(productId, ...removeImageIds) as any[];

        toRemove.forEach((image) => {
          const localPath = toLocalImagePath(String(image.image_url));
          if (localPath && fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
        });

        db.prepare(
          `DELETE FROM product_images WHERE product_id = ? AND id IN (${placeholders})`
        ).run(productId, ...removeImageIds);
      }

      const rawImages = files.images || files.image;
      const imageFiles = Array.isArray(rawImages)
        ? rawImages
        : rawImages
          ? [rawImages]
          : [];

      const currentMaxOrder = db
        .prepare('SELECT COALESCE(MAX(order_index), 0) as maxOrder FROM product_images WHERE product_id = ?')
        .get(productId) as any;
      let nextOrder = Number(currentMaxOrder.maxOrder || 0) + 1;

      imageFiles.forEach((imageFile) => {
        if (imageFile && imageFile.filepath) {
          const fileName = path.basename(imageFile.filepath);
          const imageUrl = `/uploads/products/${fileName}`;

          db.prepare(
            'INSERT INTO product_images (product_id, image_url, order_index) VALUES (?, ?, ?)'
          ).run(productId, imageUrl, nextOrder);
          nextOrder += 1;
        }
      });

      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const currentImages = db
        .prepare('SELECT image_url FROM product_images WHERE product_id = ?')
        .all(productId) as any[];

      currentImages.forEach((image) => {
        const localPath = toLocalImagePath(String(image.image_url));
        if (localPath && fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      });

      db.prepare('DELETE FROM products WHERE id = ?').run(productId);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
