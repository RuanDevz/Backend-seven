const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { User } = require('../models');
const Authmiddleware = require('../Middleware/Auth');

router.post('/', Authmiddleware, async (req, res) => {
  try {
    const decodedUser = req.user;

    const user = await User.findOne({ where: { id: decodedUser.id } });

    if (!user || !user.stripeSubscriptionId) {
      return res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada.' });
    }

    const subscription = await stripe.subscriptions.cancel(user.stripeSubscriptionId);

    if (!subscription) {
      return res.status(400).json({ error: 'Falha ao cancelar a assinatura na Stripe.' });
    }

    await user.save();

    return res.status(200).json({ message: 'Assinatura cancelada com sucesso.' });
  } catch (err) {
    console.error('Erro ao cancelar assinatura:', err);
    return res.status(500).json({ error: 'Erro ao cancelar assinatura. teste' });
  }
});

module.exports = router;