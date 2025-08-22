module.exports = {
  apps: [{
    name: 'iwent-backend',
    script: 'dist/src/index.js',
    instances: 1,
    exec_mode: 'fork',
    node_args: '--enable-source-maps',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      API_PREFIX: '/api/v1',
      CLIENT_ORIGIN: 'https://iwent.com.tr',
      HOST: '0.0.0.0'
    }
  }]
}
