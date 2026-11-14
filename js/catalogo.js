(() => {
  const pagina = document.querySelector(".pagina-produtos");
  const formulario = pagina?.querySelector("form.pesquisa");
  const busca = formulario?.querySelector('input[name="pesquisa"]');
  const categoria = formulario?.querySelector('select[name="categoria"]');
  const vazio = document.getElementById("produtos-vazio");
  const artigos = [...(pagina?.querySelectorAll("article.produto") || [])];
  if (!formulario || !busca || !categoria || !vazio) return;

  const normalizar = (texto) => String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();

  const parametros = new URLSearchParams(window.location.search);
  busca.value = parametros.get("pesquisa") || "";
  categoria.value = parametros.get("categoria") || "";

  const filtrar = () => {
    const termo = normalizar(busca.value);
    const filtroCategoria = normalizar(categoria.value);
    let encontrados = 0;

    artigos.forEach((artigo) => {
      const categorias = (artigo.dataset.categorias || "").split(/\s+/).map(normalizar);
      const correspondeCategoria = !filtroCategoria || categorias.includes(filtroCategoria);
      const correspondeBusca = !termo || normalizar(artigo.textContent).includes(termo);
      const visivel = correspondeCategoria && correspondeBusca;
      artigo.hidden = !visivel;
      if (visivel) encontrados += 1;
    });

    vazio.hidden = encontrados > 0;
  };

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const parametrosAtualizados = new URLSearchParams();
    if (busca.value.trim()) parametrosAtualizados.set("pesquisa", busca.value.trim());
    if (categoria.value) parametrosAtualizados.set("categoria", categoria.value);
    const query = parametrosAtualizados.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    filtrar();
  });

  categoria.addEventListener("change", filtrar);
  busca.addEventListener("input", filtrar);
  filtrar();
})();
