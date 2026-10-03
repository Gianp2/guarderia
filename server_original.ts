import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mercado Pago Client Configuration
const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
const mpPublicKey = process.env.MERCADOPAGO_PUBLIC_KEY || '';

let mpClient: MercadoPagoConfig | null = null;
if (mpAccessToken) {
  try {
    mpClient = new MercadoPagoConfig({
      accessToken: mpAccessToken,
      options: { timeout: 8000 }
    });
  } catch (err) {
    console.error('Error initializing MercadoPagoConfig:', err);
  }
}

/**
 * Helper to update Firestore document via REST API
 */
async function updateFirestoreFeeStatus(feeId: string, status: string, paymentMethod: string, paymentId: string) {
  try {
    const projectId = firebaseConfig.projectId;
    const dbId = firebaseConfig.firestoreDatabaseId;
    const apiKey = firebaseConfig.apiKey;
    const now = new Date().toISOString();

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/fees/${feeId}?updateMask.fieldPaths=status&updateMask.fieldPaths=paidAt&updateMask.fieldPaths=paymentMethod&updateMask.fieldPaths=paymentId&updateMask.fieldPaths=updatedAt&key=${apiKey}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          status: { stringValue: status },
          paidAt: { stringValue: now },
          paymentMethod: { stringValue: paymentMethod },
          paymentId: { stringValue: String(paymentId) },
          updatedAt: { stringValue: now }
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Firestore REST update fee warning: ${res.status} - ${errText}`);
    } else {
      console.log(`Firestore fee ${feeId} updated to ${status} via server`);
    }
  } catch (error) {
    console.error('Error updating fee in Firestore:', error);
  }
}

/**
 * Helper to create/update Firestore payment record
 */
async function recordFirestorePayment(data: {
  paymentId: string;
  feeId: string;
  amount: number;
  status: string;
  method: string;
  payerEmail?: string;
  payerName?: string;
  mpStatusDetail?: string;
}) {
  try {
    const projectId = firebaseConfig.projectId;
    const dbId = firebaseConfig.firestoreDatabaseId;
    const apiKey = firebaseConfig.apiKey;
    const now = new Date().toISOString();

    const docId = `mp-${data.paymentId}`;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/payments/${docId}?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          id: { stringValue: docId },
          feeId: { stringValue: data.feeId },
          amount: { doubleValue: data.amount },
          method: { stringValue: data.method },
          status: { stringValue: data.status },
          payerEmail: { stringValue: data.payerEmail || 'tutor@mercadopago.com' },
          payerName: { stringValue: data.payerName || 'Tutor' },
          payerUserId: { stringValue: 'mercadopago-gateway' },
          childId: { stringValue: '' },
          childName: { stringValue: '' },
          mpPaymentId: { stringValue: String(data.paymentId) },
          mpStatus: { stringValue: data.status },
          mpStatusDetail: { stringValue: data.mpStatusDetail || '' },
          createdAt: { stringValue: now },
          updatedAt: { stringValue: now }
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Firestore REST record payment warning: ${res.status} - ${errText}`);
    } else {
      console.log(`Firestore payment record ${docId} recorded with status ${data.status}`);
    }
  } catch (error) {
    console.error('Error recording payment in Firestore:', error);
  }
}

// ==========================================
// MERCADO PAGO API ROUTES
// ==========================================

/**
 * Check Mercado Pago configuration status
 */
app.get('/api/mercadopago/status', (_req: Request, res: Response) => {
  const isConfigured = Boolean(mpAccessToken && mpAccessToken.trim().length > 10);
  const isSandbox = mpAccessToken.startsWith('TEST-');

  return res.json({
    configured: isConfigured,
    isSandbox,
    publicKey: mpPublicKey || null,
    message: isConfigured 
      ? `Mercado Pago está configurado y activo (${isSandbox ? 'Modo Pruebas / Sandbox' : 'Modo Producción'})`
      : 'Credencial MERCADOPAGO_ACCESS_TOKEN pendiente de configurar en variables de entorno.'
  });
});

/**
 * Create Mercado Pago Checkout Preference
 */
app.post('/api/mercadopago/create-preference', async (req: Request, res: Response) => {
  try {
    const { feeId, title, amount, payerEmail, payerName, childName } = req.body;

    if (!feeId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ 
        error: 'Datos de cuota inválidos. Se requiere feeId y un monto numérico positivo.' 
      });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;

    // If no access token is set, provide informative mock preference for development preview
    if (!mpClient || !mpAccessToken) {
      return res.json({
        success: true,
        configured: false,
        preferenceId: `pref-demo-${feeId}-${Date.now()}`,
        initPoint: null,
        sandboxInitPoint: null,
        message: 'Modo sin token: Se debe configurar MERCADOPAGO_ACCESS_TOKEN en las variables de entorno para redirección real a checkout de Mercado Pago.',
        notice: 'Configure MERCADOPAGO_ACCESS_TOKEN en el panel de secretos de AI Studio para cobros reales.'
      });
    }

    const preference = new Preference(mpClient);

    const preferenceData = {
      body: {
        items: [
          {
            id: String(feeId),
            title: title || `Cuota Guardería Nido Cuidado - ${childName || 'Alumno'}`,
            quantity: 1,
            unit_price: Math.round(Number(amount)),
            currency_id: 'ARS',
          }
        ],
        payer: {
          email: payerEmail && payerEmail.includes('@') ? payerEmail : 'tutor@nidocuidado.com',
          name: payerName || 'Tutor Nido Cuidado'
        },
        external_reference: String(feeId),
        back_urls: {
          success: `${appUrl}/familia?mp_status=approved&fee_id=${feeId}`,
          pending: `${appUrl}/familia?mp_status=pending&fee_id=${feeId}`,
          failure: `${appUrl}/familia?mp_status=failure&fee_id=${feeId}`
        },
        auto_return: 'approved' as const,
        notification_url: `${appUrl}/api/mercadopago/webhook`,
        statement_descriptor: 'NIDO CUIDADO'
      }
    };

    const response = await preference.create(preferenceData);

    return res.json({
      success: true,
      configured: true,
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point
    });
  } catch (error: any) {
    console.error('Error creating Mercado Pago preference:', error);
    return res.status(500).json({
      error: 'Error al comunicarse con Mercado Pago',
      details: error?.message || String(error)
    });
  }
});

/**
 * Mercado Pago Webhook / IPN Receiver
 * Validates transaction status using the official Mercado Pago API
 */
app.post('/api/mercadopago/webhook', async (req: Request, res: Response) => {
  try {
    const query = req.query;
    const body = req.body;

    console.log('Mercado Pago webhook received:', { query, body });

    // Determine payment ID from webhook payload or query params
    let paymentId: string | null = null;

    if (query.topic === 'payment' && query.id) {
      paymentId = String(query.id);
    } else if (query.type === 'payment' && query['data.id']) {
      paymentId = String(query['data.id']);
    } else if (body.type === 'payment' && body.data?.id) {
      paymentId = String(body.data.id);
    } else if (body.action?.startsWith('payment.') && body.data?.id) {
      paymentId = String(body.data.id);
    } else if (body.id) {
      paymentId = String(body.id);
    }

    if (!paymentId) {
      // Not a payment notification (e.g. merchant_order or test ping)
      return res.status(200).json({ received: true, message: 'Notification received but not a payment event' });
    }

    if (!mpClient || !mpAccessToken) {
      console.warn('Webhook received but MERCADOPAGO_ACCESS_TOKEN is not configured');
      return res.status(200).json({ received: true, warning: 'No access token configured' });
    }

    // Official validation: Query Mercado Pago API directly to verify payment authenticity
    const payment = new Payment(mpClient);
    const paymentData = await payment.get({ id: paymentId });

    console.log('Mercado Pago official payment validation:', {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      transaction_amount: paymentData.transaction_amount,
      external_reference: paymentData.external_reference
    });

    const feeId = paymentData.external_reference;
    const status = paymentData.status;

    if (feeId) {
      if (status === 'approved') {
        // Mark fee as paid in Firestore
        await updateFirestoreFeeStatus(feeId, 'paid', 'mercadopago', String(paymentData.id));

        // Record approved payment
        await recordFirestorePayment({
          paymentId: String(paymentData.id),
          feeId,
          amount: paymentData.transaction_amount || 0,
          status: 'approved',
          method: 'mercadopago',
          payerEmail: paymentData.payer?.email,
          payerName: paymentData.payer?.first_name ? `${paymentData.payer.first_name} ${paymentData.payer.last_name || ''}`.trim() : undefined,
          mpStatusDetail: paymentData.status_detail
        });
      } else if (status === 'in_process' || status === 'pending') {
        await updateFirestoreFeeStatus(feeId, 'in_review', 'mercadopago', String(paymentData.id));
        await recordFirestorePayment({
          paymentId: String(paymentData.id),
          feeId,
          amount: paymentData.transaction_amount || 0,
          status: 'in_process',
          method: 'mercadopago',
          payerEmail: paymentData.payer?.email,
          mpStatusDetail: paymentData.status_detail
        });
      } else if (status === 'rejected' || status === 'cancelled') {
        await recordFirestorePayment({
          paymentId: String(paymentData.id),
          feeId,
          amount: paymentData.transaction_amount || 0,
          status: 'rejected',
          method: 'mercadopago',
          payerEmail: paymentData.payer?.email,
          mpStatusDetail: paymentData.status_detail
        });
      }
    }

    return res.status(200).json({
      received: true,
      verified: true,
      paymentId: paymentData.id,
      status: paymentData.status
    });
  } catch (error: any) {
    console.error('Error processing Mercado Pago webhook:', error);
    // Always return 200 to prevent MP retry loops, but log error
    return res.status(200).json({
      received: true,
      error: error?.message || 'Error validating webhook'
    });
  }
});

// Also respond to GET on webhook for Mercado Pago ping tests
app.get('/api/mercadopago/webhook', (_req: Request, res: Response) => {
  return res.status(200).json({ status: 'ok', service: 'Mercado Pago Webhook Endpoint' });
});

/**
 * On-demand Server Payment Verification
 * Allows the frontend to request the server to query Mercado Pago official API
 * and confirm if a transaction is approved before reflecting changes.
 */
app.post('/api/mercadopago/verify-payment', async (req: Request, res: Response) => {
  try {
    const { paymentId, feeId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId requerido para verificación oficial' });
    }

    if (!mpClient || !mpAccessToken) {
      return res.status(400).json({
        verified: false,
        error: 'MERCADOPAGO_ACCESS_TOKEN no configurado en el servidor'
      });
    }

    // Query official API
    const payment = new Payment(mpClient);
    const paymentData = await payment.get({ id: String(paymentId) });

    const targetFeeId = feeId || paymentData.external_reference;

    if (paymentData.status === 'approved' && targetFeeId) {
      await updateFirestoreFeeStatus(targetFeeId, 'paid', 'mercadopago', String(paymentData.id));
      await recordFirestorePayment({
        paymentId: String(paymentData.id),
        feeId: targetFeeId,
        amount: paymentData.transaction_amount || 0,
        status: 'approved',
        method: 'mercadopago',
        payerEmail: paymentData.payer?.email,
        mpStatusDetail: paymentData.status_detail
      });
    }

    return res.json({
      verified: true,
      status: paymentData.status,
      statusDetail: paymentData.status_detail,
      amount: paymentData.transaction_amount,
      feeId: targetFeeId,
      isApproved: paymentData.status === 'approved'
    });
  } catch (error: any) {
    console.error('Error verifying payment with Mercado Pago API:', error);
    return res.status(500).json({
      verified: false,
      error: 'Error consultando API oficial de Mercado Pago',
      details: error?.message || String(error)
    });
  }
});

// ==========================================
// FRONTEND SERVING (VITE IN DEV, STATIC IN PROD)
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Guardería Nido Cuidado server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
