import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Access token from environment or process.env
const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';

/**
 * Cloud Function Webhook for Mercado Pago IPN & Webhook Notifications.
 * Validates the transaction status directly through Mercado Pago's official API
 * before persisting and updating fee records in Firestore.
 */
export const mercadoPagoWebhook = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 60
  },
  async (req: any, res: any) => {
    // Only accept POST (and GET for health/validation pings from Mercado Pago)
    if (req.method === 'GET') {
      res.status(200).send('Mercado Pago Webhook endpoint active.');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const query = req.query as Record<string, any>;
      const body = req.body || {};

      logger.info('Mercado Pago webhook notification received', {
        query,
        bodyAction: body.action,
        bodyType: body.type,
        bodyId: body.data?.id || body.id
      });

      // Extract transaction ID from query params or request payload
      let paymentId: string | null = null;

      if (query.topic === 'payment' && query.id) {
        paymentId = String(query.id);
      } else if (query.type === 'payment' && query['data.id']) {
        paymentId = String(query['data.id']);
      } else if (body.type === 'payment' && body.data?.id) {
        paymentId = String(body.data.id);
      } else if (body.action?.startsWith('payment.') && body.data?.id) {
        paymentId = String(body.data.id);
      } else if (body.id && !isNaN(Number(body.id))) {
        paymentId = String(body.id);
      }

      if (!paymentId) {
        // Notification for merchant_order, plan, subscription, or test ping
        logger.info('Notification acknowledged (non-payment or missing ID)');
        res.status(200).json({ received: true, note: 'Non-payment notification acknowledged' });
        return;
      }

      if (!mpAccessToken) {
        logger.warn('MERCADOPAGO_ACCESS_TOKEN is not set in environment. Skipping API verification.');
        res.status(200).json({ received: true, warning: 'MERCADOPAGO_ACCESS_TOKEN not set' });
        return;
      }

      // 1. OFFICIAL API VALIDATION: Query Mercado Pago API to verify payment authenticity and status
      const mpClient = new MercadoPagoConfig({
        accessToken: mpAccessToken,
        options: { timeout: 10000 }
      });

      const paymentClient = new Payment(mpClient);
      const paymentData = await paymentClient.get({ id: paymentId });

      logger.info('Verified official Mercado Pago transaction:', {
        paymentId: paymentData.id,
        status: paymentData.status,
        statusDetail: paymentData.status_detail,
        amount: paymentData.transaction_amount,
        feeId: paymentData.external_reference
      });

      const feeId = paymentData.external_reference;
      const status = paymentData.status; // 'approved' | 'in_process' | 'pending' | 'rejected' | 'cancelled'
      const now = new Date().toISOString();

      if (!feeId) {
        logger.warn(`Payment ${paymentId} has no external_reference (feeId). Skipping fee update.`);
        res.status(200).json({ received: true, note: 'No external_reference found' });
        return;
      }

      const feeRef = db.collection('fees').doc(feeId);
      const feeSnap = await feeRef.get();

      if (!feeSnap.exists) {
        logger.warn(`Fee document ${feeId} not found in Firestore.`);
      }

      // 2. Persist verified payment in Firestore `payments` collection
      const paymentDocId = `mp-${paymentId}`;
      const paymentRef = db.collection('payments').doc(paymentDocId);

      const paymentRecord = {
        id: paymentDocId,
        feeId: feeId,
        childId: feeSnap.exists ? (feeSnap.data()?.childId || '') : '',
        childName: feeSnap.exists ? (feeSnap.data()?.childName || '') : '',
        amount: paymentData.transaction_amount || 0,
        method: 'mercadopago',
        status: status === 'approved' ? 'approved' : status === 'in_process' || status === 'pending' ? 'in_process' : 'rejected',
        payerUserId: feeSnap.exists ? (feeSnap.data()?.familyId || '') : '',
        payerName: paymentData.payer?.first_name ? `${paymentData.payer.first_name} ${paymentData.payer.last_name || ''}`.trim() : 'Titular Mercado Pago',
        payerEmail: paymentData.payer?.email || '',
        mpPaymentId: String(paymentData.id),
        mpStatus: status,
        mpStatusDetail: paymentData.status_detail || '',
        createdAt: now,
        updatedAt: now
      };

      await paymentRef.set(paymentRecord, { merge: true });

      // 3. Update Fee status in Firestore based on verified status
      if (status === 'approved') {
        await feeRef.set({
          status: 'paid',
          paidAt: now,
          paymentMethod: 'mercadopago',
          paymentId: String(paymentData.id),
          updatedAt: now
        }, { merge: true });

        // Record audit log
        await db.collection('auditLogs').add({
          action: 'PAGO_MERCADOPAGO_CONFIRMADO',
          entityType: 'CUOTA',
          entityId: feeId,
          performedByUserId: 'webhook-mercadopago',
          performedByUserEmail: paymentData.payer?.email || 'api@mercadopago.com',
          details: `Pago de $${paymentData.transaction_amount} confirmado por webhook oficial de Mercado Pago. ID: ${paymentData.id}`,
          timestamp: now,
          createdAt: now
        });

        logger.info(`Fee ${feeId} successfully marked as PAID in Firestore`);
      } else if (status === 'in_process' || status === 'pending') {
        await feeRef.set({
          status: 'in_review',
          paymentMethod: 'mercadopago',
          paymentId: String(paymentData.id),
          updatedAt: now
        }, { merge: true });

        logger.info(`Fee ${feeId} marked as IN_REVIEW (payment in process)`);
      } else if (status === 'rejected' || status === 'cancelled') {
        // Leave fee as pending/overdue so parent can retry
        await feeRef.set({
          updatedAt: now,
          notes: `Último intento Mercado Pago rechazado: ${paymentData.status_detail || 'Operación denegada'}`
        }, { merge: true });

        logger.info(`Fee ${feeId} updated with rejected payment notice`);
      }

      res.status(200).json({
        received: true,
        paymentId: paymentData.id,
        status: paymentData.status,
        feeId: feeId
      });
    } catch (err: any) {
      logger.error('Error processing Mercado Pago webhook in Cloud Function:', err);
      // Return 200 to prevent Mercado Pago retry storm if non-recoverable error
      res.status(200).json({ received: true, error: err?.message || String(err) });
    }
  }
);
