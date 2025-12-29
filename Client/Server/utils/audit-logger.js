import { supabase } from '../app/supabase-admin.js';

/**
 * Audit Logger Utility
 * Creates audit log entries for tracking user actions and system events
 */

export const AuditLogger = {
    /**
     * Log an audit event
     * @param {Object} params - Audit log parameters
     * @param {string} params.userId - ID of the user performing the action
     * @param {string} params.action - Action being performed (e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.)
     * @param {string} params.resourceType - Type of resource affected (e.g., 'users', 'appointments', 'certificates')
     * @param {string} [params.resourceId] - ID of the specific resource affected
     * @param {Object} [params.oldValues] - Previous values before the change
     * @param {Object} [params.newValues] - New values after the change
     * @param {string} [params.ipAddress] - IP address of the user
     * @param {string} [params.userAgent] - User agent string
     * @param {Object} [params.req] - Express request object (to extract IP and user agent automatically)
     */
    async log({
        userId,
        action,
        resourceType,
        resourceId = null,
        oldValues = null,
        newValues = null,
        ipAddress = null,
        userAgent = null,
        req = null
    }) {
        try {
            // Extract IP and user agent from request if provided
            if (req) {
                ipAddress = ipAddress || req.ip || req.connection.remoteAddress || 'unknown';
                userAgent = userAgent || req.get('User-Agent') || 'unknown';
            }

            const auditData = {
                user_id: userId,
                action,
                resource_type: resourceType,
                resource_id: resourceId,
                old_values: oldValues,
                new_values: newValues,
                ip_address: ipAddress,
                user_agent: userAgent
            };

            const { data, error } = await supabase
                .from('audit_logs')
                .insert([auditData])
                .select()
                .single();

            if (error) {
                return null;
            }

            return data;

        } catch (error) {
            return null;
        }
    },

    /**
     * Log user authentication events
     */
    async logAuth(userId, action, req, details = {}) {
        return this.log({
            userId,
            action,
            resourceType: 'authentication',
            newValues: details,
            req
        });
    },

    /**
     * Log user management events
     */
    async logUserManagement(adminUserId, action, targetUserId, oldValues = null, newValues = null, req = null) {
        return this.log({
            userId: adminUserId,
            action,
            resourceType: 'users',
            resourceId: targetUserId,
            oldValues,
            newValues,
            req
        });
    },

    /**
     * Log appointment events
     */
    async logAppointment(userId, action, appointmentId, oldValues = null, newValues = null, req = null) {
        return this.log({
            userId,
            action,
            resourceType: 'appointments',
            resourceId: appointmentId,
            oldValues,
            newValues,
            req
        });
    },

    /**
     * Log certificate events
     */
    async logCertificate(userId, action, certificateId, oldValues = null, newValues = null, req = null) {
        return this.log({
            userId,
            action,
            resourceType: 'certificates',
            resourceId: certificateId,
            oldValues,
            newValues,
            req
        });
    },

    /**
     * Log center management events
     */
    async logCenter(userId, action, centerId, oldValues = null, newValues = null, req = null) {
        return this.log({
            userId,
            action,
            resourceType: 'centers',
            resourceId: centerId,
            oldValues,
            newValues,
            req
        });
    }
};

export default AuditLogger;
