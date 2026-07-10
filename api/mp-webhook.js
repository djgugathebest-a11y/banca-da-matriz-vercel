const https = require('https');

const FIREBASE_PROJECT = 'bancadamatriz-9f797';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('OK');

  const body = req.body || {};

  if (body.type === 'payment' && body.data && body.data.id) {
    const paymentId = body.data.id;
    const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
    const payment = await fetchMP('/v1/payments/' + paymentId, MP_TOKEN);

    if (payment.status === 'approved') {
      const orderId = payment.external_reference;
      await updateOrderStatus(orderId, paymentId);
    }
  }

  return res.status(200).send('OK');
}

function fetchMP(path, token) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.mercadopago.com',
      path: path,
      headers: { 'Authorization': 'Bearer ' + token }
    };
    https.get(options, (response) => {
      let data = '';
      response.on('data', c => data += c);
      response.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({}); }
      });
    }).on('error', () => resolve({}));
  });
}

async function updateOrderStatus(orderId, paymentId) {
  const path = '/v1/projects/' + FIREBASE_PROJECT +
    '/databases/(default)/documents/orders/' + orderId +
    '?updateMask.fieldPaths=status&updateMask.fieldPaths=paymentId&updateMask.fieldPaths=paidAt';

  const body = JSON.stringify({
    fields: {
      status: { stringValue: 'pago' },
      paymentId: { stringValue: String(paymentId) },
      paidAt: { stringValue: new Date().toISOString() }
    }
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: path,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const request = https.request(options, (response) => {
      let d = '';
      response.on('data', c => d += c);
      response.on('end', () => resolve(d));
    });
    request.on('error', resolve);
    request.write(body);
    request.end();
  });
}
