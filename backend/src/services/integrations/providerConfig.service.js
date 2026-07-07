export function getProviderHealth() {
  return {
    email: {
      provider: 'resend',
      configured: !!process.env.RESEND_API_KEY,
      fromConfigured: !!process.env.RESEND_FROM_EMAIL,
    },
    image: {
      pollinations: { configured: true },
      fal: {
        configured: !!process.env.FAL_KEY,
        model: process.env.FAL_IMAGE_MODEL || 'fal-ai/flux/schnell',
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
    },
    storage: {
      cloudinary: {
        configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      },
    },
  };
}
