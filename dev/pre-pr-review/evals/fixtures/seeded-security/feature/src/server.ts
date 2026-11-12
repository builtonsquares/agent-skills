import express from "express";
import { ordersRouter } from "./routes/orders";

export const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/orders", ordersRouter);
