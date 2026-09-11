import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth';
import * as service from './service';

export const paymentRoutes = Router();

// Endpoint publik callback Tripay tanpa autentikasi
paymentRoutes.post('/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-callback-signature'] as string;
    const event = req.headers['x-callback-event'] as string;
    // Raw body disimpan oleh express.json({ verify }) di app.ts. Fallback
    // stringify hanya untuk jalur yang tidak melewati parser itu (mis. test).
    const jsonBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);

    const result = await service.handleTripayCallback(jsonBody, signature, event);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

paymentRoutes.use(authenticate);

paymentRoutes.post('/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      planId: z.string(),
      method: z.string().min(1).optional(),
      customerName: z.string().min(1).optional(),
      customerEmail: z.string().email().optional(),
      customerPhone: z.string().optional(),
      mobile: z.string().optional(),
      redirectURL: z.string().optional(),
    });
    const { planId, method, customerName, customerEmail, customerPhone, mobile, redirectURL } = schema.parse(req.body);
    const result = await service.checkoutPlan(
      req.user!.id,
      planId,
      method,
      customerName ?? req.user!.name ?? '',
      customerEmail ?? req.user!.email ?? '',
      customerPhone ?? mobile,
      redirectURL,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

paymentRoutes.post('/verify/:transactionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.verifyPayment(req.params.transactionId, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

paymentRoutes.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await service.paymentHistory(req.user!.id, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
