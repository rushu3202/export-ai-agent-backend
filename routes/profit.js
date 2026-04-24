import express from "express";

const router = express.Router();

router.post("/", (req, res) => {
  const { cost, price, quantity, shipping, duty } = req.body;

  const revenue = price * quantity;
  const totalCost = (cost * quantity) + shipping + (duty / 100 * revenue);
  const profit = revenue - totalCost;
  const margin = (profit / revenue) * 100;

  res.json({
    revenue,
    totalCost,
    profit,
    margin: margin.toFixed(2)
  });
});

export default router;