const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123456';
const N8N_BASE_URL = 'http://n8n-ywock00sw4ko80c4w4ogs8so:5678/webhook-test';

module.exports = { JWT_SECRET, N8N_BASE_URL };
