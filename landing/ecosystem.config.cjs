module.exports = {
  apps: [
    {
      name: 'kankitu-landing',
      script: 'serve',
      cwd: __dirname,
      env: {
        PM2_SERVE_PATH: './dist',
        PM2_SERVE_PORT: 3032,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html',
      },
      autorestart: true,
    },
  ],
};
