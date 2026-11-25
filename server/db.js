import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1|\.railway\.internal/.test(connectionString);
export const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 5,
});
pool.on('error', (err) => console.error('Error de conexión PostgreSQL:', err.message));

const DEFAULT_SPECS = ['BGH, Philco o TCL', 'Inverter u On/Off', 'Combo con instalación incluida', '1 año de garantía'];

const SEED_PRODUCTS = [
  ['Split 2.250', '2.250', 'Dormitorio', 'Dormitorios de hasta ~18 m²'],
  ['Split 3.000', '3.000', 'Living', 'Livings y ambientes de hasta ~25 m²'],
  ['Split 4.500', '4.500', 'Ambientes amplios', 'Espacios integrados de hasta ~37 m²'],
  ['Split 6.000', '6.000', 'Comercios', 'Locales y oficinas de hasta ~50 m²'],
];

const SEED_SLIDES = [
  ['Instalación premium', 'Terminación prolija, vacío y carga bajo norma', '/images/cliente-montaje-condensadora.jpg', 'Ver servicios', '#servicios', null],
  ['Combos', 'Equipo nuevo + instalación, con 1 año de garantía', '/images/cliente-living-split-lg.jpg', 'Ver equipos', '#equipos', null],
  ['Financiación', 'Pagalo en cuotas con tarjeta de crédito', '/images/cliente-manifold-digital.jpg', 'Consultar cuotas', null, 'Hola Climatizar.com, quisiera consultar las opciones de financiación con tarjeta'],
  ['Comercios y oficinas', 'Promociones especiales para locales comerciales', '/images/cliente-valvulas-exterior.jpg', 'Consultar promo', null, 'Hola Climatizar.com, quisiera consultar promociones para mi comercio'],
];

export const DEFAULT_SETTINGS = {
  whatsapp_number: '5491176768392',
  product_message_template: 'Hola Climatizar.com, quisiera precio y disponibilidad del combo {producto} frigorías (equipo + instalación)',
  price_fallback: 'Precio y stock del día por WhatsApp',
};

export async function migrate(retries = 10) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await runMigrations();
    } catch (err) {
      if (attempt >= retries) throw err;
      console.error(`Base no disponible (${err.message}), reintento ${attempt}/${retries}...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS media (
      id SERIAL PRIMARY KEY,
      mime TEXT NOT NULL,
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      capacity TEXT NOT NULL DEFAULT '',
      tag TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      specs TEXT[] NOT NULL DEFAULT '{}',
      price TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      wa_message TEXT NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT true,
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS slides (
      id SERIAL PRIMARY KEY,
      tag TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      link_label TEXT NOT NULL DEFAULT '',
      link_url TEXT NOT NULL DEFAULT '',
      wa_message TEXT NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT true,
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS whatsapp_clicks (
      id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS whatsapp_clicks_created_idx ON whatsapp_clicks (created_at);
  `);

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [key, value]);
  }

  const { rows: [{ count: productCount }] } = await pool.query('SELECT count(*)::int AS count FROM products');
  if (productCount === 0) {
    for (const [i, [title, capacity, tag, description]] of SEED_PRODUCTS.entries()) {
      await pool.query(
        'INSERT INTO products (title, capacity, tag, description, specs, sort) VALUES ($1, $2, $3, $4, $5, $6)',
        [title, capacity, tag, description, DEFAULT_SPECS, i]
      );
    }
  }

  const { rows: [{ count: slideCount }] } = await pool.query('SELECT count(*)::int AS count FROM slides');
  if (slideCount === 0) {
    for (const [i, [tag, title, image_url, link_label, link_url, wa_message]] of SEED_SLIDES.entries()) {
      await pool.query(
        'INSERT INTO slides (tag, title, image_url, link_label, link_url, wa_message, sort) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [tag, title, image_url, link_label, link_url || '', wa_message || '', i]
      );
    }
  }
}

export async function getSettings() {
  const { rows } = await pool.query('SELECT key, value FROM settings');
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map(r => [r.key, r.value])) };
}
