const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('\nA .env file already exists. For safety, setup will not overwrite it.');
  console.log('If you need to reset your login, back up and remove .env, then run npm run setup again.\n');
  process.exit(0);
}
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, answer => resolve(answer.trim())));
(async () => {
  console.log('\nHandmade With Love by Lucy — first-time setup\n');
  let username = await ask('Choose an admin username [lucy]: ');
  if (!username) username = 'lucy';
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) throw new Error('Username must be 3–40 characters and use letters, numbers, dots, underscores or hyphens.');
  const password = await ask('Choose a strong admin password (at least 12 characters): ');
  if (password.length < 12) throw new Error('Password must be at least 12 characters. Run npm run setup again.');
  const confirm = await ask('Re-enter your password: ');
  if (password !== confirm) throw new Error('Passwords do not match. Run npm run setup again.');
  const phone = await ask('WhatsApp number [0712677342]: ');
  const digits = (phone || '0712677342').replace(/\D/g, '');
  const whatsapp = digits.startsWith('0') ? '27' + digits.slice(1) : digits;
  if (!/^27\d{9}$/.test(whatsapp)) throw new Error('Enter a South African mobile number, e.g. 0712677342. Run setup again.');
  const hash = bcrypt.hashSync(password, 12);
  const secret = crypto.randomBytes(48).toString('hex');
  const contents = `PORT=3000\nSESSION_SECRET=${secret}\nADMIN_USERNAME=${username}\nADMIN_PASSWORD_HASH=${hash}\nWHATSAPP_NUMBER=${whatsapp}\n`;
  fs.writeFileSync(envPath, contents, { mode: 0o600, flag: 'wx' });
  console.log('\nSetup complete. Your private .env file was created and is excluded from Git.');
  console.log('Start the site with: npm start');
  console.log('Open http://localhost:3000 and manage products at http://localhost:3000/admin.html\n');
})().catch(err => { console.error('\nSetup error: ' + err.message + '\n'); process.exitCode = 1; }).finally(() => rl.close());
