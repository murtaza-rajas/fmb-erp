const cron = require('node-cron');
const stockLedgerService = require('../services/stockLedger.service');
const notificationService = require('../services/notification.service');
const userRepository = require('../repositories/user.repository');
const logger = require('../utils/logger');
const { ROLES } = require('../constants/roles');

// Daily at 07:00 — notifies Store and Procurement Head so reordering can
// happen before the day's requisitions, per the SOP's stock-monitoring step.
function scheduleReorderAlertJob() {
  cron.schedule('0 7 * * *', async () => {
    try {
      const alerts = await stockLedgerService.getReorderAlerts();
      if (alerts.length === 0) return;

      const recipients = await userRepository.findActiveByRoleNames([ROLES.STORE, ROLES.PROCUREMENT_HEAD]);
      // Cap the listed items — with a large catalog, dozens/hundreds of items
      // can fall below reorder level at once, and a notification listing all
      // of them is unreadable regardless of formatting. The full list is
      // always available at the linked Reorder Alerts page.
      const MAX_LISTED_ITEMS = 15;
      const lines = alerts.map((a) => `• ${a.item.name} (${a.currentQuantity}/${a.item.reorderLevel})`);
      const message = [
        `${alerts.length} item(s) at or below reorder level:`,
        ...lines.slice(0, MAX_LISTED_ITEMS),
        ...(lines.length > MAX_LISTED_ITEMS ? [`…and ${lines.length - MAX_LISTED_ITEMS} more — see Reorder Alerts for the full list.`] : []),
      ].join('\n');

      await Promise.all(
        recipients.map((user) =>
          notificationService
            .dispatch({ userId: user._id, type: 'low_stock_alert', title: 'Low stock alert', message, link: '/inventory/reorder-alerts' })
            .catch((err) => logger.error('Failed to dispatch reorder alert', { error: err.message, userId: user._id }))
        )
      );
    } catch (err) {
      logger.error('Reorder alert job failed', { error: err.message });
    }
  });
}

module.exports = { scheduleReorderAlertJob };
