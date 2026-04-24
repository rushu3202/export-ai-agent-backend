import express from "express";
import client from "../services/openai.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { product, country } = req.body;

  const prompt = `
  Create a step-by-step export plan for exporting ${product} to ${country}.
  Keep it simple and structured in weeks.
  `;

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
  });

  res.json({
    roadmap: response.choices[0].message.content
  });
});

export default router;