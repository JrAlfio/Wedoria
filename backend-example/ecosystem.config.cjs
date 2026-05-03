module.exports = {
  apps: [
    {
      name: "withjoy-api",
      cwd: "/var/www/withjoy/backend-example",
      script: "guest-check-server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production"
      },
      max_memory_restart: "300M",
      autorestart: true
    }
  ]
};
