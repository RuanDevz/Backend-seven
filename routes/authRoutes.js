const express = require('express');
const router = express.Router();
const { User } = require('../models'); 
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 


router.post('/cancel-subscription', async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.stripeSubscriptionId) {
      return res.status(400).json({ message: 'No active subscription found' });
    }

    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await user.update({
      isSubscriptionCanceled: true, 
    });

    res.status(200).json({
      message: 'Subscription canceled successfully. You will retain VIP access until the end of the current billing period.',
      vipExpirationDate: user.vipExpirationDate,
    });

  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;

    try {
      const user = await User.findOne({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (user) {
        await user.update({
          isVip: false,
          stripeSubscriptionId: null,
        });

        console.log(`Subscription ${subscription.id} canceled. VIP removed.`);
      }
    } catch (error) {
      console.error('Error updating user after subscription cancelation:', error);
    }
  }

  res.json({ received: true });
});

module.exports = router;

