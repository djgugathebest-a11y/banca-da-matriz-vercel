const https = require('https');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { orderId, product, phone, email } = req.body;
  const MP_TOKEN = process.env.MP_ACCESS_TOKEN;

  const preference = {
    items: [{
      id: String(product.id || orderId),
      title: product.name || product.title,
      quantity: 1,
      unit_price: parseFloat(product.price),
      currency_id: 'BRL'
    }],
    payer: {
      email: email,
      phone: { number: phone }
    },
    external_reference: orderId,
    notification_url: 'https://bancadamatriz.com.br/api/mp-webhook',
    back_urls: {
      success: 'https://bancadamatriz.com.br/?status=success&order=' + orderId,
      failure: 'https://bancadamatriz.com.br/?status=failure&order=' + orderId,
      pending: 'https://bancadamatriz.com.br/?status=pending&order=' + orderId
    },
    auto_return: 'approved'
  };

  return new Promise((resolve) => {
    const body = JSON.stringify(preference);
    const options = {
      hostname: 'api.mercadopago.com',
      path: '/checkout/preferences',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MP_TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          res.status(200).json({ init_point: parsed.init_point, id: parsed.id });
          resolve();
        } catch(e) {
          res.status(500).json({ error: 'Parse error' });
          resolve();
        }
      });
    });
    request.on('error', (e) => { res.status(500).json({ error: e.message }); resolve(); });
    request.write(body);
    request.end();
  });
}
