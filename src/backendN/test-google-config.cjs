// Test Google OAuth configuration
require('dotenv').config();

// Simple implementation for testing
function getGoogleRedirectUrl() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isHttps = process.env.HTTPS === 'true';
  const apiPrefix = process.env.API_PREFIX || '/api/v1';

  // Remove leading slash from apiPrefix if present, then add it back with auth path
  const cleanApiPrefix = apiPrefix.replace(/^\/+/, '');
  const fullPath = `/${cleanApiPrefix}/auth/google/callback`;

  if (isDevelopment) {
    if (isHttps) {
      return `https://localhost:3000${fullPath}`;
    } else {
      return `http://localhost:3000${fullPath}`;
    }
  } else {
    const prodUrl = process.env.GOOGLE_WEBHOOK_PROD;
    if (prodUrl) {
      if (prodUrl.includes('/auth/google/callback')) {
        return prodUrl;
      }
      return prodUrl.replace(/\/+$/, '') + fullPath;
    }
    return `https://iwent.com.tr${fullPath}`;
  }
}

console.log('🔧 Google OAuth Configuration Test\n');

console.log('📋 Current Configuration:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- HTTPS:', process.env.HTTPS);
console.log('- API_PREFIX:', process.env.API_PREFIX);
console.log('- GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('- GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
console.log('- GOOGLE_WEBHOOK_PROD:', process.env.GOOGLE_WEBHOOK_PROD);

const redirectUrl = getGoogleRedirectUrl();
console.log('\n🎯 Generated Redirect URL:');
console.log('Current:', redirectUrl);
console.log('Should match Google Console exactly!');

console.log('\n📝 Google Console Setup:');
console.log('1. Go to: https://console.developers.google.com/');
console.log('2. APIs & Services → Credentials');
console.log('3. OAuth 2.0 Client IDs → Your Web Application');
console.log('4. Authorized redirect URIs:');
console.log('   -', redirectUrl);
console.log('\n⚠️  Make sure this URL matches exactly in Google Console!');

console.log('\n🔧 Required .env updates:');
console.log('GOOGLE_WEBHOOK_PROD="https://iwent.com.tr/api/v1/auth/google/callback"');
