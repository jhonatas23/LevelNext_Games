(() => {
  const formulario = document.getElementById("cadastro-form");
  const senha = document.getElementById("senha");
  const confirmarSenha = document.getElementById("confirmsenha");
  const campoNascimento = document.getElementById("datanascimento");
  const feedback = document.getElementById("cadastro-feedback");
  if (!formulario || !senha || !confirmarSenha || !campoNascimento) return;

  const validarSenhas = () => {
    const coincidem = senha.value === confirmarSenha.value;
    confirmarSenha.setCustomValidity(coincidem ? "" : "As senhas não coincidem.");
  };
  senha.addEventListener("input", validarSenhas);
  confirmarSenha.addEventListener("input", validarSenhas);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  let calendario = null;
  if (typeof window.flatpickr === "function") {
    calendario = window.flatpickr(campoNascimento, {
      locale: "pt",
      dateFormat: "d/m/Y",
      maxDate: hoje,
      allowInput: true,
      disableMobile: true,
    });
  }

  const campoDataVisivel = calendario?.altInput || campoNascimento;
  campoDataVisivel.addEventListener("input", (evento) => {
    const campo = evento.currentTarget;
    const digitos = campo.value.replace(/\D/g, "");
    campo.setCustomValidity("");
    if (!/^\d{8}$/.test(digitos)) return;

    const dia = Number(digitos.slice(0, 2));
    const mes = Number(digitos.slice(2, 4));
    const ano = Number(digitos.slice(4, 8));
    const data = new Date(ano, mes - 1, dia);
    const dataValida = data.getFullYear() === ano
      && data.getMonth() === mes - 1
      && data.getDate() === dia
      && data <= hoje;

    if (!dataValida) {
      campo.setCustomValidity("Digite uma data válida que não seja futura.");
      return;
    }
    calendario?.setDate(data, true);
  });

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    validarSenhas();
    if (!formulario.reportValidity()) return;
    feedback.textContent = "Campos validados. Este projeto não possui serviço de cadastro; nenhum dado foi enviado ou salvo.";
  });
})();
