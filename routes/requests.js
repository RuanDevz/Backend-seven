const express = require("express");
const router = express.Router();
const { Request } = require("../models"); 

// Rota para pegar todas as solicitações
router.get("/", async (req, res) => {
  try {
    const requests = await Request.findAll();
    res.json(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ message: "There was an error fetching the requests." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.id);
    if (request) {
      res.json(request);
    } else {
      res.status(404).json({ message: "Request not found." });
    }
  } catch (error) {
    console.error("Error fetching request:", error);
    res.status(500).json({ message: "There was an error fetching the request." });
  }
});

// Rota para atualizar o status da solicitação
router.put("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Request.findByPk(req.params.id);
    if (request) {
      request.status = status;
      await request.save();
      res.json({ message: "Request status updated successfully." });
    } else {
      res.status(404).json({ message: "Request not found." });
    }
  } catch (error) {
    console.error("Error updating request:", error);
    res.status(500).json({ message: "There was an error updating the request." });
  }
});

module.exports = router;
