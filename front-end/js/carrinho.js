(() => {
  const CHAVE_CARRINHO = "levelnext-carrinho";
  const CHAVE_ESTOQUE = "levelnext-estoque";
  const CHAVE_PEDIDOS = "levelnext-pedidos";
  const produtos = {
    "headset-produto": {
      nome: "Headset Gamer Pichau Vega",
      imagem: "../imagens/headset1.webp",
      tags: ["USB", "RGB"],
      preco: 138.99,
      precoCartao: 160,
      cores: ["Preto", "Branco", "Rosa"]
    },
    "teclado-produto": {
      nome: "Teclado Gamer UltraMax",
      imagem: "../imagens/teclado1.webp",
      tags: ["USB", "Switch mecânico"],
      preco: 99.99,
      precoCartao: 120,
      cores: ["Preto", "Branco", "Azul"]
    }
  };
  const estoqueInicial = { "headset-produto": 20, "teclado-produto": 20 };
  const ler = (chave, padrao) => {
    try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; }
    catch { return padrao; }
  };
  const salvar = (chave, valor) => {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  };

  const lerEstoque = () => {
    const estoqueSalvo = ler(CHAVE_ESTOQUE, null);
    if (!estoqueSalvo || typeof estoqueSalvo !== "object" || Array.isArray(estoqueSalvo)) {
      salvar(CHAVE_ESTOQUE, estoqueInicial);
      return { ...estoqueInicial };
    }
    return Object.fromEntries(Object.entries(estoqueInicial).map(([id, inicial]) => {
      const salvo = Number(estoqueSalvo[id]);
      const quantidade = Number.isFinite(salvo) ? Math.floor(salvo) : inicial;
      return [id, Math.min(inicial, Math.max(0, quantidade))];
    }));
  };
  const lerCarrinho = () => {
    const itens = ler(CHAVE_CARRINHO, []);
    if (!Array.isArray(itens)) return [];
    return itens.filter((item) => item && typeof item === "object" && produtos[item.id]).map((item) => {
      const dados = produtos[item.id];
      const quantidade = Number(item.quantidade);
      const cor = String(item.cor || "").toLowerCase();
      return {
        id: item.id,
        quantidade: Math.min(20, Math.max(1, Number.isFinite(quantidade) ? Math.floor(quantidade) : 1)),
        cor: dados.cores.some((opcao) => opcao.toLowerCase() === cor) ? cor : dados.cores[0].toLowerCase(),
        comprado: item.comprado === true,
        ...(typeof item.pedidoId === "string" ? { pedidoId: item.pedidoId } : {})
      };
    });
  };
  const lerPedidos = () => {
    const pedidos = ler(CHAVE_PEDIDOS, []);
    if (!Array.isArray(pedidos)) return [];
    const statusValidos = new Set([
      "Aguardando pagamento", "Finalizado — indo para entrega", "Saiu para entrega", "Entregue", "Cancelado"
    ]);
    return pedidos.filter((pedido) => pedido && typeof pedido === "object" && Array.isArray(pedido.itens))
      .map((pedido) => {
        const statusAntigo = pedido.status === "Em separação" ? "Aguardando pagamento" : pedido.status;
        const itens = pedido.itens.filter((item) => item && produtos[item.id]).map((item) => {
          const quantidade = Number(item.quantidade);
          const cor = String(item.cor || "").toLowerCase();
          return {
            id: item.id,
            quantidade: Math.min(20, Math.max(1, Number.isFinite(quantidade) ? Math.floor(quantidade) : 1)),
            cor: produtos[item.id].cores.some((opcao) => opcao.toLowerCase() === cor)
              ? cor
              : produtos[item.id].cores[0].toLowerCase()
          };
        });
        return {
          ...pedido,
          id: String(pedido.id || "sem-identificador"),
          status: statusValidos.has(statusAntigo) ? statusAntigo : "Status indisponível",
          parcelas: Math.min(10, Math.max(1, Math.floor(Number(pedido.parcelas) || 1))),
          total: Number.isFinite(Number(pedido.total)) ? Math.max(0, Number(pedido.total)) : 0,
          itens
        };
      }).filter((pedido) => pedido.itens.length > 0);
  };
  const moeda = (valor) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const escaparHtml = (texto) => String(texto).replace(/[&<>"']/g, (caractere) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[caractere]);
  const calcularTotal = (itens, forma) => itens.reduce((soma, item) => {
    const produto = produtos[item.id];
    const preco = forma === "cartao" ? produto.precoCartao : produto.preco;
    return soma + preco * item.quantidade;
  }, 0);
  const criarCodigoDemonstracao = (prefixo) => `${prefixo}-${Array.from({ length: 20 }, () => Math.floor(Math.random() * 16).toString(16)).join("").toUpperCase()}`;

  const atualizarPagamento = () => {
    const forma = document.getElementById("checkout-forma-pagamento")?.value || "pix";
    const itens = lerCarrinho().filter((item) => !item.comprado);
    const total = calcularTotal(itens, forma);
    const parcelas = Number(document.getElementById("checkout-parcelas")?.value) || 1;
    const totalVisivel = document.getElementById("checkout-total");
    const valorParcela = document.getElementById("checkout-valor-parcela");
    const parcelamento = document.getElementById("checkout-parcelamento");
    const painelPix = document.getElementById("checkout-pix-demo");
    const painelBoleto = document.getElementById("checkout-boleto-demo");
    const dadosBoleto = document.getElementById("checkout-boleto-dados");
    const dadosCartao = document.getElementById("checkout-cartao-dados");

    if (parcelamento) parcelamento.hidden = forma !== "cartao";
    if (painelPix) painelPix.hidden = forma !== "pix";
    if (painelBoleto) painelBoleto.hidden = forma !== "boleto";
    if (dadosBoleto) dadosBoleto.hidden = forma !== "boleto";
    if (dadosCartao) dadosCartao.hidden = forma !== "cartao";
    if (totalVisivel) totalVisivel.textContent = moeda(total);
    if (valorParcela) valorParcela.textContent = moeda(total / parcelas);

    ["checkout-boleto-nome", "checkout-boleto-cpf"].forEach((id) => {
      const campo = document.getElementById(id);
      if (campo) campo.required = forma === "boleto";
    });
    ["checkout-cartao-nome", "checkout-cartao-numero", "checkout-cartao-validade", "checkout-cartao-cvv"].forEach((id) => {
      const campo = document.getElementById(id);
      if (campo) campo.required = forma === "cartao";
    });

    const codigoPix = document.getElementById("checkout-pix-codigo");
    if (forma === "pix" && codigoPix && !codigoPix.value) codigoPix.value = criarCodigoDemonstracao("PIX-DEMO");
    const codigoBoleto = document.getElementById("checkout-boleto-codigo");
    const vencimentoBoleto = document.getElementById("checkout-boleto-vencimento");
    if (forma === "boleto" && codigoBoleto && !codigoBoleto.value) codigoBoleto.value = criarCodigoDemonstracao("BOLETO-DEMO");
    if (forma === "boleto" && vencimentoBoleto && !vencimentoBoleto.textContent) {
      const vencimento = new Date();
      vencimento.setDate(vencimento.getDate() + 3);
      vencimentoBoleto.textContent = vencimento.toLocaleDateString("pt-BR");
    }
  };

  const ajustarMigalhasCompra = () => {
    const trilha = document.getElementById("migalhas-compra");
    if (!trilha || new URLSearchParams(window.location.search).get("origem") !== "carrinho") return;
    trilha.innerHTML = '<li><a href="index.html">Início</a></li><li><a href="carrinho.html">Carrinho</a></li><li aria-current="page">Comprar</li>';
  };

  const atualizarEstoqueVisivel = () => {
    const estoque = lerEstoque();
    document.querySelectorAll("[data-estoque-para]").forEach((alvo) => {
      const id = alvo.dataset.estoquePara;
      alvo.textContent = `Disponíveis: ${estoque[id]}`;
    });

    document.querySelectorAll(".produto").forEach((artigo) => {
      if (!produtos[artigo.id]) return;
      const disponivel = Math.max(0, Number(estoque[artigo.id]) || 0);
      const seletor = artigo.querySelector(".quantidade");
      if (seletor) {
        const selecionada = Math.max(1, Number(seletor.value) || 1);
        seletor.replaceChildren(...Array.from({ length: disponivel }, (_, indice) => {
          const opcao = document.createElement("option");
          opcao.value = String(indice + 1);
          opcao.textContent = String(indice + 1);
          return opcao;
        }));
        if (disponivel) seletor.value = String(Math.min(selecionada, disponivel));
        seletor.disabled = disponivel === 0;
      }
      const botao = artigo.querySelector("[data-adicionar-carrinho]");
      if (botao) {
        botao.dataset.rotuloOriginal ??= botao.innerHTML;
        botao.disabled = disponivel === 0;
        botao.innerHTML = disponivel === 0 ? "Indisponível" : botao.dataset.rotuloOriginal;
      }
    });
  };

  const adicionarAoCarrinho = (botao) => {
    const artigo = botao.closest(".produto");
    const id = artigo?.id;
    if (!produtos[id]) return;
    const estoque = lerEstoque();
    const itens = lerCarrinho();
    const itemExistente = itens.find((item) => item.id === id);
    if (itemExistente) return !itemExistente.comprado;
    const quantidade = Math.max(1, Number(artigo.querySelector(".quantidade")?.value) || 1);
    if (quantidade > estoque[id]) return false;
    const seletorCor = artigo.querySelector(".cor") || artigo.querySelector('select[name="cor"]');
    itens.push({ id, quantidade, cor: seletorCor?.value || "preto" });
    salvar(CHAVE_CARRINHO, itens);
    return true;
  };

  const renderizarCarrinho = () => {
    const lista = document.getElementById("carrinho-itens");
    if (!lista) return;
    const itens = lerCarrinho();
    const estoque = lerEstoque();
    const vazio = document.getElementById("carrinho-vazio");
    const resumo = document.getElementById("carrinho-resumo");
    const total = document.getElementById("carrinho-total");
    const totalContainer = document.getElementById("carrinho-total-container");
    const continuar = document.getElementById("carrinho-continuar");
    lista.replaceChildren();
    vazio.hidden = itens.length > 0;
    const itensParaComprar = itens.filter((item) => !item.comprado);
    resumo.hidden = false;
    totalContainer.hidden = itensParaComprar.length === 0;
    continuar.hidden = itensParaComprar.length === 0;
    let valorTotal = 0;
    let carrinhoAlterado = false;

    itens.forEach((item, indice) => {
      const dados = produtos[item.id];
      const disponivel = Math.max(0, Number(estoque[item.id]) || 0);
      if (!item.comprado && disponivel > 0 && item.quantidade > disponivel) {
        item.quantidade = disponivel;
        carrinhoAlterado = true;
      }
      const quantidade = item.comprado ? item.quantidade : Math.min(item.quantidade, disponivel);
      if (!item.comprado) valorTotal += dados.preco * item.quantidade;
      const artigo = document.createElement("article");
      artigo.className = "produto carrinho-item";
      artigo.innerHTML = `
        <div class="carrinho-item-resumo">
          <img src="${dados.imagem}" alt="${dados.nome}" />
          <div class="carrinho-item-dados">
            <span class="produto-nome">${dados.nome}</span>
            <span class="produto-tags">${dados.tags.map((tag) => `<span>${tag}</span>`).join("")}</span>
            <span class="produto-preco"><strong>${moeda(dados.preco)}</strong> à vista no Pix<br />ou <span class="valor-cartao">${moeda(dados.precoCartao)}</span> no cartão</span>
            <span class="produto-disponibilidade">Quantidade disponível: ${disponivel}</span>
            <div class="carrinho-item-opcoes">
              <label for="carrinho-quantidade-${indice}">Quantidade</label>
              <select id="carrinho-quantidade-${indice}" data-campo="quantidade" data-indice="${indice}" ${disponivel === 0 || item.comprado ? "disabled" : ""}>
                ${(item.comprado ? [item.quantidade] : Array.from({ length: disponivel }, (_, n) => n + 1)).map((n) => `<option value="${n}" ${n === quantidade ? "selected" : ""}>${n}</option>`).join("")}
              </select>
              <label for="carrinho-cor-${indice}">Cor</label>
              <select id="carrinho-cor-${indice}" data-campo="cor" data-indice="${indice}" ${item.comprado ? "disabled" : ""}>
                ${dados.cores.map((cor) => `<option value="${cor.toLowerCase()}" ${cor.toLowerCase() === item.cor ? "selected" : ""}>${cor}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="carrinho-item-acoes">
            ${item.comprado ? '<span class="carrinho-ja-comprado">Pedido confirmado</span>' : '<a class="linkcomprar" href="comprar.html?origem=carrinho">Comprar agora</a>'}
            <button class="carrinho-remover" type="button" data-remover="${indice}">Remover do carrinho</button>
          </div>
        </div>`;
      lista.append(artigo);
    });
    if (carrinhoAlterado) salvar(CHAVE_CARRINHO, itens);
    total.textContent = moeda(valorTotal);
  };

  const renderizarCompra = () => {
    const conteudo = document.getElementById("checkout-conteudo");
    const listaPedidos = document.getElementById("checkout-pedidos");
    if (!conteudo && !listaPedidos) return;
    if (conteudo) {
      const estoque = lerEstoque();
      const itens = lerCarrinho().filter((item) => !item.comprado);
      const temProdutoNoCarrinho = lerCarrinho().length > 0;
      const total = calcularTotal(itens, "pix");
      const dataCompra = new Date().toLocaleDateString("pt-BR", { dateStyle: "long" });
      conteudo.innerHTML = itens.length
      ? `<h2>Resumo do pedido</h2>
         <p class="checkout-data-compra">Data da compra: <time>${dataCompra}</time></p>
         <ul>${itens.map((item) => `<li>${produtos[item.id].nome} — ${item.quantidade} un.</li>`).join("")}</ul>
         <form class="checkout-form" id="checkout-form">
           <fieldset class="checkout-endereco">
             <legend>Endereço de entrega</legend>
             <label for="checkout-cep">CEP<input id="checkout-cep" name="cep" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{5}-?[0-9]{3}" placeholder="00000-000" required /></label>
             <label for="checkout-rua">Rua / Avenida<input id="checkout-rua" name="rua" autocomplete="street-address" required /></label>
             <label for="checkout-numero">Número<input id="checkout-numero" name="numero" required /></label>
             <label for="checkout-complemento">Complemento<input id="checkout-complemento" name="complemento" autocomplete="address-line2" /></label>
             <label for="checkout-bairro">Bairro<input id="checkout-bairro" name="bairro" required /></label>
             <label for="checkout-cidade">Cidade<input id="checkout-cidade" name="cidade" autocomplete="address-level2" required /></label>
             <label for="checkout-estado">Estado<select id="checkout-estado" name="estado" autocomplete="address-level1" required><option value="">Selecione</option>${["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => `<option value="${uf}">${uf}</option>`).join("")}</select></label>
           </fieldset>
           <fieldset class="checkout-pagamento">
             <legend>Forma de pagamento</legend>
             <label for="checkout-forma-pagamento">Escolha uma forma de pagamento</label>
             <select id="checkout-forma-pagamento" name="formaPagamento"><option value="pix">Pix</option><option value="boleto">Boleto</option><option value="cartao">Cartão de crédito</option></select>
             <div class="checkout-pagamento-demo" id="checkout-pix-demo">
               <p><strong>Pix de demonstração — não pagável</strong></p>
               <label for="checkout-pix-codigo">Código ilustrativo</label>
               <div class="checkout-codigo"><input id="checkout-pix-codigo" readonly /><button type="button" data-copiar-demo="checkout-pix-codigo">Copiar</button></div>
               <span class="checkout-copia-status" role="status" aria-live="polite"></span>
               <p>Uma cobrança real precisa ser gerada por um provedor de pagamentos.</p>
             </div>
             <div class="checkout-boleto-dados" id="checkout-boleto-dados" hidden>
               <label for="checkout-boleto-nome">Nome completo do pagador<input id="checkout-boleto-nome" autocomplete="name" /></label>
               <label for="checkout-boleto-cpf">CPF do pagador<input id="checkout-boleto-cpf" inputmode="numeric" pattern="[0-9]{11}" maxlength="11" placeholder="Somente números" /></label>
             </div>
             <div class="checkout-pagamento-demo" id="checkout-boleto-demo" hidden>
               <p><strong>Boleto de demonstração — não pagável</strong></p>
               <p>Vencimento ilustrativo: <time id="checkout-boleto-vencimento"></time></p>
               <label for="checkout-boleto-codigo">Linha de demonstração</label>
               <div class="checkout-codigo"><input id="checkout-boleto-codigo" readonly /><button type="button" data-copiar-demo="checkout-boleto-codigo">Copiar</button></div>
               <span class="checkout-copia-status" role="status" aria-live="polite"></span>
               <p>Este código não é um boleto bancário válido.</p>
             </div>
             <div class="checkout-cartao-dados" id="checkout-cartao-dados" hidden>
               <p class="checkout-aviso-demo">Use dados fictícios. Este formulário é apenas visual: não processa pagamentos nem envia ou salva dados do cartão.</p>
               <label for="checkout-cartao-nome">Nome impresso no cartão<input id="checkout-cartao-nome" autocomplete="off" /></label>
               <label for="checkout-cartao-numero">Número do cartão<input id="checkout-cartao-numero" inputmode="numeric" autocomplete="off" pattern="[0-9 ]{13,23}" maxlength="23" placeholder="0000 0000 0000 0000" /></label>
               <label for="checkout-cartao-validade">Validade (MM/AA)<input id="checkout-cartao-validade" autocomplete="off" pattern="(0[1-9]|1[0-2])/[0-9]{2}" maxlength="5" placeholder="MM/AA" /></label>
               <label for="checkout-cartao-cvv">Código de segurança<input id="checkout-cartao-cvv" inputmode="numeric" autocomplete="off" pattern="[0-9]{3,4}" maxlength="4" placeholder="CVV" /></label>
             </div>
             <div class="checkout-parcelamento" id="checkout-parcelamento" hidden>
               <label for="checkout-parcelas">Parcelas no cartão (até 10x)</label>
               <select id="checkout-parcelas" name="parcelas">${Array.from({ length: 10 }, (_, indice) => `<option value="${indice + 1}">${indice + 1}x</option>`).join("")}</select>
               <p>Valor por parcela: <strong id="checkout-valor-parcela">${moeda(total)}</strong></p>
             </div>
           </fieldset>
           <p class="checkout-total"><strong>Total: <span id="checkout-total">${moeda(total)}</span></strong></p>
           <button class="checkout-botao" type="button" data-confirmar-compra ${itens.some((item) => item.quantidade > estoque[item.id]) ? "disabled" : ""}>Confirmar compra</button>
         </form>`
        : `<p>${temProdutoNoCarrinho ? "Os produtos deste carrinho já foram comprados." : "Não há produtos no carrinho para comprar."}</p><a class="checkout-link" href="carrinho.html">Voltar ao carrinho</a>`;
      atualizarPagamento();
    }

    if (listaPedidos) {
      const pedidos = lerPedidos();
      listaPedidos.innerHTML = pedidos.length ? pedidos.map((pedido) => `
      <article class="checkout-pedido">
        <h3>Pedido ${escaparHtml(pedido.id)}</h3>
        <p>Data da compra: <strong>${escaparHtml(pedido.dataCompra || "")}</strong></p>
        <p>Status: <strong>${escaparHtml(pedido.status)}</strong></p>
        <ul>${pedido.itens.map((item) => `<li>${produtos[item.id].nome} — ${item.quantidade} un.</li>`).join("")}</ul>
        ${pedido.endereco ? `<p>Entrega: ${escaparHtml(pedido.endereco.rua)}, ${escaparHtml(pedido.endereco.numero)}${pedido.endereco.complemento ? `, ${escaparHtml(pedido.endereco.complemento)}` : ""} — ${escaparHtml(pedido.endereco.bairro)}, ${escaparHtml(pedido.endereco.cidade)} - ${escaparHtml(pedido.endereco.estado)}, CEP ${escaparHtml(pedido.endereco.cep)}</p>` : ""}
        ${pedido.formaPagamento ? `<p>Pagamento: ${escaparHtml(pedido.formaPagamento)}${pedido.parcelas > 1 ? ` em ${pedido.parcelas}x de ${moeda(pedido.total / pedido.parcelas)}` : ""} — Total ${moeda(pedido.total)}</p>` : ""}
        ${pedido.status === "Aguardando pagamento" ? `<p>Pedido em aberto, aguardando o pagamento.</p><div class="checkout-acoes"><button type="button" data-pagar-pedido="${escaparHtml(pedido.id)}">Simular pagamento</button><button type="button" data-cancelar-pedido="${escaparHtml(pedido.id)}">Cancelar pedido</button></div>` : ""}
        ${pedido.status === "Finalizado — indo para entrega" ? `<p>Pagamento confirmado. Pedido finalizado e indo para entrega.</p><div class="checkout-acoes"><button type="button" data-despachar-pedido="${escaparHtml(pedido.id)}">Simular saída para entrega</button><button type="button" data-cancelar-pedido="${escaparHtml(pedido.id)}">Cancelar pedido</button></div>` : ""}
        ${pedido.status === "Saiu para entrega" ? "<p>O pedido já saiu para entrega e não pode mais ser cancelado.</p>" : ""}
        ${pedido.status === "Saiu para entrega" ? `<div class="checkout-acoes"><button type="button" data-entregar-pedido="${escaparHtml(pedido.id)}">Marcar como entregue</button></div>` : ""}
        ${pedido.status === "Entregue" ? "<p>Pedido entregue.</p>" : ""}
        ${pedido.status === "Cancelado" ? "<p>Estoque devolvido aos itens disponíveis.</p>" : ""}
      </article>`).join("") : "<p>Você ainda não tem pedidos.</p>";
    }
  };

  const confirmarCompra = () => {
    const formulario = document.getElementById("checkout-form");
    if (!formulario?.reportValidity()) return;
    const carrinho = lerCarrinho();
    const itens = carrinho.filter((item) => !item.comprado);
    const estoque = lerEstoque();
    if (!itens.length || itens.some((item) => item.quantidade > estoque[item.id])) return;
    const forma = formulario.elements.formaPagamento.value;
    const parcelas = forma === "cartao" ? Number(formulario.elements.parcelas.value) : 1;
    const lerCampo = (id) => document.getElementById(id)?.value.trim() || "";
    const endereco = {
      cep: lerCampo("checkout-cep"), rua: lerCampo("checkout-rua"), numero: lerCampo("checkout-numero"),
      complemento: lerCampo("checkout-complemento"), bairro: lerCampo("checkout-bairro"),
      cidade: lerCampo("checkout-cidade"), estado: lerCampo("checkout-estado")
    };
    const total = calcularTotal(itens, forma);
    const nomePagamento = { pix: "Pix", boleto: "Boleto", cartao: "Cartão de crédito" }[forma];
    itens.forEach((item) => { estoque[item.id] -= item.quantidade; });
    const pedidos = lerPedidos();
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    itens.forEach((item) => {
      item.comprado = true;
      item.pedidoId = id;
    });
    pedidos.unshift({
      id,
      itens: itens.map(({ id: produtoId, quantidade, cor }) => ({ id: produtoId, quantidade, cor })),
      dataCompra: new Date().toLocaleDateString("pt-BR", { dateStyle: "long" }),
      endereco,
      formaPagamento: nomePagamento,
      parcelas,
      total,
      status: "Aguardando pagamento"
    });
    salvar(CHAVE_ESTOQUE, estoque);
    salvar(CHAVE_PEDIDOS, pedidos);
    salvar(CHAVE_CARRINHO, carrinho);
    window.location.href = "pedidos.html";
  };

  document.addEventListener("click", async (evento) => {
    const copiarDemo = evento.target.closest("[data-copiar-demo]");
    if (copiarDemo) {
      const campo = document.getElementById(copiarDemo.dataset.copiarDemo);
      const status = copiarDemo.closest(".checkout-pagamento-demo")?.querySelector(".checkout-copia-status");
      let copiado = false;
      if (campo?.value) {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(campo.value);
            copiado = true;
          }
        } catch { /* tenta o método de cópia compatível com páginas locais */ }
        if (!copiado) {
          campo.focus();
          campo.select();
          try { copiado = document.execCommand("copy"); } catch { copiado = false; }
          campo.setSelectionRange(0, 0);
        }
      }
      if (status) status.textContent = copiado ? "Código copiado." : "Não foi possível copiar o código.";
      return;
    }

    const botaoAdicionar = evento.target.closest("[data-adicionar-carrinho]");
    if (botaoAdicionar) adicionarAoCarrinho(botaoAdicionar);

    const comprarAgora = evento.target.closest(".produto-acoes a.linkcomprar");
    if (comprarAgora) {
      evento.preventDefault();
      if (adicionarAoCarrinho(comprarAgora)) window.location.href = comprarAgora.href;
    }

    const remover = evento.target.closest("[data-remover]");
    if (remover) {
      const itens = lerCarrinho();
      itens.splice(Number(remover.dataset.remover), 1);
      salvar(CHAVE_CARRINHO, itens);
      renderizarCarrinho();
    }

    if (evento.target.closest("[data-confirmar-compra]")) confirmarCompra();

    if (evento.target.closest("#checkout-form")) return;

    const cancelar = evento.target.closest("[data-cancelar-pedido]");
    if (cancelar) {
      const pedidos = lerPedidos();
      const pedido = pedidos.find((item) => item.id === cancelar.dataset.cancelarPedido);
      if (!pedido || !["Aguardando pagamento", "Finalizado — indo para entrega"].includes(pedido.status)) return;
      const estoque = lerEstoque();
      pedido.itens.forEach((item) => { estoque[item.id] += item.quantidade; });
      const carrinho = lerCarrinho();
      carrinho.forEach((item) => {
        if (item.pedidoId === pedido.id) {
          delete item.comprado;
          delete item.pedidoId;
        }
      });
      pedido.status = "Cancelado";
      salvar(CHAVE_ESTOQUE, estoque);
      salvar(CHAVE_PEDIDOS, pedidos);
      salvar(CHAVE_CARRINHO, carrinho);
      renderizarCarrinho();
      renderizarCompra();
      atualizarEstoqueVisivel();
    }

    const pagar = evento.target.closest("[data-pagar-pedido]");
    if (pagar) {
      const pedidos = lerPedidos();
      const pedido = pedidos.find((item) => item.id === pagar.dataset.pagarPedido);
      if (!pedido || pedido.status !== "Aguardando pagamento") return;
      pedido.status = "Finalizado — indo para entrega";
      salvar(CHAVE_PEDIDOS, pedidos);
      renderizarCompra();
    }

    const despachar = evento.target.closest("[data-despachar-pedido]");
    if (despachar) {
      const pedidos = lerPedidos();
      const pedido = pedidos.find((item) => item.id === despachar.dataset.despacharPedido);
      if (!pedido || pedido.status !== "Finalizado — indo para entrega") return;
      pedido.status = "Saiu para entrega";
      salvar(CHAVE_PEDIDOS, pedidos);
      renderizarCompra();
    }

    const entregar = evento.target.closest("[data-entregar-pedido]");
    if (entregar) {
      const pedidos = lerPedidos();
      const pedido = pedidos.find((item) => item.id === entregar.dataset.entregarPedido);
      if (!pedido || pedido.status !== "Saiu para entrega") return;
      pedido.status = "Entregue";
      salvar(CHAVE_PEDIDOS, pedidos);
      renderizarCompra();
    }
  });

  document.addEventListener("change", (evento) => {
    if (evento.target.id === "checkout-forma-pagamento" || evento.target.id === "checkout-parcelas") {
      atualizarPagamento();
      return;
    }
    const campo = evento.target.closest("[data-campo]");
    if (!campo) return;
    const itens = lerCarrinho();
    const item = itens[Number(campo.dataset.indice)];
    if (!item) return;
    if (campo.dataset.campo === "quantidade") {
      item.quantidade = Math.min(Number(campo.value), lerEstoque()[item.id]);
    } else {
      item[campo.dataset.campo] = campo.value;
    }
    salvar(CHAVE_CARRINHO, itens);
    renderizarCarrinho();
  });

  window.addEventListener("storage", () => {
    atualizarEstoqueVisivel();
    renderizarCarrinho();
    renderizarCompra();
  });
  atualizarEstoqueVisivel();
  ajustarMigalhasCompra();
  renderizarCarrinho();
  renderizarCompra();
})();
