const express = require('express');
const router = express.Router();
const { AsianContent, WesternContent } = require('../models');
const { Op, Sequelize } = require('sequelize');

function insertRandomChar(base64Str) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const randomChar = letters.charAt(Math.floor(Math.random() * letters.length));
  return base64Str.slice(0, 2) + randomChar + base64Str.slice(2);
}

function encodePayloadToBase64(payload) {
  const jsonStr = JSON.stringify(payload);
  const base64Str = Buffer.from(jsonStr).toString('base64');
  return insertRandomChar(base64Str);
}

// BannedContent agora funciona como agregador - não aceita mais POST

// GET with search
router.get('/search', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { search, category, month, region, sortBy = 'postDate', sortOrder = 'DESC' } = req.query;

    let allResults = [];
    
    if (search) {
      // Busca conteúdos com category='Banned' em AsianContent e WesternContent
      let whereClause = { category: 'Banned' };
      
      whereClause.name = { [Op.iLike]: `%${search}%` };
      
      // Adiciona filtro de mês se especificado
      if (month) {
        whereClause.postDate = {
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn('EXTRACT', Sequelize.literal('MONTH FROM "postDate"')),
              month
            )
          ]
        };
      }
      
      // Busca conteúdos Banned em AsianContent
      const asianBannedResults = await AsianContent.findAll({
        where: whereClause,
        order: [[sortBy, sortOrder]],
        raw: true
      });
      
      // Busca conteúdos Banned em WesternContent
      const westernBannedResults = await WesternContent.findAll({
        where: whereClause,
        order: [[sortBy, sortOrder]],
        raw: true
      });
      
      // Adiciona tipo de conteúdo para identificação
      const asianWithType = asianBannedResults.map(item => ({ ...item, contentType: 'banned', originalSource: 'asian' }));
      const westernWithType = westernBannedResults.map(item => ({ ...item, contentType: 'banned', originalSource: 'western' }));
      
      // Combina todos os resultados Banned
      allResults = [
        ...asianWithType,
        ...westernWithType
      ];
      
      // Ordena por data
      allResults.sort((a, b) => {
        const dateA = new Date(a.postDate);
        const dateB = new Date(b.postDate);
        return sortOrder === 'DESC' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
      });
    } else {
      // Se não há busca, retorna conteúdos Banned de ambas as tabelas
      let whereClause = { category: 'Banned' };
      
      if (region) {
        whereClause.region = region;
      }
      if (month) {
        whereClause.postDate = {
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn('EXTRACT', Sequelize.literal('MONTH FROM "postDate"')),
              month
            )
          ]
        };
      }
      
      // Busca em AsianContent
      const asianResults = await AsianContent.findAll({
        where: whereClause,
        order: [[sortBy, sortOrder]],
        raw: true
      });
      
      // Busca em WesternContent
      const westernResults = await WesternContent.findAll({
        where: whereClause,
        order: [[sortBy, sortOrder]],
        raw: true
      });
      
      const asianWithType = asianResults.map(item => ({ ...item, contentType: 'banned', originalSource: 'asian' }));
      const westernWithType = westernResults.map(item => ({ ...item, contentType: 'banned', originalSource: 'western' }));
      
      allResults = [...asianWithType, ...westernWithType];
      
      // Ordena por data
      allResults.sort((a, b) => {
        const dateA = new Date(a.postDate);
        const dateB = new Date(b.postDate);
        return sortOrder === 'DESC' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
      });
    }

    // Paginação manual
    const total = allResults.length;
    const paginatedResults = allResults.slice(offset, offset + limit);

    const payload = {
      page,
      perPage: limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: paginatedResults
    };

    const encodedPayload = encodePayloadToBase64(payload);
    return res.status(200).json({ data: encodedPayload });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar conteúdos banidos: ' + error.message });
  }
});

// GET all
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 900;
    const offset = (page - 1) * limit;
    const { region } = req.query;

    let whereClause = { category: 'Banned' };
    if (region) {
      whereClause.region = region;
    }

    // Busca conteúdos Banned em AsianContent
    const asianBannedContents = await AsianContent.findAll({
      where: whereClause,
      order: [['postDate', 'DESC']],
      raw: true
    });
    
    // Busca conteúdos Banned em WesternContent
    const westernBannedContents = await WesternContent.findAll({
      where: whereClause,
      order: [['postDate', 'DESC']],
      raw: true
    });
    
    // Combina e adiciona informação de origem
    const asianWithType = asianBannedContents.map(item => ({ ...item, contentType: 'banned', originalSource: 'asian' }));
    const westernWithType = westernBannedContents.map(item => ({ ...item, contentType: 'banned', originalSource: 'western' }));
    
    const allBannedContents = [...asianWithType, ...westernWithType];
    
    // Ordena por data
    allBannedContents.sort((a, b) => {
      const dateA = new Date(a.postDate);
      const dateB = new Date(b.postDate);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Aplica paginação
    const paginatedResults = allBannedContents.slice(offset, offset + limit);

    const payload = {
      page,
      perPage: limit,
      total: allBannedContents.length,
      data: paginatedResults,
    };

    const encodedPayload = encodePayloadToBase64(payload);
    res.status(200).json({ data: encodedPayload });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar conteúdos banidos: ' + error.message });
  }
});

// Rotas individuais removidas - BannedContent agora é apenas um agregador

module.exports = router;