const express = require('express');
const router = express.Router();
const { Vip } = require('../models');
const isAdmin = require('../Middleware/isAdmin');
const verifyToken = require('../Middleware/verifyToken');
const { Op, Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

function generateSlug(postDate, name) {
  const date = new Date(postDate);
  date.setDate(date.getDate() - 1); 
  const formattedDate = date.toISOString().split('T')[0]; 
  const formattedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') 
    .replace(/(^-|-$)/g, '');   
  return `${formattedDate}-${formattedName}`;
}

router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    let vipContents = req.body;

    if (Array.isArray(vipContents)) {
      vipContents = vipContents.map(item => ({
      ...item,
        slug: generateSlug(item.postDate, item.name)
      }));
      vipContents = vipContents.map(item => ({
        ...item,
        slug: uuidv4()
      }));
      const createdContents = await Vip.bulkCreate(vipContents);
      return res.status(201).json(createdContents);
    }

   vipContents.slug = generateSlug(vipContents.postDate, vipContents.name);
    vipContents.slug = uuidv4();
    const createdContent = await Vip.create(vipContents);
    res.status(201).json(createdContent);

  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar os conteúdos VIP: ' + error.message });
  }
});
//
const encodeBase64 = (data) => {
  return Buffer.from(JSON.stringify(data)).toString("base64");
};

 function getRandomLetter() {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  return letters.charAt(Math.floor(Math.random() * letters.length));
}

function obfuscateBase64(str) {
  const randomLetter = getRandomLetter();
  return str.slice(0, 2) + randomLetter + str.slice(2);
}

router.get('/search', async (req, res) => {
  try {
    const { 
      search, 
      category, 
      month,
      sortBy = 'postDate',
      sortOrder = 'DESC',
      page = 1,
      limit = 900
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (search) {
      whereClause.name = {
        [Op.iLike]: `%${search}%`
      };
    }

    if (category) {
      whereClause.category = category;
    }

    if (month) {
      whereClause.postDate = {
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn('date_part', 'month', Sequelize.col('postDate')),
            month
          )
        ]
      };
    }

    const vipContents = await Vip.findAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit,
      offset
    });

    const total = await Vip.count({ where: whereClause });

    const response = {
      page: parseInt(page),
      perPage: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
      data: vipContents
    };

    const encoded = encodeBase64(response);
    const obfuscated = obfuscateBase64(encoded);

    res.status(200).json({ data: obfuscated });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar os conteúdos: ' + error.message });
  }
});


router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 900;
    const offset = (page - 1) * limit;

    const vipContents = await Vip.findAll({
      limit,
      offset,
      order: [['postDate', 'DESC']],
    });

    const response = {
      page,
      perPage: limit,
      data: vipContents,
    };

    const encoded = encodeBase64(response);
    const obfuscated = obfuscateBase64(encoded);

    res.status(200).json({ data: obfuscated });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar os conteúdos VIP: ' + error.message });
  }
});


// GET /vip/:slug
// Função para gerar uma letra aleatória minúscula de a-z
function getRandomLetter() {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  return letters.charAt(Math.floor(Math.random() * letters.length));
}

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const vipContent = await Vip.findOne({ where: { slug } });

    if (!vipContent) {
      return res.status(404).json({ error: 'Conteúdo VIP não encontrado com esse slug' });
    }

    // Codifica em base64
    const base64 = encodeBase64(vipContent);

    // Insere uma letra aleatória minúscula na terceira posição
    const randomLetter = getRandomLetter();
    const obfuscatedResponse = base64.slice(0, 2) + randomLetter + base64.slice(2);

    res.status(200).json({ data: obfuscatedResponse });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar o conteúdo VIP por slug: ' + error.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vipContent = await Vip.findByPk(id);
    if (!vipContent) {
      return res.status(404).json({ error: 'Conteúdo VIP não encontrado' });
    }
    res.status(200).json(vipContent);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar o conteúdo VIP' });
  }
});

router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mega, mega2, pixeldrain, admavenmega, admavenmega2, admavenpixeldrain, createdAt, postDate } = req.body;

    const vipContentToUpdate = await Vip.findByPk(id);
    if (!vipContentToUpdate) {
      return res.status(404).json({ error: 'Conteúdo VIP não encontrado' });
    }

    vipContentToUpdate.name = name;
    vipContentToUpdate.mega = mega;
    vipContentToUpdate.mega2 = mega2;
    vipContentToUpdate.pixeldrain = pixeldrain;
    vipContentToUpdate.admavenmega = admavenmega;
    vipContentToUpdate.admavenmega2 = admavenmega2;
    vipContentToUpdate.admavenpixeldrain = admavenpixeldrain;
    vipContentToUpdate.createdAt = createdAt || vipContentToUpdate.createdAt;
    vipContentToUpdate.postDate = postDate || vipContentToUpdate.postDate;

    if (name || postDate) {
      vipContentToUpdate.slug = generateSlug(
        postDate || vipContentToUpdate.postDate,
        name || vipContentToUpdate.name
      );
    }

    await vipContentToUpdate.save();

    res.status(200).json(vipContentToUpdate);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar o conteúdo VIP: ' + error.message });
  }
});

router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const vipContentToDelete = await Vip.findByPk(id);
    if (!vipContentToDelete) {
      return res.status(404).json({ error: 'Conteúdo VIP não encontrado' });
    }

    await vipContentToDelete.destroy();
    res.status(200).json({ message: 'Conteúdo VIP deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar o conteúdo VIP: ' + error.message });
  }
});

module.exports = router;