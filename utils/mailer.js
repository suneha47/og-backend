const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NOTIFY_EMAIL,
    pass: process.env.NOTIFY_PASS,  // Gmail App Password
  },
});

async function sendOrderNotification(order) {
  if (!process.env.NOTIFY_EMAIL || !process.env.NOTIFY_PASS) {
    console.error('[MAILER] Missing NOTIFY_EMAIL or NOTIFY_PASS env var');
    return;
  }
  console.log('[MAILER] Sending order notification to', process.env.NOTIFY_EMAIL);

  const itemsHtml = order.items.map(i =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${i.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">×${i.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700">₹${(i.price * i.qty).toLocaleString('en-IN')}</td>
    </tr>`
  ).join('');

  const payMethod = order.payment?.method === 'cod' ? '💵 Cash on Delivery'
    : order.payment?.method === 'upi' ? '📱 UPI Payment'
    : '💳 Card / Razorpay';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4ddd3;border-radius:10px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#8a6a14,#b8921e,#d4a83c);padding:24px;text-align:center">
        <h1 style="color:#fff;font-size:22px;margin:0;letter-spacing:1px">🛍️ New Order Received!</h1>
        <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:14px">OG Accessories 47 — ${new Date(order.createdAt).toLocaleString('en-IN')}</p>
      </div>
      <div style="padding:24px">
        <div style="background:#faf9f7;border:1px solid #e4ddd3;border-radius:8px;padding:16px;margin-bottom:20px">
          <h3 style="margin:0 0 12px;color:#1c1917;font-size:15px">📦 Order #${order.orderId}</h3>
          <p style="margin:4px 0;font-size:14px;color:#6b6460"><strong style="color:#1c1917">Customer:</strong> ${order.customer.name}</p>
          <p style="margin:4px 0;font-size:14px;color:#6b6460"><strong style="color:#1c1917">Phone:</strong> <a href="tel:${order.customer.phone}" style="color:#b8921e">${order.customer.phone}</a></p>
          ${order.customer.email ? `<p style="margin:4px 0;font-size:14px;color:#6b6460"><strong style="color:#1c1917">Email:</strong> ${order.customer.email}</p>` : ''}
          <p style="margin:4px 0;font-size:14px;color:#6b6460"><strong style="color:#1c1917">Address:</strong> ${order.customer.address}</p>
          <p style="margin:8px 0 0;font-size:14px;color:#6b6460"><strong style="color:#1c1917">Payment:</strong> ${payMethod}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead>
            <tr style="background:#f2ede6">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b6460;letter-spacing:1px">ITEM</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b6460;letter-spacing:1px">QTY</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b6460;letter-spacing:1px">PRICE</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding:12px;font-weight:700;font-size:16px;color:#1c1917">Total</td>
              <td style="padding:12px;font-weight:700;font-size:18px;color:#b8921e;text-align:right">₹${Number(order.total).toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>
        <div style="text-align:center;padding-top:16px;border-top:1px solid #e4ddd3">
          <p style="font-size:13px;color:#6b6460;margin:0">Log in to your <strong>Admin Dashboard</strong> to confirm and update the order status.</p>
          <a href="https://ogaccessories.netlify.app/dashboard.html" style="display:inline-block;margin-top:12px;background:linear-gradient(135deg,#8a6a14,#b8921e);color:#fff;text-decoration:none;padding:10px 28px;border-radius:6px;font-weight:700;font-size:14px">Open Dashboard →</a>
        </div>
      </div>
    </div>`;

  await transporter.sendMail({
    from: `"OG Accessories 47" <${process.env.NOTIFY_EMAIL}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `🛍️ New Order #${order.orderId} — ₹${Number(order.total).toLocaleString('en-IN')} (${order.customer.name})`,
    html,
  });
}

module.exports = { sendOrderNotification };
