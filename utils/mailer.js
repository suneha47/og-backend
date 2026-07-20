const { Resend } = require('resend');

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function itemsTable(items) {
  return items.map(i =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${i.name}${i.size ? ' ('+i.size+')' : ''}${i.color ? ' — '+i.color : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">×${i.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700">₹${(i.price * i.qty).toLocaleString('en-IN')}</td>
    </tr>`
  ).join('');
}

function payLabel(method) {
  if (method === 'upi') return '📱 UPI Payment';
  if (method === 'razorpay') return '💳 Card / Razorpay';
  return '💵 Cash on Delivery';
}

// ── Admin notification ──────────────────────────────────────────────────────
async function sendOrderNotification(order) {
  if (!process.env.RESEND_API_KEY) { console.error('[MAILER] Missing RESEND_API_KEY'); return; }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4ddd3;border-radius:10px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#8a6a14,#b8921e,#d4a83c);padding:24px;text-align:center">
        <h1 style="color:#fff;font-size:22px;margin:0">🛍️ New Order Received!</h1>
        <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:14px">OG Accessories 47 — ${new Date(order.createdAt).toLocaleString('en-IN')}</p>
      </div>
      <div style="padding:24px">
        <div style="background:#faf9f7;border:1px solid #e4ddd3;border-radius:8px;padding:16px;margin-bottom:20px">
          <h3 style="margin:0 0 12px;color:#1c1917;font-size:15px">📦 Order #${order.orderId}</h3>
          <p style="margin:4px 0;font-size:14px;color:#6b6460"><strong style="color:#1c1917">Customer:</strong> ${order.customer.name}</p>
          <p style="margin:4px 0;font-size:14px;color:#6b6460"><strong style="color:#1c1917">Phone:</strong> <a href="tel:${order.customer.phone}" style="color:#b8921e">${order.customer.phone}</a></p>
          ${order.customer.email ? `<p style="margin:4px 0;font-size:14px;color:#6b6460"><strong style="color:#1c1917">Email:</strong> ${order.customer.email}</p>` : ''}
          <p style="margin:4px 0;font-size:14px;color:#6b6460"><strong style="color:#1c1917">Address:</strong> ${order.customer.address}</p>
          <p style="margin:8px 0 0;font-size:14px;color:#6b6460"><strong style="color:#1c1917">Payment:</strong> ${payLabel(order.payment?.method)}</p>
          ${order.couponCode ? `<p style="margin:4px 0;font-size:14px;color:#6b6460"><strong style="color:#1c1917">Coupon:</strong> ${order.couponCode} (saved ₹${Number(order.couponDiscount||0).toLocaleString('en-IN')})</p>` : ''}
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead><tr style="background:#f2ede6">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b6460;letter-spacing:1px">ITEM</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b6460;letter-spacing:1px">QTY</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b6460;letter-spacing:1px">PRICE</th>
          </tr></thead>
          <tbody>${itemsTable(order.items)}</tbody>
          <tfoot><tr>
            <td colspan="2" style="padding:12px;font-weight:700;font-size:16px;color:#1c1917">Total</td>
            <td style="padding:12px;font-weight:700;font-size:18px;color:#b8921e;text-align:right">₹${Number(order.total).toLocaleString('en-IN')}</td>
          </tr></tfoot>
        </table>
        <div style="text-align:center;padding-top:16px;border-top:1px solid #e4ddd3">
          <a href="https://og-frontend.vercel.app/dashboard.html" style="display:inline-block;margin-top:12px;background:linear-gradient(135deg,#8a6a14,#b8921e);color:#fff;text-decoration:none;padding:10px 28px;border-radius:6px;font-weight:700;font-size:14px">Open Dashboard →</a>
        </div>
      </div>
    </div>`;

  await getResend().emails.send({
    from: 'OG Accessories 47 <onboarding@resend.dev>',
    to: process.env.NOTIFY_EMAIL,
    subject: `🛍️ New Order #${order.orderId} — ₹${Number(order.total).toLocaleString('en-IN')} (${order.customer.name})`,
    html,
  });
}

// ── Customer confirmation ───────────────────────────────────────────────────
async function sendCustomerConfirmation(order) {
  if (!process.env.RESEND_API_KEY) return;
  if (!order.customer?.email) return;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4ddd3;border-radius:10px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#8a6a14,#b8921e,#d4a83c);padding:24px;text-align:center">
        <h1 style="color:#fff;font-size:22px;margin:0">✅ Order Confirmed!</h1>
        <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:14px">OG Accessories 47 — Thank you for shopping with us!</p>
      </div>
      <div style="padding:24px">
        <p style="font-size:15px;color:#1c1917">Hi <strong>${order.customer.name}</strong>,</p>
        <p style="font-size:14px;color:#6b6460;line-height:1.7">Your order has been placed! We'll contact you on <strong>${order.customer.phone}</strong> to confirm delivery.</p>
        <div style="background:#faf9f7;border:1px solid #e4ddd3;border-radius:8px;padding:16px;margin:20px 0">
          <h3 style="margin:0 0 10px;color:#1c1917;font-size:15px">📦 Order #${order.orderId}</h3>
          <p style="margin:4px 0;font-size:14px;color:#6b6460"><strong style="color:#1c1917">Delivery to:</strong> ${order.customer.address}</p>
          <p style="margin:4px 0;font-size:14px;color:#6b6460"><strong style="color:#1c1917">Payment:</strong> ${payLabel(order.payment?.method)}</p>
          ${order.couponCode ? `<p style="margin:4px 0;font-size:14px;color:green"><strong>Coupon ${order.couponCode}:</strong> You saved ₹${Number(order.couponDiscount||0).toLocaleString('en-IN')}!</p>` : ''}
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead><tr style="background:#f2ede6">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b6460;letter-spacing:1px">ITEM</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b6460;letter-spacing:1px">QTY</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b6460;letter-spacing:1px">PRICE</th>
          </tr></thead>
          <tbody>${itemsTable(order.items)}</tbody>
          <tfoot><tr>
            <td colspan="2" style="padding:12px;font-weight:700;font-size:16px;color:#1c1917">Total</td>
            <td style="padding:12px;font-weight:700;font-size:18px;color:#b8921e;text-align:right">₹${Number(order.total).toLocaleString('en-IN')}</td>
          </tr></tfoot>
        </table>
        <div style="background:#fff8e8;border:1px solid #f0d080;border-radius:8px;padding:14px;text-align:center;margin-bottom:20px">
          <p style="margin:0;font-size:14px;color:#8a6a14"><strong>Questions? WhatsApp us:</strong><br>
          <a href="https://wa.me/918146805002" style="color:#b8921e;font-weight:700;font-size:16px">+91 81468-05002</a></p>
        </div>
        <p style="font-size:12px;color:#aaa;text-align:center;margin:0">OG Accessories 47 · Old Talwandi Road, Zira, Ferozepur, Punjab</p>
      </div>
    </div>`;

  await getResend().emails.send({
    from: 'OG Accessories 47 <onboarding@resend.dev>',
    to: order.customer.email,
    subject: `✅ Order #${order.orderId} Confirmed — ₹${Number(order.total).toLocaleString('en-IN')} | OG Accessories 47`,
    html,
  });
}

// ── Password reset ──────────────────────────────────────────────────────────
async function sendPasswordResetEmail(user, resetUrl) {
  if (!process.env.RESEND_API_KEY) return;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #e4ddd3;border-radius:10px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#8a6a14,#b8921e,#d4a83c);padding:24px;text-align:center">
        <h1 style="color:#fff;font-size:22px;margin:0">🔐 Reset Your Password</h1>
        <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:14px">OG Accessories 47</p>
      </div>
      <div style="padding:28px">
        <p style="font-size:15px;color:#1c1917">Hi <strong>${user.name}</strong>,</p>
        <p style="font-size:14px;color:#6b6460;line-height:1.7">We received a request to reset your password. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#8a6a14,#b8921e);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px">Reset Password →</a>
        </div>
        <p style="font-size:13px;color:#aaa;line-height:1.6">If you didn't request this, you can safely ignore this email. Your password will not change.</p>
        <hr style="border:none;border-top:1px solid #e4ddd3;margin:20px 0"/>
        <p style="font-size:12px;color:#aaa;text-align:center;margin:0">OG Accessories 47 · Old Talwandi Road, Zira, Ferozepur, Punjab</p>
      </div>
    </div>`;

  await getResend().emails.send({
    from: 'OG Accessories 47 <onboarding@resend.dev>',
    to: user.email,
    subject: '🔐 Reset your OG Accessories 47 password',
    html,
  });
}

module.exports = { sendOrderNotification, sendCustomerConfirmation, sendPasswordResetEmail };
