const express =
  require('express');

const cors =
  require('cors');

const path =
  require('path');

const routes =
  require('./routes');

const {
  notFoundHandler,
  errorHandler
} = require('./middlewares');

const app =
  express();

const publicDirectory =
  path.join(
    __dirname,
    '..',
    'public'
  );

// ============================================================
// CONFIGURACIÓN GENERAL
// ============================================================

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(
  express.json({
    limit: '4mb'
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '4mb'
  })
);

// ============================================================
// ARCHIVOS PÚBLICOS
// ============================================================

app.use(
  express.static(
    publicDirectory
  )
);

// ============================================================
// PANEL ADMINISTRATIVO
// ============================================================

app.get(
  '/',
  (req, res) => {
    res.sendFile(
      path.join(
        publicDirectory,
        'index.html'
      )
    );
  }
);

// ============================================================
// TIENDA Y PORTAL DEL CLIENTE
// ============================================================

app.get(
  [
    '/tienda',
    '/tienda/'
  ],
  (req, res) => {
    res.sendFile(
      path.join(
        publicDirectory,
        'tienda.html'
      )
    );
  }
);

// ============================================================
// BANDEJA PRIVADA DE CADA CORREO
// ============================================================

app.get(
  [
    '/correo',
    '/correo/'
  ],
  (req, res) => {
    res.sendFile(
      path.join(
        publicDirectory,
        'correo.html'
      )
    );
  }
);

// ============================================================
// API
// ============================================================

app.use(
  '/api',
  routes
);

// ============================================================
// ERRORES
// ============================================================

app.use(
  notFoundHandler
);

app.use(
  errorHandler
);

module.exports =
  app;
