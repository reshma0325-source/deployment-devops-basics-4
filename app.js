const http = require('node:http');

const products = [
  { id: 1, name: 'Laptop', price: 999.99 },
  { id: 2, name: 'Keyboard', price: 49.99 },
  { id: 3, name: 'Mouse', price: 29.5 },
  { id: 4, name: 'Monitor', price: 249 },
  { id: 5, name: 'Headphones', price: 89.99 },
  { id: 6, name: 'Webcam', price: 59.95 }
];

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/') {
    sendJson(res, 200, {
      name: 'pm2-ci-demo',
      status: 'ok',
      endpoints: {
        health: 'GET /health',
        listProducts: 'GET /api/products',
        getProduct: 'GET /api/products/:id',
        crash: 'GET /api/crash'
      }
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/products') {
    sendJson(res, 200, products);
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/products/')) {
    const idPart = pathname.slice('/api/products/'.length);
    const product = products.find((item) => item.id === Number(idPart));
    if (product) {
      sendJson(res, 200, product);
    } else {
      sendJson(res, 404, { status: 'error', message: `Product not found: ${idPart}` });
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/crash') {
    console.error(`[my-api] deliberate crash requested at ${new Date().toISOString()}, exiting with code 1`);
    process.exit(1);
  }

  sendJson(res, 404, {
    status: 'error',
    message: `Route not found: ${req.method} ${req.url}`
  });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`[my-api] listening on http://localhost:${port} (pid ${process.pid})`);
  });
  const shutdown = (signal) => {
    console.log(`[my-api] ${signal} received, shutting down gracefully`);
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = server;
