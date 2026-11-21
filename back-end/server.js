require("dotenv").config();

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32 || secret.startsWith("troque-por")) {
  console.error("JWT_SECRET ausente, curta ou ainda com o valor de exemplo.");
  process.exit(1);
}

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const { initializeDatabase } = require("./db");

const app = express();
const port = Number(process.env.PORT || 3000);
const frontEndPath = path.join(__dirname, "..", "front-end");

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "20kb" }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 });

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth", authRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(express.static(frontEndPath));

app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Rota não encontrada." }),
);

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "JSON inválido." });
  }
  console.error(error);
  return res.status(500).json({ error: "Erro interno do servidor." });
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Servidor disponível em http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Não foi possível conectar ao banco de dados:", error);
    process.exit(1);
  });
