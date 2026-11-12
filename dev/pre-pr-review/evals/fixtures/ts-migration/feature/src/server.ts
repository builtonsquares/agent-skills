import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import express from "express";
import { config } from "./config.js";
import { issueSession, requireSession } from "./session.js";
import { findCredentialsByEmail, findUserById, updateUserTimezone } from "./users.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  const credentials = await findCredentialsByEmail(email);
  if (!credentials || !(await bcrypt.compare(password, credentials.passwordHash))) {
    res.status(401).json({ error: "invalid email or password" });
    return;
  }
  issueSession(res, credentials.id);
  res.status(204).end();
});

app.get("/me", requireSession, async (_req, res) => {
  const user = await findUserById(res.locals.userId);
  if (!user) {
    res.status(404).json({ error: "user not found" });
    return;
  }
  res.json(user);
});

app.put("/me/timezone", requireSession, async (req, res) => {
  const timezone = req.body?.timezone;
  if (typeof timezone !== "string" || !isValidTimezone(timezone)) {
    res.status(400).json({ error: "timezone must be an IANA time zone name, e.g. Europe/Berlin" });
    return;
  }
  if (!(await updateUserTimezone(res.locals.userId, timezone))) {
    res.status(404).json({ error: "user not found" });
    return;
  }
  res.json({ timezone });
});

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

app.listen(config.port, () => {
  console.log(`listening on port ${config.port}`);
});
