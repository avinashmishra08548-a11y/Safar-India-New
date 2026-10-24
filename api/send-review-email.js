/**
 * Vercel Serverless API Route: /api/send-review-email
 *
 * Dispatches an automated New Customer Review Email Alert to safarindiacabs01@gmail.com
 * via Resend API (https://api.resend.com/emails) and/or EmailJS REST API
 * (https://api.emailjs.com/api/v1.0/email/send) whenever a customer submits a review.
 */

export const TARGET_REVIEW_EMAIL =
  process.env.REVIEW_ALERT_EMAIL || 'safarindiacabs01@gmail.com';

function buildReviewEmailHtml({
  customerName,
  city,
  route,
  car,
  rating,
  reviewMessage,
  submittedAt
}) {
  const starsVisual = '★'.repeat(Number(rating) || 5) + '☆'.repeat(Math.max(0, 5 - (Number(rating) || 5)));
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff;">
      <div style="background: #0f172a; color: #ffffff; padding: 20px 24px; border-bottom: 4px solid #fbbf24;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #fbbf24; font-weight: bold;">
          Safar India Cabs · Customer Feedback Alert
        </div>
        <h2 style="margin: 6px 0 0; font-size: 20px;">
          New ${rating}-Star Customer Review Submitted
        </h2>
      </div>
      <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px;">
          <div style="font-size: 18px; color: #d97706; font-weight: bold; letter-spacing: 2px;">
            ${starsVisual} <span style="font-size: 14px; color: #92400e; letter-spacing: normal;">(${rating} / 5 Stars)</span>
          </div>
          <p style="margin: 8px 0 0; font-style: italic; color: #0f172a; font-size: 15px;">
            "${reviewMessage}"
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 140px;"><strong>Customer Name:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: bold;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;"><strong>City:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${city}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;"><strong>Trip Route:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${route}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;"><strong>Cab Category:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #b45309; font-weight: bold;">${car || 'Sedan AC'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;"><strong>Submitted On:</strong></td>
            <td style="padding: 8px 0; color: #0f172a;">${submittedAt}</td>
          </tr>
        </table>
      </div>
      <div style="background: #f8fafc; padding: 14px 24px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        Automated Review Alert sent to <strong>${TARGET_REVIEW_EMAIL}</strong> · Safar India Cabs (safarindiacabs.com)
      </div>
    </div>
  `;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    const customerName = String(body.name || body.customerName || 'Verified Traveler').trim();
    const city = String(body.city || 'India').trim();
    const route = String(body.route || 'Outstation / Local Trip').trim();
    const car = String(body.car || 'Sedan AC (Dzire / Etios)').trim();
    const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
    const reviewMessage = String(body.review || body.reviewMessage || '').trim();
    const submittedAt =
      body.date ||
      new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      });

    if (!reviewMessage) {
      return res.status(400).json({
        success: false,
        error: 'Review message is required.'
      });
    }

    const emailSubject = `★ New ${rating}-Star Review from ${customerName} (${city}) - Safar India Cabs`;
    const htmlContent = buildReviewEmailHtml({
      customerName,
      city,
      route,
      car,
      rating,
      reviewMessage,
      submittedAt
    });
    const plainTextContent = [
      `NEW CUSTOMER REVIEW - SAFAR INDIA CABS`,
      `Recipient: ${TARGET_REVIEW_EMAIL}`,
      `Customer Name: ${customerName}`,
      `City: ${city}`,
      `Route: ${route}`,
      `Cab: ${car}`,
      `Star Rating: ${rating} / 5 Stars`,
      `Review Message: "${reviewMessage}"`,
      `Submitted At: ${submittedAt}`
    ].join('\n');

    const deliveryAttempts = [];
    let deliveredProvider = null;

    // 1. RESEND API Integration (https://api.resend.com/emails)
    const resendApiKey = process.env.RESEND_API_KEY || body.resendApiKey;
    if (resendApiKey && resendApiKey !== 'your_resend_api_key_here') {
      try {
        const resendFrom =
          process.env.RESEND_FROM_EMAIL || 'Safar India Cabs Reviews <onboarding@resend.dev>';
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [TARGET_REVIEW_EMAIL],
            subject: emailSubject,
            html: htmlContent,
            text: plainTextContent
          })
        });
        const resendData = await resendRes.json().catch(() => null);
        if (resendRes.ok) {
          deliveredProvider = 'resend';
          deliveryAttempts.push({ provider: 'resend', success: true, id: resendData?.id });
        } else {
          deliveryAttempts.push({
            provider: 'resend',
            success: false,
            status: resendRes.status,
            error: resendData?.message || 'Resend API error'
          });
        }
      } catch (err) {
        deliveryAttempts.push({
          provider: 'resend',
          success: false,
          error: err?.message || 'Resend network error'
        });
      }
    }

    // 2. EMAILJS REST API Integration (https://api.emailjs.com/api/v1.0/email/send)
    const emailJsServiceId =
      process.env.EMAILJS_SERVICE_ID ||
      process.env.VITE_EMAILJS_SERVICE_ID ||
      body.emailJsServiceId;
    const emailJsTemplateId =
      process.env.EMAILJS_TEMPLATE_ID ||
      process.env.VITE_EMAILJS_TEMPLATE_ID ||
      body.emailJsTemplateId;
    const emailJsPublicKey =
      process.env.EMAILJS_PUBLIC_KEY ||
      process.env.VITE_EMAILJS_PUBLIC_KEY ||
      body.emailJsPublicKey;
    const emailJsPrivateKey = process.env.EMAILJS_PRIVATE_KEY || body.emailJsPrivateKey;

    if (
      !deliveredProvider &&
      emailJsServiceId &&
      emailJsTemplateId &&
      emailJsPublicKey &&
      emailJsServiceId !== 'your_emailjs_service_id'
    ) {
      try {
        const emailJsPayload = {
          service_id: emailJsServiceId,
          template_id: emailJsTemplateId,
          user_id: emailJsPublicKey,
          ...(emailJsPrivateKey ? { accessToken: emailJsPrivateKey } : {}),
          template_params: {
            to_email: TARGET_REVIEW_EMAIL,
            customer_name: customerName,
            from_name: customerName,
            city,
            route,
            car,
            star_rating: `${rating} / 5 Stars`,
            rating: String(rating),
            review_message: reviewMessage,
            message: reviewMessage,
            submitted_at: submittedAt,
            subject: emailSubject
          }
        };

        const ejsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailJsPayload)
        });
        if (ejsRes.ok) {
          deliveredProvider = 'emailjs';
          deliveryAttempts.push({ provider: 'emailjs', success: true });
        } else {
          const ejsText = await ejsRes.text().catch(() => '');
          deliveryAttempts.push({
            provider: 'emailjs',
            success: false,
            status: ejsRes.status,
            error: ejsText
          });
        }
      } catch (err) {
        deliveryAttempts.push({
          provider: 'emailjs',
          success: false,
          error: err?.message || 'EmailJS network error'
        });
      }
    }

    // 3. Fallback Direct Email Relay to safarindiacabs01@gmail.com (FormSubmit AJAX) if neither API key is set yet
    if (!deliveredProvider) {
      try {
        const relayRes = await fetch(`https://formsubmit.co/ajax/${TARGET_REVIEW_EMAIL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            _subject: emailSubject,
            _template: 'table',
            _captcha: 'false',
            Customer_Name: customerName,
            City: city,
            Route: route,
            Cab_Booked: car,
            Star_Rating: `${rating} / 5 Stars`,
            Review_Message: reviewMessage,
            Submitted_At: submittedAt
          })
        });
        const relayData = await relayRes.json().catch(() => null);
        if (relayRes.ok) {
          deliveredProvider = 'formsubmit_relay';
          deliveryAttempts.push({ provider: 'formsubmit_relay', success: true, data: relayData });
        } else {
          deliveryAttempts.push({
            provider: 'formsubmit_relay',
            success: false,
            status: relayRes.status
          });
        }
      } catch (err) {
        deliveryAttempts.push({
          provider: 'formsubmit_relay',
          success: false,
          error: err?.message || 'Relay network error'
        });
      }
    }

    return res.status(200).json({
      success: true,
      recipient: TARGET_REVIEW_EMAIL,
      provider: deliveredProvider || 'queued',
      attempts: deliveryAttempts
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to dispatch review email alert'
    });
  }
}
