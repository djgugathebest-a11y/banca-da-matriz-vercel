export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { orderId, productName, price, custPhone, custEmail, tipoEntrega } = req.body;

    const priceStr = parseFloat(price).toFixed(2).replace('.', ',');
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/bancadamatriz-9f797/databases/(default)/documents/notifications`;

    await fetch(firestoreUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          orderId: { stringValue: orderId },
          productName: { stringValue: productName },
          price: { doubleValue: parseFloat(price) },
          custPhone: { stringValue: custPhone },
          custEmail: { stringValue: custEmail },
          tipoEntrega: { stringValue: tipoEntrega },
          status: { stringValue: 'novo_pedido' },
          lida: { booleanValue: false },
          createdAt: { stringValue: now }
        }
      })
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
