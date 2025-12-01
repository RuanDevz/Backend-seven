const express = require('express');
const router = express.Router();
const { UnknownContent } = require('../models');
const verifyToken = require('../Middleware/verifyToken');
const isAdmin = require('../Middleware/isAdmin');
const { Op, Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { AsianContent, WesternContent, BannedContent, Vip } = require('../models');

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

// POST - Create unknown content
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    let unknownContents = req.body;

    if (Array.isArray(unknownContents)) {
      for (let i = 0; i < unknownContents.length; i++) {
        unknownContents[i].slug = uuidv4();
      }
      const createdContents = await UnknownContent.bulkCreate(unknownContents);
      return res.status(201).json(createdContents);
    } else {
      unknownContents.slug = uuidv4();
      const createdContent = await UnknownContent.create(unknownContents);
      return res.status(201).json(createdContent);
    }
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar conteúdo desconhecido: ' + error.message });
  }
});

// GET with search
router.get('/search', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { search, category, month, region, sortBy = 'postDate', sortOrder = 'DESC' } = req.query;

    let allResults = [];
    
    // Busca universal em todas as tabelas
    if (search) {
      const searchWhere = { name: { [Op.iLike]: `%${search}%` } };
      
      // Adiciona filtro de mês se especificado
      if (month) {
        searchWhere.postDate = {
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
        where: searchWhere,
        order: [[sortBy, sortOrder]],
        raw: true
      });
      
      // Busca em WesternContent
      const westernResults = await WesternContent.findAll({
        where: searchWhere,
        order: [[sortBy, sortOrder]],
        raw: true
      });
      
      // Busca em BannedContent
      const bannedResults = await BannedContent.findAll({
        where: searchWhere,
        order: [[sortBy, sortOrder]],
        raw: true
      });
      
      // Busca em UnknownContent
      const unknownResults = await UnknownContent.findAll({
        where: searchWhere,
        order: [[sortBy, sortOrder]],
        raw: true
      });
      
      // Busca em VIP
      const vipResults = await Vip.findAll({
        where: searchWhere,
        order: [[sortBy, sortOrder]],
        raw: true
      });
      
      // Adiciona tipo de conteúdo para identificação
      const asianWithType = asianResults.map(item => ({ ...item, contentType: 'asian' }));
      const westernWithType = westernResults.map(item => ({ ...item, contentType: 'western' }));
      const bannedWithType = bannedResults.map(item => ({ ...item, contentType: 'banned' }));
      const unknownWithType = unknownResults.map(item => ({ ...item, contentType: 'unknown' }));
      const vipWithType = vipResults.map(item => ({ ...item, contentType: 'vip' }));
      
      // Combina todos os resultados
      allResults = [
        ...asianWithType,
        ...westernWithType,
        ...bannedWithType,
        ...unknownWithType,
        ...vipWithType
      ];
      
      // Ordena por data
      allResults.sort((a, b) => {
        const dateA = new Date(a.postDate);
        const dateB = new Date(b.postDate);
        return sortOrder === 'DESC' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
      });
    } else {
      // Se não há busca, retorna apenas conteúdo desconhecido
      const where = {};
      if (category) {
        where.category = category;
      }
      if (region) {
        where.region = region;
      }
      if (month) {
        where.postDate = {
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn('EXTRACT', Sequelize.literal('MONTH FROM "postDate"')),
              month
            )
          ]
        };
      }
      
      const results = await UnknownContent.findAll({
        where,
        order: [[sortBy, sortOrder]],
        raw: true
      });
      
      allResults = results.map(item => ({ ...item, contentType: 'unknown' }));
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
    res.status(500).json({ error: 'Erro ao buscar conteúdos desconhecidos: ' + error.message });
  }
});

// GET all
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 900;
    const offset = (page - 1) * limit;
    const { region } = req.query;

    const where = {};
    if (region) {
      where.region = region;
    }

    const unknownContents = await UnknownContent.findAll({
      where,
      limit,
      offset,
      order: [['postDate', 'DESC']],
    });

    const payload = {
      page,
      perPage: limit,
      data: unknownContents,
    };

    const encodedPayload = encodePayloadToBase64(payload);
    res.status(200).json({ data: encodedPayload });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar conteúdos desconhecidos: ' + error.message });
  }
});

// GET by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const unknownContent = await UnknownContent.findOne({ where: { slug } });

    if (!unknownContent) {
      return res.status(404).json({ error: 'Conteúdo desconhecido não encontrado com esse slug' });
    }

    const encodedContent = encodePayloadToBase64(unknownContent);
    res.status(200).json({ data: encodedContent });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar conteúdo desconhecido por slug: ' + error.message });
  }
});

// PUT - Update
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const unknownContent = await UnknownContent.findByPk(id);
    if (!unknownContent) {
      return res.status(404).json({ error: 'Conteúdo desconhecido não encontrado' });
    }

    await unknownContent.update(updateData);
    res.status(200).json(unknownContent);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar conteúdo desconhecido: ' + error.message });
  }
});

// DELETE
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const unknownContent = await UnknownContent.findByPk(id);
    if (!unknownContent) {
      return res.status(404).json({ error: 'Conteúdo desconhecido não encontrado' });
    }

    await unknownContent.destroy();
    res.status(200).json({ message: 'Conteúdo desconhecido deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar conteúdo desconhecido: ' + error.message });
  }
});

module.exports = router;