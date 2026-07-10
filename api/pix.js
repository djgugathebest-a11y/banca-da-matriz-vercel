export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { amount, description, email } = req.body;
    const idempotencyKey = `pix-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: parseFloat(amount),
        description: String(description).substring(0, 255),
        payment_method_id: 'pix',
        payer: { email: email || 'cliente@bancadamatriz.com.br' }
      })
    });

    const data = await mpRes.json();
    const txData = data?.point_of_interaction?.transaction_data;

    if (txData?.qr_code_base64) {
      return res.status(200).json({
        qr_code: txData.qr_code,
        qr_code_base64: txData.qr_code_base64,
        payment_id: data.id,
        status: data.status
      });
    } else {
      return res.status(400).json({ error: data.message || 'QR não gerado' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
