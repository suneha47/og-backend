const express = require('express');
const router = express.Router();

const PAYPAL_API = 'https://api-m.paypal.com';

async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString('base64');
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('PayPal auth failed.');
  return data.access_token;
}

// POST /api/paypal/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount.' });

    const token = await getAccessToken();
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'INR', value: Number(amount).toFixed(2) },
          description: 'OG Accessories 47 Order',
        }],
      }),
    });
    const order = await response.json();
    if (!response.ok) throw new Error(order.message || 'PayPal order creation failed.');
    res.json({ id: order.id });
  } catch (err) {
    console.error('[PAYPAL CREATE ORDER]', err.message);
    res.status(500).json({ message: 'Failed to initiate PayPal payment.' });
  }
});

// POST /api/paypal/capture-order
router.post('/capture-order', async (req, res) => {
  try {
    const { orderID } = req.body;
    if (!orderID) return res.status(400).json({ message: 'Missing PayPal order ID.' });

    const token = await getAccessToken();
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'PayPal capture failed.');
    if (data.status !== 'COMPLETED') throw new Error('PayPal payment not completed.');

    const captureId = data.purchase_units[0].payments.captures[0].id;
    res.json({ success: true, captureId });
  } catch (err) {
    console.error('[PAYPAL CAPTURE ORDER]', err.message);
    res.status(500).json({ message: 'PayPal payment capture failed.' });
  }
});

module.exports = router;
