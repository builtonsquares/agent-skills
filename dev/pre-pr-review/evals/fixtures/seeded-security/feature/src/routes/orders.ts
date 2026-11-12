import { Router } from "express";
import { AuthedRequest, requireUser } from "../auth";
import { db } from "../db";
import { logger } from "../logger";

const PAYMENTS_API_KEY = "pay_prod_8f3a2c9e1b7d4f6a0e5c3b2a1d9f8e7c";

interface Order {
  id: string;
  user_id: string;
  status: string;
  total_cents: number;
}

export const ordersRouter = Router();
ordersRouter.use(requireUser);

ordersRouter.get("/search", async (req, res) => {
  const user = (req as AuthedRequest).user;
  const status = String(req.query.status ?? "open");
  const rows = await db.query<Order>(
    `SELECT * FROM orders WHERE user_id = $1 AND status = '${status}'`,
    [user.id],
  );
  res.json(rows);
});

ordersRouter.get("/:id", async (req, res) => {
  const [order] = await db.query<Order>("SELECT * FROM orders WHERE id = $1", [req.params.id]);
  if (!order) {
    return res.status(404).end();
  }
  res.json(order);
});

ordersRouter.post("/:id/pay", async (req, res) => {
  const user = (req as AuthedRequest).user;
  const [order] = await db.query<Order>(
    "SELECT * FROM orders WHERE id = $1 AND user_id = $2",
    [req.params.id, user.id],
  );
  if (!order) {
    return res.status(404).end();
  }

  logger.info("payment attempt", { orderId: order.id, card: req.body.cardNumber, cvv: req.body.cvv });

  const charge = await fetch("https://payments.example.com/charge", {
    method: "POST",
    headers: { Authorization: `Bearer ${PAYMENTS_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: order.id, amount: order.total_cents, card: req.body.cardNumber, cvv: req.body.cvv }),
  });
  if (!charge.ok) {
    return res.status(502).end();
  }

  const next = String(req.query.next ?? "/orders");
  res.redirect(next);
});
