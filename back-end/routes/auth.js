const express = require("express");
const { pool } = require("../db");
const {
  normalizeEmail,
  isValidPassword,
  parseBirthDate,
  createToken,
  hashPassword,
  verifyPassword,
  requireAuth,
} = require("../auth");

const router = express.Router();
const dummyHashPromise = hashPassword("senha-falsa-para-igualar-o-tempo");

function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax${secure}; Max-Age=${7 * 24 * 60 * 60}`,
  );
}

router.post("/register", async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = normalizeEmail(body.email);
  const password = body.password;
  const birthDate = parseBirthDate(body.birthDate);

  if (name.length < 3 || name.length > 120) {
    return res.status(400).json({ error: "Informe um nome válido." });
  }
  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Informe um e-mail válido." });
  }
  if (!birthDate) {
    return res
      .status(400)
      .json({ error: "Informe uma data de nascimento válida." });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({
      error:
        "A senha deve ter pelo menos 8 caracteres, uma letra, um número e um caractere especial.",
    });
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (name, birth_date, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email`,
      [name, birthDate, email, passwordHash],
    );
    const user = result.rows[0];
    setAuthCookie(res, createToken(user));
    return res.status(201).json({ user });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Este e-mail já está cadastrado." });
    }
    console.error("Erro no cadastro:", error);
    return res
      .status(500)
      .json({ error: "Não foi possível realizar o cadastro." });
  }
});

router.post("/login", async (req, res) => {
  const body = req.body || {};
  const email = normalizeEmail(body.email);
  const password = body.password;

  if (!email || typeof password !== "string") {
    return res.status(400).json({ error: "Informe e-mail e senha." });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = $1",
      [email],
    );
    const user = result.rows[0];

    const hash = user ? user.password_hash : await dummyHashPromise;
    const ok = await verifyPassword(password, hash);

    if (!user || !ok) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }

    setAuthCookie(res, createToken(user));
    return res.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res
      .status(500)
      .json({ error: "Não foi possível realizar o login." });
  }
});

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  return res.json({ message: "Logout realizado." });
});

function clearAuthCookie(res) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `auth_token=; HttpOnly; Path=/; SameSite=Lax${secure}; Max-Age=0`,
  );
}

router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1",
      [req.user.sub],
    );
    if (!result.rows[0]) {
      clearAuthCookie(res);
      return res.status(404).json({ error: "Usuário não encontrado." });
    }
    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return res
      .status(500)
      .json({ error: "Não foi possível carregar o usuário." });
  }
});

module.exports = router;
