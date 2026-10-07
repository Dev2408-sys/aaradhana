import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import sellerRoutes from './seller.routes';
import ticketTypeRoutes from './ticket-type.routes';
import customerRoutes from './customer.routes';
import saleRoutes from './sale.routes';
import ticketRoutes from './ticket.routes';
import dashboardRoutes from './dashboard.routes';
import customerPaymentRoutes from './customer-payment.routes';
import sellerPaymentRoutes from './seller-payment.routes';
import accountingRoutes from './accounting.routes';
import eventDayRoutes from './event-day.routes';
import pricingRoutes from './pricing.routes';
import paymentSettingsRoutes from './payment-settings.routes';
import notificationRoutes from './notification.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/sellers', sellerRoutes);
router.use('/ticket-types', ticketTypeRoutes);
router.use('/event-days', eventDayRoutes);
router.use('/pricing', pricingRoutes);
router.use('/payment-settings', paymentSettingsRoutes);
router.use('/customers', customerRoutes);
router.use('/sales', saleRoutes);
router.use('/tickets', ticketRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/customer-payments', customerPaymentRoutes);
router.use('/seller-payments', sellerPaymentRoutes);
router.use('/accounting', accountingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/uploads', uploadRoutes);

export default router;
