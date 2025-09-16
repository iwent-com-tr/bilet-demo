import 'dotenv/config';

console.log('🔍 Google OAuth Configuration Test\n');

const requiredVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_WEBHOOK_DEV',
  'GOOGLE_WEBHOOK_PROD'
];

let allPresent = true;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: MISSING`);
    allPresent = false;
  } else {
    console.log(`✅ ${varName}: ${varName.includes('SECRET') ? '[HIDDEN]' : value}`);
  }
});

if (allPresent) {
  console.log('\n🎉 All required Google OAuth environment variables are configured!');
  console.log('\n📋 Next steps:');
  console.log('1. Start your server: npm start');
  console.log('2. Test the OAuth flow:');
  console.log('   POST /auth/google/start');
  console.log('   GET /auth/google/callback');
  console.log('   POST /auth/google/refresh');
} else {
  console.log('\n⚠️  Please add the missing environment variables to your .env file');
}
