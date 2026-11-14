(() => {
  const formulario = document.getElementById("login-form");
  const feedback = document.getElementById("login-feedback");
  if (!formulario || !feedback) return;

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (!formulario.reportValidity()) return;
    feedback.textContent = "O login ainda não está conectado a um serviço de autenticação. Nenhum dado foi enviado ou salvo.";
  });
})();
