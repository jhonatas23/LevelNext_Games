(() => {
  const formulario = document.getElementById("login-form");
  const feedback = document.getElementById("login-feedback");
  if (!formulario || !feedback) return;

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (!formulario.reportValidity()) return;
    const dados = new FormData(formulario);

    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: dados.get("email"),
        password: dados.get("senha"),
      }),
    })
      .then(async (resposta) => {
        const conteudo = await resposta.json();
        if (!resposta.ok) throw new Error(conteudo.error);
        feedback.textContent = "Login realizado com sucesso!";
        window.setTimeout(() => {
          window.location.href = "index.html";
        }, 800);
      })
      .catch((error) => {
        feedback.textContent = error.message || "Não foi possível realizar o login.";
      });
  });
})();
