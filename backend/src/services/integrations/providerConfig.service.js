export function getProviderHealth() {
  const hasGmail = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  const hasResend = process.env.ENABLE_RESEND === 'true' && !!process.env.RESEND_API_KEY;
  const hasSendGrid = !!process.env.SENDGRID_API_KEY;
  const hasBrevo = !!process.env.BREVO_API_KEY;

  let emailProvider = null;
  if (hasBrevo) emailProvider = 'brevo';
  else if (hasGmail) emailProvider = 'gmail';
  else if (hasSendGrid) emailProvider = 'sendgrid';
  else if (hasResend) emailProvider = 'resend';

  return {
    email: {
      provider: emailProvider,
      configured: hasBrevo || hasGmail || hasSendGrid || hasResend,
      fromConfigured: !!process.env.BREVO_SENDER_EMAIL || !!process.env.BREVO_FROM_EMAIL || hasGmail,
    },
    image: {
      pollinations: { configured: true },
      fal: {
        configured: !!process.env.FAL_KEY,
        model: process.env.FAL_IMAGE_MODEL || 'fal-ai/flux/schnell',
      },
      cloudinary: {
        configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      },
    },
    video: {
      shotstack: {
        configured: !!process.env.SHOTSTACK_API_KEY,
        stage: process.env.SHOTSTACK_STAGE || 'stage',
      },
      creatomate: {
        configured: !!process.env.CREATOMATE_API_KEY,
      },
      cloudinary: {
        configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      },
      storyboardFallback: { configured: true },
    },
    storage: {
      cloudinary: {
        configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      },
    },
  };
}
