const axios = require('axios');

class NotificationProxy {
    constructor() {
        this.baseUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5005/api/notifications';
    }

    async sendEmail(type, data) {
        try {
            const endpoint = type === 'delivered' ? '/mail/send-order-delivered' : 
                             type === 'refund' ? '/mail/send-refund' : 
                             '/mail/send-approval-status';
            
            await axios.post(`${this.baseUrl}${endpoint}`, data);
            console.log(`✉️ NotificationProxy: Email ${type} sent to ${data.to}`);
        } catch (error) {
            console.error(`❌ NotificationProxy Email Error:`, error.message);
        }
    }

    async emitRealtime(room, event, data) {
        try {
            await axios.post(`${this.baseUrl}/realtime/emit`, { room, event, data });
            console.log(`📢 NotificationProxy: Event ${event} emitted to room ${room}`);
        } catch (error) {
            console.error(`❌ NotificationProxy Realtime Error:`, error.message);
        }
    }
}

module.exports = new NotificationProxy();
