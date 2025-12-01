const express = require("express");
const router = express.Router();
const db = require("../models"); 

router.post("/", async (req, res) => {
  const { title, description, email } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: "Title and description are required." });
  }
this.arguments
  try {
    const recommendation = await db.Recommendation.create({
      title,
      description,
      email,
      status: "pending",
    });

    res.status(201).json({
      message: "Recommendation submitted successfully.",
      recommendation,
    });
  } catch (error) {
    console.error("Error submitting recommendation:", error);
    res.status(500).json({ message: "There was an error submitting your recommendation." });
  }
});

router.get("/", async (req, res) => {
  try {
    const recommendations = await db.Recommendation.findAll();

    res.status(200).json(recommendations);
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ message: "There was an error fetching the recommendations." });
  }
});

router.post("/:id/approve", async (req, res) => {
  const { id } = req.params;

  try {
    const recommendation = await db.Recommendation.findByPk(id);

    if (!recommendation) {
      return res.status(404).json({ message: "Recommendation not found" });
    }

    recommendation.status = 'approved';
    await recommendation.save();

    res.status(200).json({
      message: "Recommendation approved successfully.",
      recommendation,
    });
  } catch (error) {
    console.error("Error approving recommendation:", error);
    res.status(500).json({ message: "There was an error approving the recommendation." });
  }
});

router.post("/:id/reject", async (req, res) => {
  const { id } = req.params;

  try {
    const recommendation = await db.Recommendation.findByPk(id);

    if (!recommendation) {
      return res.status(404).json({ message: "Recommendation not found" });
    }

    recommendation.status = 'rejected';
    await recommendation.save();

    res.status(200).json({
      message: "Recommendation rejected successfully.",
      recommendation,
    });
  } catch (error) {
    console.error("Error rejecting recommendation:", error);
    res.status(500).json({ message: "There was an error rejecting the recommendation." });
  }
});

module.exports = router;
