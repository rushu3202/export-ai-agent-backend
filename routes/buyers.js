import express from "express";
import { buyers } from "../services/mockData.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { product, country } = req.body;

  // Filter mock buyers
  const results = buyers.filter(
    b => b.country.toLowerCase() === country.toLowerCase()
  );

  res.json({
    success: true,
    data: results
  });
});

export default router;