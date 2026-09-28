/**
 * Tangkap layar app sungguhan untuk review desain.
 *
 * App ini offline-first: tanpa data di IndexedDB yang tampil adalah gerbang
 * onboarding, bukan Beranda. Jadi skrip ini menyemai Dexie lebih dulu dengan
 * toko, kategori, dan produk contoh, baru memotret.
 *
 *   npx vite build && npx vite preview --port 4317 --strictPort &
 *   node scripts/shoot-review.mjs            # semua layar, 390x844
 *   node scripts/shoot-review.mjs home       # hanya Beranda, viewport tinggi
 *
 * Butuh chrome-headless-shell di cache puppeteer dan paket `ws`.
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const WebSocket = require('ws');

const MODE = process.argv[2] === 'home' ? 'home' : 'all';
const ORIGIN = process.env.ORIGIN || 'http://localhost:4317';
const OUT = new URL('../.impeccable/review/', import.meta.url).pathname;
const WIDTH = 390;
const HEIGHT = MODE === 'home' ? 2400 : 844;

/** chrome-headless-shell, versi apa pun yang ada di cache. */
function findChrome() {
  const base = `${process.env.HOME}/.cache/puppeteer/chrome-headless-shell`;
  const version = readdirSync(base).sort().pop();
  return `${base}/${version}/chrome-headless-shell-linux64/chrome-headless-shell`;
}

mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(findChrome(), [
  '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=9333', `--window-size=${WIDTH},${HEIGHT}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

async function wsUrl() {
  for (let i = 0; i < 40; i += 1) {
    try { return (await (await fetch('http://127.0.0.1:9333/json/version')).json()).webSocketDebuggerUrl; }
    catch { await sleep(250); }
  }
  throw new Error('devtools tidak pernah siap');
}

const ws = new WebSocket(await wsUrl(), { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
await new Promise((r) => ws.on('open', r));

let id = 0;
const pending = new Map();
ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (!m.id || !pending.has(m.id)) return;
  const { res, rej } = pending.get(m.id);
  pending.delete(m.id);
  m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
});
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const n = (id += 1);
  pending.set(n, { res, rej });
  ws.send(JSON.stringify({ id: n, method, params, sessionId }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);

await S('Page.enable');
await S('Runtime.enable');
await S('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: true });

async function evaluate(expression) {
  const r = await S('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
  return r.result.value;
}

async function goto(path) {
  await S('Page.navigate', { url: ORIGIN + path });
  await sleep(2600);
}

// ---- semai Dexie ----
await goto('/');
const seeded = await evaluate(`(async () => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('kasirgratisan-db');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const names = Array.from(db.objectStoreNames);
  if (!names.length) return '';
  const put = (store, rows) => new Promise((res, rej) => {
    const tx = db.transaction([store], 'readwrite');
    const os = tx.objectStore(store);
    rows.forEach((row) => os.put(row));
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
  const now = new Date();
  const seen = ['2026-09-speech-to-product','2026-07-telegram-support','2026-06-join-whatsapp','2026-06-kitchen-ticket','2026-06-cashier-layout','2026-06-import-excel','2026-06-stock-opname','2026-06-receipt-footer','2026-06-customer-debts','2026-06-print-daily-closing','2026-06-cloud-backup','2026-06-rebrand-freekasir','2026-06-stock-search-scan','2026-06-export-excel','2026-05-customers','2026-05-unmanaged-stock','2026-05-expense-tracking','2026-05-error-boundary'];
  await put('storeSettings', [{ id: 1, storeName: 'Warung Bu Siti', onboardingDone: true,
    themeColor: '227', theme: 'light', currency: 'Rp', language: 'id', multiUserEnabled: 0, seenWhatsNewIds: seen }]);
  await put('categories', ['Makanan','Minuman','Rokok','Sabun'].map((name, i) =>
    ({ id: i + 1, name, isDeleted: 0, createdAt: now, updatedAt: now })));
  const items = [
    ['Mie Goreng Instan', 1, 3500, 2800, 18, 'pcs'],
    ['Teh Kemasan 350ml', 2, 4000, 3100, 42, 'pcs'],
    ['Rokok Filter 16', 3, 28000, 25500, 7, 'bungkus'],
    ['Sabun Mandi Batang', 4, 5500, 4200, 23, 'pcs'],
    ['Keripik Kentang 68g', 1, 11000, 8600, 9, 'pcs'],
    ['Air Mineral 600ml', 2, 3000, 2200, 64, 'pcs'],
    ['Beras Premium 5kg', 1, 68000, 61000, 0, 'karung'],
    ['Rokok Kretek 12', 3, 26500, 24000, 4, 'bungkus'],
    ['Deterjen Bubuk 800g', 4, 19500, 16800, 12, 'pcs'],
    ['Gula Pasir 1kg', 1, 16000, 14200, 15, 'kg'],
    ['Kopi Sachet Renceng', 2, 12000, 9800, 26, 'renceng'],
    ['Minyak Goreng 1L', 1, 17500, 15600, 11, 'pcs'],
  ];
  await put('products', items.map(([name, categoryId, price, hpp, stock, unit], i) => ({
    id: i + 1, name, categoryId, price, hpp, stock, unit,
    sku: 'SKU' + String(i + 1).padStart(4, '0'),
    isDeleted: 0, deletedAt: null, createdAt: now, updatedAt: now,
  })));
  // Transaksi tujuh hari terakhir: tanpa ini panel dompet dan daftar
  // transaksi hanya pernah terlihat dalam keadaan kosong, sehingga review
  // desain tidak pernah menilai bentuk yang sebenarnya dipakai orang.
  await put('paymentMethods', [
    { id: 1, name: 'Tunai', isDeleted: 0, createdAt: now, updatedAt: now },
    { id: 2, name: 'QRIS', isDeleted: 0, createdAt: now, updatedAt: now },
  ]);
  const perDay = [6, 9, 5, 11, 8, 12, 7];
  const txs = []; const lines = []; let txId = 0; let lineId = 0;
  for (let d = 6; d >= 0; d -= 1) {
    for (let n = 0; n < perDay[6 - d]; n += 1) {
      txId += 1;
      const item = items[(txId * 3) % items.length];
      const qty = 1 + (txId % 4);
      const price = item[2]; const hpp = item[3];
      const total = price * qty;
      const when = new Date(now); when.setDate(when.getDate() - d);
      when.setHours(8 + (n % 10), (n * 7) % 60, 0, 0);
      txs.push({ id: txId, subtotal: total, discountType: null, discountValue: 0, discountAmount: 0,
        total, paymentMethodId: (txId % 2) + 1, paymentAmount: total, change: 0,
        profit: (price - hpp) * qty, date: when, receiptNumber: String(1000 + txId),
        status: 'completed', createdAt: when, updatedAt: when });
      lineId += 1;
      lines.push({ id: lineId, transactionId: txId, productId: items.indexOf(item) + 1,
        productName: item[0], quantity: qty, price, hpp, discountType: null,
        discountValue: 0, discountAmount: 0, subtotal: total });
    }
  }
  await put('transactions', txs);
  await put('transactionItems', lines);
  await put('expenses', [{ id: 1, amount: 35000, note: 'Beli plastik', categoryId: 1,
    date: now, isDeleted: 0, createdAt: now, updatedAt: now }]);

  return names.join(',');
})()`);
if (!seeded) { console.error('SEMAI GAGAL: object store kosong'); process.exit(1); }
console.log('semai ok');
await evaluate(`try { localStorage.setItem('i18nextLng','id'); } catch {}`);

async function shot(name, path, before) {
  await goto(path);
  if (before) await evaluate(before);
  await sleep(1500);
  const { data } = await S('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(data, 'base64');
  writeFileSync(`${OUT}${name}.png`, buf);
  console.log(name, buf.length, 'bytes');
}

const FILL_CART = `(async () => {
  const cards = [...document.querySelectorAll('button')].filter((b) => b.closest('[data-slot="card"]'));
  cards.slice(0, 3).forEach((b) => b.click());
  await new Promise((r) => setTimeout(r, 200));
  cards.slice(0, 1).forEach((b) => b.click());
})()`;

if (MODE === 'home') {
  await shot('home-full', '/');
} else {
  await shot('mobile-beranda', '/');
  await shot('mobile-kasir', '/cashier', FILL_CART);
  await shot('mobile-kasir-kosong', '/cashier');
  await shot('mobile-laporan', '/reports');
  await shot('mobile-kasbon', '/debts');
  await shot('mobile-produk', '/products');
  await shot('mobile-riwayat', '/history');
  await shot('mobile-laporan-stok', '/stock-report');
  await shot('mobile-pengaturan', '/settings');
  await evaluate(`document.documentElement.classList.add('dark')`);
  await shot('mobile-kasir-gelap', '/cashier', `(async () => {
    document.documentElement.classList.add('dark');
    ${FILL_CART.slice(FILL_CART.indexOf('{') + 1, FILL_CART.lastIndexOf('}'))}
  })()`);
}

ws.close();
chrome.kill();
process.exit(0);
