// /api/add-geek.js
// Endpoint interno para o bot adicionar produtos na aba Geek do Firestore
// Protegido por BOT_SECRET (env var no Vercel)

const https = require('https');

const FIREBASE_PROJECT = 'bancadamatriz-9f797';
const FIREBASE_API_KEY = 'AIzaSyAoZYnDTl8WoCG5K3q6hjFQnVFmkAS6PZ8';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

function firestoreRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = `${FIRESTORE_BASE}${path}?key=${FIREBASE_API_KEY}`;
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function toFV(v) {
  if (typeof v === 'string')  return { stringValue: v };
  if (typeof v === 'number' && Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === 'number')  return { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (v === null || v === undefined) return { nullValue: null };
  return { stringValue: String(v) };
}

async function checkDuplicate(title) {
  const res = await firestoreRequest('GET', `/geek_products?pageSize=300`);
  if (res.status !== 200) return false;
  const docs = res.body.documents || [];
  return docs.some(doc => {
    const t = (doc.fields?.title?.stringValue || '').trim().toLowerCase();
    return t === title.trim().toLowerCase();
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Verificar secret
  const BOT_SECRET = process.env.BOT_SECRET || 'matriz-geek-bot-2024';
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (token !== BOT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, price, imageUrl, description, category, stock } = req.body || {};

  if (!title || !price) {
    return res.status(400).json({ error: 'title e price são obrigatórios' });
  }

  // Checar duplicata
  const isDuplicate = await checkDuplicate(title);
  if (isDuplicate) {
    return res.status(200).json({ status: 'skipped', message: `Produto "${title}" já existe` });
  }

  // Adicionar no Firestore
  const now = new Date().toISOString();
  const fields = {
    title:       toFV(title),
    price:       toFV(parseFloat(price)),
    category:    toFV(category || 'Outro'),
    stock:       toFV(parseInt(stock) || 1),
    imageUrl:    toFV(imageUrl || ''),
    description: toFV(description || ''),
    createdAt:   { timestampValue: now },
    createdBy:   toFV('bot-estoque-geek'),
  };

  const result = await firestoreRequest('POST', `/geek_products`, { fields });

  if (result.status !== 200) {
    console.error('Firestore error:', result.body);
    return res.status(500).json({ error: 'Erro ao salvar no Firestore', detail: result.body });
  }

  const docId = (result.body.name || '').split('/').pop();
  return res.status(200).json({ status: 'added', docId, title, price: parseFloat(price) });
}
