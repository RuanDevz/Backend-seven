// app.js (refatorado)
const express = require('express');
const cors = require('cors');
const db = require('./models');
const { Pool } = require('pg');

require('dotenv').config();
const { setupQueryMonitoring } = require('./utils/queryMonitor');

const app = express();

app.set('trust proxy', 1);

app.use(cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

// Bloqueio por referer/origin
app.use((req, res, next) => {
  const referer = req.headers.referer || '';
  const origin = req.headers.origin || '';
  const blockedDomains = ['https://bypass.city/'];

  if (blockedDomains.some(domain => referer.includes(domain) || origin.includes(domain))) {
    return res.status(403).json({ message: 'You are blocked' });
  }

  next();
});

// Keep console output consistent (sua versão anterior)
console.log = (...args) => process.stdout.write(args.join(' ') + '\n');
console.error = (...args) => process.stderr.write(args.join(' ') + '\n');

// Rotas (imports)
const webhookRouter = require('./routes/stripewebhook'); // único import do webhook
const userRouter = require('./routes/user');
const AsianRouter = require('./routes/AsianContent');
const payRouter = require('./routes/payment');
const VipRouter = require('./routes/Vip');
const Forgotpass = require('./routes/forgotpassword');
const ResetPasswordRouter = require('./routes/resetpassword');
const UpdateVipStatus = require('./routes/updatevipstatus');
const StatsRouter = require('./routes/stats');
const RequestsRouter = require('./routes/requests');
const recommendationsRouter = require('./routes/recommendations');
const contentRequestsRouter = require('./routes/contentRequests');
const authRoutes = require('./routes/authRoutes');
const renewVipRouter = require('./routes/Renewvip');
const cancelsubscriptionRouter = require('./routes/Cancelsubscription');
const filterOptionsRoutes = require('./routes/FilterOptions');
const stripeCustomerPortalRouter = require('./routes/stripeCustomerPortal');
const bannedContentRouter = require('./routes/BannedContent');
const unknownContentRouter = require('./routes/UnknownContent');
const rateLimit = require('express-rate-limit');
const checkApiKey = require('./Middleware/CheckapiKey');
const WesternRouter = require('./routes/WesternContent');
const VipAsianRouter = require('./routes/VipAsianContent');
const VipWesternRouter = require('./routes/VipWesternContent');
const VipBannedRouter = require('./routes/VipBannedContent');
const VipUnknownRouter = require('./routes/VipUnknownContent');
const universalSearchRouter = require('./routes/UniversalSearch');

// Seção: body parser com exceção do webhook (mantendo o raw for webhook)
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    // webhook route handles raw body itself (seu router deve fazer isso)
    return next();
  }
  return express.json()(req, res, next);
});

// ROTAS -> manter ordem e middlewares
app.use('/webhook', webhookRouter); // webhook primeiro para garantir raw body
app.use('/auth', userRouter);
app.use('/auth', authRoutes);
app.use('/auth', renewVipRouter);
app.use('/cancel-subscription', cancelsubscriptionRouter);
app.use('/vipcontent', checkApiKey, VipRouter);
app.use('/pay', payRouter);
app.use('/forgot-password', Forgotpass);
app.use('/reset-password', ResetPasswordRouter);
app.use('/update-vip-status', checkApiKey, UpdateVipStatus);
app.use('/api/stats', checkApiKey, StatsRouter);
app.use('/admin/requests', checkApiKey, RequestsRouter);
app.use('/content-requests', checkApiKey, contentRequestsRouter);
app.use('/filteroptions', filterOptionsRoutes);
app.use('/stripe-portal', stripeCustomerPortalRouter);
app.use('/westerncontent', checkApiKey, WesternRouter);
app.use('/asiancontent', checkApiKey, AsianRouter);
app.use('/bannedcontent', checkApiKey, bannedContentRouter);
app.use('/unknowncontent', checkApiKey, unknownContentRouter);
app.use('/vip-asiancontent', checkApiKey, VipAsianRouter);
app.use('/vip-westerncontent', checkApiKey, VipWesternRouter);
app.use('/vip-bannedcontent', checkApiKey, VipBannedRouter);
app.use('/vip-unknowncontent', checkApiKey, VipUnknownRouter);
app.use('/universal-search', checkApiKey, universalSearchRouter);
app.use('/recommendations', recommendationsRouter);

// Limiter (mantido)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Ip bloqueado.',
});
app.use(limiter);

// Bloqueio de bots e requisições suspeitas (mantido)
app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  if (/curl|wget|bot|spider/i.test(ua)) {
    return res.status(403).send('Forbidden');
  }
  next();
});

// Bloqueios por URL suspeita (mantido)
app.use((req, res, next) => {
  const url = decodeURIComponent(req.originalUrl || '');
  const bloqueios = [
    /\.bak$/i,
    /\.old$/i,
    /nice ports/i,
    /trinity/i,
    /\.git/i,
    /\.env/i,
    /wp-admin/i,
    /phpmyadmin/i
  ];

  for (const pattern of bloqueios) {
    if (pattern.test(url)) {
      console.warn(`try suspect: ${url}`);
      return res.status(403).send('Access denied.');
    }
  }
  next();
});

// ------------------------------------------------------
// Inicialização segura do Sequelize (com retries)
// ------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

app.set('trust proxy', true); //
pool.connect((err, client, done) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conexão bem-sucedida ao banco de dados');
  done();
});

// Sequelize
db.sequelize.authenticate()
  .then(() => {
    console.log('Conexão com o banco de dados Sequelize estabelecida com sucesso.');
    return db.sequelize.sync();
  })
  .then(() => {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}...`);
    });
  })
  .catch(err => {
    console.error('Erro ao conectar ao banco de dados Sequelize:', err);
  });

module.exports = app;
