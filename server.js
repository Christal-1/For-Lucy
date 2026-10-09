require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const app = express();
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const UPLOADS = path.join(ROOT, 'uploads');
const STORAGE = path.join(ROOT, 'storage');
const DB_FILE = path.join(STORAGE, 'products.json');
const PORT = Number(process.env.PORT || 3000);

for (const dir of [UPLOADS, STORAGE]) fs.mkdirSync(dir, { recursive: true });
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 40 || !process.env.ADMIN_PASSWORD_HASH || !process.env.ADMIN_USERNAME) {
  console.error('\nMissing configuration. Run `npm run setup` and create your private .env file first.\n');
  process.exit(1);
}

const whatsappDigits = String(process.env.WHATSAPP_NUMBER || '27712677342').replace(/\D/g, '');
if (!/^27\d{9}$/.test(whatsappDigits)) {
  console.error('WHATSAPP_NUMBER must be a South African number in international format, e.g. 27712677342.');
  process.exit(1);
}

function readProducts() {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    console.error('Could not read product storage:', err.message);
    return [];
  }
}
function writeProducts(products) {
  const temp = DB_FILE + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(products, null, 2), { mode: 0o600 });
  fs.renameSync(temp, DB_FILE);
}
function safeProduct(p) {
  return { id: p.id, name: p.name, category: p.category, description: p.description, price: p.price, image: p.image || '', available: p.available !== false, createdAt: p.createdAt };
}
function adminOnly(req, res, next) {
  if (req.session && req.session.isAdmin === true) return next();
  return res.status(401).json({ error: 'Please sign in to continue.' });
}
function csrfCheck(req, res, next) {
  const token = req.get('x-csrf-token');
  if (!token || !req.session.csrfToken || Buffer.byteLength(String(token)) !== Buffer.byteLength(String(req.session.csrfToken)) || !crypto.timingSafeEqual(Buffer.from(String(token)), Buffer.from(String(req.session.csrfToken)))) {
    return res.status(403).json({ error: 'Your session expired or the request could not be verified. Refresh the page and try again.' });
  }
  next();
}
function cleanText(value, max) { return String(value ?? '').trim().slice(0, max); }

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(session({
  name: 'lucy.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 4 },
  rolling: true
}));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' } });
const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS),
  filename: (_req, file, cb) => {
    const ext = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' })[file.mimetype];
    cb(null, crypto.randomUUID() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, cb) => {
  if (!allowedMime.has(file.mimetype)) return cb(new Error('Please upload a JPG, PNG, WEBP or GIF image.'));
  cb(null, true);
} });

app.get('/api/config', (_req, res) => res.json({ whatsappNumber: whatsappDigits }));
app.get('/api/products', (_req, res) => res.json(readProducts().filter(p => p.available !== false).map(safeProduct)));
app.get('/api/admin/me', (req, res) => {
  if (!req.session.isAdmin) return res.status(401).json({ authenticated: false });
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.json({ authenticated: true, username: process.env.ADMIN_USERNAME, csrfToken: req.session.csrfToken });
});
app.post('/api/admin/login', loginLimiter, async (req, res, next) => {
  try {
    const username = cleanText(req.body.username, 40);
    const password = String(req.body.password || '');
    const userMatches = username.toLowerCase() === process.env.ADMIN_USERNAME.toLowerCase();
    const passwordMatches = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    if (!userMatches || !passwordMatches) return res.status(401).json({ error: 'Username or password is incorrect.' });
    req.session.regenerate(err => {
      if (err) return next(err);
      req.session.isAdmin = true;
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
      req.session.save(saveErr => {
        if (saveErr) return next(saveErr);
        res.json({ authenticated: true, username: process.env.ADMIN_USERNAME, csrfToken: req.session.csrfToken });
      });
    });
  } catch (err) { next(err); }
});
app.post('/api/admin/logout', adminOnly, csrfCheck, (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie('lucy.sid', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.json({ ok: true });
  });
});
app.get('/api/admin/products', adminOnly, (_req, res) => res.json(readProducts().map(safeProduct)));
app.post('/api/admin/products', adminOnly, csrfCheck, upload.single('image'), (req, res) => {
  const name = cleanText(req.body.name, 100);
  const category = cleanText(req.body.category, 50);
  const description = cleanText(req.body.description, 1000);
  const price = Number(req.body.price);
  if (!name || !category || !Number.isFinite(price) || price < 0 || price > 1000000) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Enter a product name, category and valid price.' });
  }
  const products = readProducts();
  const product = { id: crypto.randomUUID(), name, category, description, price: Math.round(price * 100) / 100, image: req.file ? '/uploads/' + req.file.filename : '', available: req.body.available !== 'false', createdAt: new Date().toISOString() };
  products.unshift(product);
  writeProducts(products);
  res.status(201).json(safeProduct(product));
});
app.put('/api/admin/products/:id', adminOnly, csrfCheck, upload.single('image'), (req, res) => {
  const products = readProducts();
  const index = products.findIndex(p => p.id === req.params.id);
  if (index < 0) { if (req.file) fs.unlinkSync(req.file.path); return res.status(404).json({ error: 'Product not found.' }); }
  const old = products[index];
  const name = cleanText(req.body.name, 100);
  const category = cleanText(req.body.category, 50);
  const description = cleanText(req.body.description, 1000);
  const price = Number(req.body.price);
  if (!name || !category || !Number.isFinite(price) || price < 0 || price > 1000000) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Enter a product name, category and valid price.' });
  }
  const nextImage = req.file ? '/uploads/' + req.file.filename : old.image;
  products[index] = { ...old, name, category, description, price: Math.round(price * 100) / 100, image: nextImage, available: req.body.available !== 'false', updatedAt: new Date().toISOString() };
  writeProducts(products);
  if (req.file && old.image && old.image.startsWith('/uploads/')) {
    const oldPath = path.join(UPLOADS, path.basename(old.image));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  res.json(safeProduct(products[index]));
});
app.delete('/api/admin/products/:id', adminOnly, csrfCheck, (req, res) => {
  const products = readProducts();
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  writeProducts(products.filter(p => p.id !== req.params.id));
  if (product.image && product.image.startsWith('/uploads/')) {
    const imagePath = path.join(UPLOADS, path.basename(product.image));
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  }
  res.json({ ok: true });
});

app.use('/uploads', express.static(UPLOADS, { maxAge: '1d', dotfiles: 'deny', index: false }));
app.use(express.static(PUBLIC, { extensions: ['html'], dotfiles: 'deny', index: 'index.html' }));
app.get('/admin', (_req, res) => res.sendFile(path.join(PUBLIC, 'admin.html')));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Images must be 5 MB or smaller.' : 'The image could not be uploaded.' });
  if (err.message && err.message.startsWith('Please upload')) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`\nHandmade With Love by Lucy is running at http://localhost:${PORT}`);
  console.log(`Owner dashboard: http://localhost:${PORT}/admin.html\n`);
});
