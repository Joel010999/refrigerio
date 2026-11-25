import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, migrate, getSettings, DEFAULT_SETTINGS } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');
const ADMIN_DIR = path.join(__dirname, 'admin');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const COOKIE_NAME = 'cz_admin';

if (!ADMIN_PASSWORD || !SESSION_SECRET) {
  console.error('Faltan ADMIN_PASSWORD o SESSION_SECRET');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));

/* ---------- Auth ---------- */

const sign = (value) => crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');

const safeEqual = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

const readCookie = (req, name) => {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
};

const isAuthenticated = (req) => {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
};

const requireAdmin = (req, res, next) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'No autorizado' });
  next();
};

const loginAttempts = new Map();
const tooManyAttempts = (ip) => {
  const now = Date.now();
  const recent = (loginAttempts.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
  loginAttempts.set(ip, recent);
  return recent.length >= 10;
};

app.post('/api/admin/login', (req, res) => {
  const ip = req.ip;
  if (tooManyAttempts(ip)) return res.status(429).json({ error: 'Demasiados intentos. Probá en 15 minutos.' });
  if (!safeEqual(req.body?.password || '', ADMIN_PASSWORD)) {
    loginAttempts.get(ip).push(Date.now());
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  loginAttempts.delete(ip);
  const exp = String(Date.now() + SESSION_TTL_MS);
  res.cookie(COOKIE_NAME, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: IS_PROD,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => res.json({ authenticated: isAuthenticated(req) }));

/* ---------- Helpers ---------- */

const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const bool = (v) => v === true || v === 'true' || v === 1 || v === '1';
const int = (v) => Number.parseInt(v, 10) || 0;
const specsList = (v) => (Array.isArray(v) ? v : String(v ?? '').split('\n'))
  .map(s => str(s, 120)).filter(Boolean).slice(0, 8);

const productFields = (b) => [
  str(b.title, 120), str(b.capacity, 30), str(b.tag, 60), str(b.description, 300),
  specsList(b.specs), str(b.price, 80), str(b.image_url, 300), str(b.wa_message, 600),
  b.active === undefined ? true : bool(b.active), int(b.sort),
];

const slideFields = (b) => [
  str(b.tag, 60), str(b.title, 160), str(b.image_url, 300), str(b.link_label, 60),
  str(b.link_url, 300), str(b.wa_message, 600),
  b.active === undefined ? true : bool(b.active), int(b.sort),
];

const asyncRoute = (fn) => (req, res, next) => fn(req, res).catch(next);

/* ---------- Public API ---------- */

app.get('/api/site', asyncRoute(async (req, res) => {
  const [settings, products, slides] = await Promise.all([
    getSettings(),
    pool.query(`SELECT id, title, capacity, tag, description, specs, price, image_url, wa_message
                FROM products WHERE active ORDER BY sort, id`),
    pool.query(`SELECT id, tag, title, image_url, link_label, link_url, wa_message
                FROM slides WHERE active ORDER BY sort, id`),
  ]);
  res.set('Cache-Control', 'no-cache');
  res.json({
    settings: {
      whatsapp_number: settings.whatsapp_number,
      product_message_template: settings.product_message_template,
      price_fallback: settings.price_fallback,
    },
    products: products.rows,
    slides: slides.rows,
  });
}));

app.post('/api/track', express.text({ type: '*/*', limit: '2kb' }), asyncRoute(async (req, res) => {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const source = str(body?.source, 40) || 'otro';
  const productId = int(body?.product_id) || null;
  await pool.query(
    `INSERT INTO whatsapp_clicks (source, product_id)
     SELECT $1, (SELECT id FROM products WHERE id = $2)`,
    [source, productId]
  );
  res.status(204).end();
}));

app.get('/media/:id', asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT mime, data FROM media WHERE id = $1', [int(req.params.id)]);
  if (!rows.length) return res.status(404).end();
  res.set('Content-Type', rows[0].mime);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(rows[0].data);
}));

/* ---------- Admin API ---------- */

const admin = express.Router();
admin.use(requireAdmin);

admin.get('/products', asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY sort, id');
  res.json(rows);
}));

admin.post('/products', asyncRoute(async (req, res) => {
  const f = productFields(req.body);
  if (!f[0]) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const { rows } = await pool.query(
    `INSERT INTO products (title, capacity, tag, description, specs, price, image_url, wa_message, active, sort)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, f);
  res.status(201).json(rows[0]);
}));

admin.put('/products/:id', asyncRoute(async (req, res) => {
  const f = productFields(req.body);
  if (!f[0]) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const { rows } = await pool.query(
    `UPDATE products SET title=$1, capacity=$2, tag=$3, description=$4, specs=$5, price=$6,
       image_url=$7, wa_message=$8, active=$9, sort=$10, updated_at=now()
     WHERE id=$11 RETURNING *`, [...f, int(req.params.id)]);
  if (!rows.length) return res.status(404).json({ error: 'No existe' });
  res.json(rows[0]);
}));

admin.delete('/products/:id', asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM products WHERE id=$1', [int(req.params.id)]);
  res.status(204).end();
}));

admin.get('/slides', asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM slides ORDER BY sort, id');
  res.json(rows);
}));

admin.post('/slides', asyncRoute(async (req, res) => {
  const f = slideFields(req.body);
  if (!f[1]) return res.status(400).json({ error: 'El título es obligatorio' });
  const { rows } = await pool.query(
    `INSERT INTO slides (tag, title, image_url, link_label, link_url, wa_message, active, sort)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, f);
  res.status(201).json(rows[0]);
}));

admin.put('/slides/:id', asyncRoute(async (req, res) => {
  const f = slideFields(req.body);
  if (!f[1]) return res.status(400).json({ error: 'El título es obligatorio' });
  const { rows } = await pool.query(
    `UPDATE slides SET tag=$1, title=$2, image_url=$3, link_label=$4, link_url=$5, wa_message=$6,
       active=$7, sort=$8, updated_at=now()
     WHERE id=$9 RETURNING *`, [...f, int(req.params.id)]);
  if (!rows.length) return res.status(404).json({ error: 'No existe' });
  res.json(rows[0]);
}));

admin.delete('/slides/:id', asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM slides WHERE id=$1', [int(req.params.id)]);
  res.status(204).end();
}));

admin.get('/settings', asyncRoute(async (req, res) => res.json(await getSettings())));

admin.put('/settings', asyncRoute(async (req, res) => {
  const updates = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (req.body?.[key] !== undefined) updates[key] = str(req.body[key], 600);
  }
  if (updates.whatsapp_number !== undefined) {
    updates.whatsapp_number = updates.whatsapp_number.replace(/\D/g, '');
    if (updates.whatsapp_number.length < 10) return res.status(400).json({ error: 'Número de WhatsApp inválido' });
  }
  for (const [key, value] of Object.entries(updates)) {
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [key, value]);
  }
  res.json(await getSettings());
}));

admin.get('/stats', asyncRoute(async (req, res) => {
  const [totals, bySource, byProduct] = await Promise.all([
    pool.query(`SELECT
        count(*) FILTER (WHERE created_at > now() - interval '1 day')::int AS day,
        count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS week,
        count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS month
      FROM whatsapp_clicks`),
    pool.query(`SELECT source, count(*)::int AS clicks FROM whatsapp_clicks
      WHERE created_at > now() - interval '30 days' GROUP BY source ORDER BY clicks DESC`),
    pool.query(`SELECT p.id, p.title, count(c.id)::int AS clicks FROM products p
      LEFT JOIN whatsapp_clicks c ON c.product_id = p.id AND c.created_at > now() - interval '30 days'
      GROUP BY p.id ORDER BY clicks DESC, p.sort`),
  ]);
  res.json({ totals: totals.rows[0], bySource: bySource.rows, byProduct: byProduct.rows });
}));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)),
});

admin.post('/media', upload.single('file'), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Subí una imagen JPG, PNG o WEBP de hasta 5 MB' });
  const { rows } = await pool.query('INSERT INTO media (mime, data) VALUES ($1,$2) RETURNING id',
    [req.file.mimetype, req.file.buffer]);
  res.status(201).json({ url: `/media/${rows[0].id}` });
}));

app.use('/api/admin', admin);

/* ---------- Static ---------- */

app.get('/admin', (req, res, next) => (req.path === '/admin' ? res.redirect(301, '/admin/') : next()));
app.use('/admin', express.static(ADMIN_DIR, { index: 'index.html' }));
app.use(express.static(DIST_DIR, { index: 'index.html', maxAge: '1h' }));
app.get('/healthz', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: 'La imagen supera 5 MB' });
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
});

await migrate();
app.listen(PORT, () => console.log(`Climatizar.com escuchando en :${PORT}`));
