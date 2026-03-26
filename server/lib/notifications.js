/**
 * Notifications Module - PS-CRM
 * Handles email notifications for critical events
 */

const nodemailer = require('nodemailer');

// Configure email service (update with your SMTP settings)
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'noreply@pscrm.local',
    pass: process.env.SMTP_PASS || 'your-password'
  }
});

// Test email connection on startup
emailTransporter.verify((err, success) => {
  if (err) {
    console.warn('Email service not configured or unreachable. Email notifications disabled.');
  } else {
    console.log('Email service ready for notifications');
  }
});

/**
 * Send complaint submitted notification to department
 */
async function notifyComplaintSubmitted(complaint, department) {
  try {
    const subject = `[PS-CRM] New Complaint: ${complaint.category} - ${complaint.complaintId}`;
    const html = `
      <h2>New Complaint Received</h2>
      <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
      <p><strong>Category:</strong> ${complaint.category}</p>
      <p><strong>Priority:</strong> <span style="color: red; font-weight: bold;">${complaint.priority}</span></p>
      <p><strong>Submitted by:</strong> ${complaint.fullName} (${complaint.mobile})</p>
      <p><strong>Location:</strong> ${complaint.location_address || 'Unknown'}</p>
      <p><strong>Description:</strong></p>
      <p>${complaint.description}</p>
      <p><a href="${process.env.APP_URL || 'http://localhost:3000'}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View in Dashboard</a></p>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">This is an automated notification from PS-CRM. Please respond within 3 days to avoid escalation.</p>
    `;

    if (department.head_email) {
      await emailTransporter.sendMail({
        from: process.env.SMTP_USER || 'noreply@pscrm.local',
        to: department.head_email,
        subject: subject,
        html: html
      });
      console.log(`Notification sent to ${department.name}`);
    }
  } catch (err) {
    console.warn('Failed to send email notification:', err.message);
  }
}

/**
 * Send complaint status change notification to citizen
 */
async function notifyComplaintStatusChanged(complaint, newStatus, userEmail) {
  try {
    const statusMessages = {
      'Pending': 'Your complaint has been registered and is awaiting department review.',
      'Verified': 'Your complaint has been verified by the department.',
      'Work Started': 'The department has started working on your complaint.',
      'Resolved': 'Your complaint has been resolved. Thank you for using PS-CRM!',
      'Delayed': 'Your complaint is delayed and has been escalated for urgent attention.'
    };

    const subject = `[PS-CRM] Status Update: ${complaint.complaintId} is now ${newStatus}`;
    const html = `
      <h2>Complaint Status Update</h2>
      <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
      <p><strong>New Status:</strong> <span style="color: #007bff; font-weight: bold;">${newStatus}</span></p>
      <p><strong>Category:</strong> ${complaint.category}</p>
      <p>${statusMessages[newStatus] || 'Your complaint status has been updated.'}</p>
      <p><a href="${process.env.APP_URL || 'http://localhost:3000'}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Track Your Complaint</a></p>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">This is an automated notification from PS-CRM.</p>
    `;

    if (userEmail) {
      await emailTransporter.sendMail({
        from: process.env.SMTP_USER || 'noreply@pscrm.local',
        to: userEmail,
        subject: subject,
        html: html
      });
      console.log(`Status notification sent to citizen`);
    }
  } catch (err) {
    console.warn('Failed to send status notification:', err.message);
  }
}

/**
 * Send escalation notification
 */
async function notifyEscalation(complaint, reason, adminEmail) {
  try {
    const subject = `[PS-CRM ALERT] Complaint Escalated: ${complaint.complaintId}`;
    const html = `
      <h2 style="color: #dc3545;">⚠️ Complaint Escalated</h2>
      <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
      <p><strong>Category:</strong> ${complaint.category}</p>
      <p><strong>Priority:</strong> <span style="color: red; font-weight: bold;">${complaint.priority}</span></p>
      <p><strong>Submitted by:</strong> ${complaint.fullName}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p><strong>Location:</strong> ${complaint.location_address || 'Unknown'}</p>
      <p><a href="${process.env.APP_URL || 'http://localhost:3000'}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Escalated Complaint</a></p>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">This requires immediate admin attention.</p>
    `;

    if (adminEmail) {
      await emailTransporter.sendMail({
        from: process.env.SMTP_USER || 'noreply@pscrm.local',
        to: adminEmail,
        subject: subject,
        html: html
      });
      console.log(`Escalation alert sent to admin`);
    }
  } catch (err) {
    console.warn('Failed to send escalation notification:', err.message);
  }
}

/**
 * Send deadline warning notification
 */
async function notifyDeadlineApproaching(complaint, daysLeft, departmentEmail) {
  try {
    if (daysLeft <= 0) return; // Don't send if deadline already passed

    const subject = `[PS-CRM] Deadline Warning: ${complaint.complaintId} due in ${daysLeft} day(s)`;
    const html = `
      <h2 style="color: #ff9800;">⏰ Deadline Approaching</h2>
      <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
      <p><strong>Category:</strong> ${complaint.category}</p>
      <p><strong>Time Remaining:</strong> <span style="color: #ff9800; font-weight: bold;">${daysLeft} day(s)</span></p>
      <p><strong>Submitted by:</strong> ${complaint.fullName}</p>
      <p>Please complete the resolution or provide an update before the deadline to avoid escalation.</p>
      <p><a href="${process.env.APP_URL || 'http://localhost:3000'}" style="background: #ff9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Complaint</a></p>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">This is an automated reminder from PS-CRM.</p>
    `;

    if (departmentEmail) {
      await emailTransporter.sendMail({
        from: process.env.SMTP_USER || 'noreply@pscrm.local',
        to: departmentEmail,
        subject: subject,
        html: html
      });
      console.log(`Deadline warning sent to department`);
    }
  } catch (err) {
    console.warn('Failed to send deadline warning:', err.message);
  }
}

/**
 * Send department response notification to citizen
 */
async function notifyDepartmentResponse(complaint, response, userEmail) {
  try {
    const subject = `[PS-CRM] Department Response: ${complaint.complaintId}`;
    const html = `
      <h2>Department Response to Your Complaint</h2>
      <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
      <p><strong>Category:</strong> ${complaint.category}</p>
      <p><strong>Department Response:</strong></p>
      <p style="background: #f5f5f5; padding: 15px; border-left: 4px solid #007bff;">
        ${response}
      </p>
      <p><a href="${process.env.APP_URL || 'http://localhost:3000'}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Full Details</a></p>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">This is an automated notification from PS-CRM.</p>
    `;

    if (userEmail) {
      await emailTransporter.sendMail({
        from: process.env.SMTP_USER || 'noreply@pscrm.local',
        to: userEmail,
        subject: subject,
        html: html
      });
      console.log(`Department response notification sent to citizen`);
    }
  } catch (err) {
    console.warn('Failed to send response notification:', err.message);
  }
}

module.exports = {
  notifyComplaintSubmitted,
  notifyComplaintStatusChanged,
  notifyEscalation,
  notifyDeadlineApproaching,
  notifyDepartmentResponse
};
