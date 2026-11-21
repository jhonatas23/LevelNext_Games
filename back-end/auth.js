const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function isValidPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 72 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function parseBirthDate(value) {
  if (typeof value !== "string") return null;

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  if (Number(year) < 1900) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return null;

  return `${year}-${month}-${day}`;
}

function createToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d", algorithm: "HS256" },
  );
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function requireAuth(req, res, next) {
  const token = req.headers.cookie
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("auth_token="))
    ?.slice("auth_token=".length);

  if (!token) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      algorithm: "HS256",
    });
    return next();
  } catch {
    return res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}

module.exports = {
  normalizeEmail,
  isValidPassword,
  parseBirthDate,
  createToken,
  hashPassword,
  verifyPassword,
  requireAuth,
};
