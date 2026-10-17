/**
 * Vercel Serverless API Route: /api/booking-notifications
 * 
 * Automated Dual SMS Notification via Traccar Local Service + Cloud Fallback
 * 1. Customer Confirmation SMS with booking details & helpline
 * 2. Instant Admin New Booking Alert SMS to Safar India Fleet Manager (+91 7710080992)
 */

import handler from './send-booking-sms.js';

export const ADMIN_PHONE_NUMBER = '7710080992';
export default handler;
