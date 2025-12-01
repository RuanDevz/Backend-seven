const express = require("express");
const router = express.Router();
const { User } = require("../models"); // Importando o modelo de User
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

router.get("/", async (req, res) => {
  try {
    const totalUsers = await User.count();

    const totalVIPs = await User.count({ where: { isVip: true } });

    const totalContentRecommendations = 1200; 

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const usersLastMonth = await User.count({
      where: {
        createdAt: {
          [Op.gte]: oneMonthAgo,
        },
      },
    });


    const vipPercentage = totalUsers > 0 ? ((totalVIPs / totalUsers) * 100).toFixed(2) : 0;


    res.json({
      totalUsers,
      totalVIPs,
      totalContentRecommendations,
      usersLastMonth,
      vipPercentage,
    });
  } catch (error) {
    console.error("Erro ao buscar as estatísticas:", error);
    res.status(500).json({ message: "There was an error fetching the statistics." });
  }
});

module.exports = router;
