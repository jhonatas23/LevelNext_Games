const test = require("node:test");
const assert = require("node:assert");

process.env.JWT_SECRET = "chave-falsa-so-para-testes-com-mais-de-32-caracteres";

const jwt = require("jsonwebtoken");
const {
  normalizeEmail,
  isValidPassword,
  parseBirthDate,
  createToken,
  hashPassword,
  verifyPassword,
  requireAuth,
} = require("../auth");

test("normalizeEmail remove espaços e deixa minúsculo", () => {
  assert.strictEqual(normalizeEmail("  Teste@Email.COM "), "teste@email.com");
  assert.strictEqual(normalizeEmail(undefined), "");
});

test("isValidPassword recusa senhas fracas", () => {
  assert.strictEqual(isValidPassword("abc"), false);
  assert.strictEqual(isValidPassword("senhasemnumero!"), false);
  assert.strictEqual(isValidPassword("Senha1234"), false); // sem especial
  assert.strictEqual(isValidPassword(12345678), false);
  assert.strictEqual(isValidPassword("A1!" + "a".repeat(80)), false);
});

test("isValidPassword aceita senha forte", () => {
  assert.strictEqual(isValidPassword("Senha@1234"), true);
});

test("parseBirthDate converte DD/MM/AAAA para AAAA-MM-DD", () => {
  assert.strictEqual(parseBirthDate("25/03/2005"), "2005-03-25");
});

test("parseBirthDate recusa datas inválidas", () => {
  assert.strictEqual(parseBirthDate("31/02/2005"), null);
  assert.strictEqual(parseBirthDate("2005-03-25"), null);
  assert.strictEqual(parseBirthDate("01/01/2999"), null);
  assert.strictEqual(parseBirthDate("01/01/1800"), null);
  assert.strictEqual(parseBirthDate(null), null);
});

test("hash confere com a senha certa e recusa a errada", async () => {
  const hash = await hashPassword("Senha@1234");
  assert.notStrictEqual(hash, "Senha@1234");
  assert.strictEqual(await verifyPassword("Senha@1234", hash), true);
  assert.strictEqual(await verifyPassword("outra-senha", hash), false);
});

test("createToken gera token verificável com o id do usuário", () => {
  const token = createToken({ id: 7, email: "a@b.com" });
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  assert.strictEqual(payload.sub, "7");
});

function fakeRes() {
  return {
    statusCode: null,
    status(code) { this.statusCode = code; return this; },
    json() { return this; },
  };
}

test("requireAuth responde 401 sem cookie", () => {
  const res = fakeRes();
  let chamouNext = false;
  requireAuth({ headers: {} }, res, () => { chamouNext = true; });
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(chamouNext, false);
});

test("requireAuth responde 401 com token adulterado", () => {
  const res = fakeRes();
  requireAuth({ headers: { cookie: "auth_token=token.invalido.aqui" } }, res, () => {});
  assert.strictEqual(res.statusCode, 401);
});

test("requireAuth libera com token válido", () => {
  const token = createToken({ id: 1, email: "a@b.com" });
  const req = { headers: { cookie: `auth_token=${token}` } };
  let chamouNext = false;
  requireAuth(req, fakeRes(), () => { chamouNext = true; });
  assert.strictEqual(chamouNext, true);
  assert.strictEqual(req.user.sub, "1");
});