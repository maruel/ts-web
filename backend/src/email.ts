// Packages
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
const key = process.env['SENDGRID_API_KEY'] || '';
if (key) {
  sgMail.setApiKey(key);
}

/**
 * Send an email notification to a user
 * @param to Recipient email address
 * @param subject Email subject
 * @param text Email text content
 * @param html Email HTML content (optional)
 */
export async function sendEmailNotification(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<void> {
  if (!key) {
    console.log('Email not configured');
    return;
  }
  const msg = {
    to,
    from: 'notifications@example.com',
    subject,
    text,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
