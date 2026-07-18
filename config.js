/* Public runtime configuration. OAuth client IDs are loaded safely from /api/auth/config. */
window.OTL_CONFIG = Object.freeze({
  apiBase: '/api',
  forceBackend: true,
  googleClientId: '',
  discordEnabled: true,
  presenceIntervalMs: 30000
});
