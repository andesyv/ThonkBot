module.exports = {
  apps: [
    {
      name: 'ThonkBot',
      script: '/app/dist/src/main.js',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
