const express = require('express');
const { User } = require('../models');
const moment = require('moment');
const router = express.Router();

const getVipExpirationDate = (planType) => {
  if (planType === 'monthly') {
    return moment().add(1, 'month').toISOString();
  } else if (planType === 'annual') {
    return moment().add(1, 'year').toISOString(); 
  }
  throw new Error('Tipo de plano inválido');
};

router.post('/', async (req, res) => {
  const { email, planType } = req.body;

  if (!email || !planType) {
    return res.status(400).json({ error: 'Email e tipo de plano são obrigatórios' });
  }

  if (!['monthly', 'annual'].includes(planType)) {
    return res.status(400).json({ error: 'Tipo de plano inválido. Deve ser "monthly" ou "annual".' });
  }

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    let vipExpirationDate = getVipExpirationDate(planType);

    if (user.isVip && moment(user.vipExpirationDate).isAfter(moment())) {
      if (planType === 'monthly') {
        vipExpirationDate = moment(user.vipExpirationDate).add(1, 'month').toISOString();
      } else if (planType === 'annual') {
        vipExpirationDate = moment(user.vipExpirationDate).add(1, 'year').toISOString();
      }
    }

    await User.update(
      { 
        isVip: true, 
        vipExpirationDate: vipExpirationDate 
      },
      { where: { email } }
    );

    res.status(200).json({ message: 'Status VIP do usuário atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar o status VIP:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
