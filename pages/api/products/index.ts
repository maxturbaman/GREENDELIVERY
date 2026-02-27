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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = requireAuth(req, res, { roles: ['admin'] });
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all() as any[];
      const images = db.prepare('SELECT * FROM product_images ORDER BY order_index ASC').all() as any[];

      const imageMap = images.reduce((acc: Record<number, any[]>, img) => {
        if (!acc[img.product_id]) acc[img.product_id] = [];
        acc[img.product_id].push(img);
        return acc;
      }, {});

      return res.status(200).json(
        products.map((product) => ({
          ...product,
          active: Boolean(product.active),
          images: imageMap[product.id] || [],
        }))
      );
    }

    if (req.method === 'POST') {
      const { fields, files } = await parseForm(req);

      const name = String(fields.name || '');
      const description = String(fields.description || '');
      const price = Number(fields.price || 0);

      if (!name || Number.isNaN(price)) {
        return res.status(400).json({ error: 'Datos inválidos del producto' });
      }

      const insert = db.prepare(
        'INSERT INTO products (name, description, price, active) VALUES (?, ?, ?, 1)'
      ).run(name, description || null, price);

      const productId = Number(insert.lastInsertRowid);

      const rawImages = files.images || files.image;
      const imageFiles = Array.isArray(rawImages)
        ? rawImages
        : rawImages
          ? [rawImages]
          : [];

      imageFiles.forEach((imageFile, index) => {
        if (imageFile && imageFile.filepath) {
          const fileName = path.basename(imageFile.filepath);
          const imageUrl = `/uploads/products/${fileName}`;

          db.prepare(
            'INSERT INTO product_images (product_id, image_url, order_index) VALUES (?, ?, ?)'
          ).run(productId, imageUrl, index + 1);
        }
      });

      return res.status(201).json({ ok: true, id: productId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
