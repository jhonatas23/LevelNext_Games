(() => {
  const detalhes = [...document.querySelectorAll(".produto-expansivel")];
  const visualizadores = [...document.querySelectorAll(".headset-visualizador")];
  if (!detalhes.length) return;

  const obterProdutoDoHash = () => {
    const alvo = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    return alvo?.matches(".produto") ? alvo : alvo?.closest(".produto") || null;
  };

  const sincronizarProduto = () => {
    const produtoAtivo = obterProdutoDoHash();
    detalhes.forEach((painel) => {
      painel.open = painel.closest(".produto") === produtoAtivo;
    });
  };

  const sincronizarVideos = () => {
    visualizadores.forEach((visualizador) => {
      const video = visualizador.querySelector("video");
      if (!video) return;
      if (window.location.hash === `#${visualizador.id}`) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  };

  detalhes.forEach((painel) => {
    const resumo = painel.querySelector("summary");
    resumo?.addEventListener("click", () => {
      const produto = painel.closest(".produto");
      if (!produto) return;
      if (!painel.open && window.location.hash !== `#${produto.id}`) {
        window.history.pushState({ produto: produto.id }, "", `#${produto.id}`);
      } else if (painel.open && window.location.hash === `#${produto.id}`) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      }
    });
  });

  window.addEventListener("hashchange", () => {
    sincronizarProduto();
    sincronizarVideos();
  });
  window.addEventListener("popstate", () => {
    sincronizarProduto();
    sincronizarVideos();
  });

  sincronizarProduto();
  sincronizarVideos();
})();
