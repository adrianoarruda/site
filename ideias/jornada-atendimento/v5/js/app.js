// Versão pública: valores ilustrativos só para o desenho dos gráficos; os números na tela aparecem como 0.
const SEGMENTOS = [
  { nome: "Autoatendimento digital", nivel: 1 },
  { nome: "Atendimento assistido", nivel: 2 },
  { nome: "Reclamação formal", nivel: 3 },
  { nome: "Autoatendimento físico", nivel: 1 },
];

const canais = [
  {
    seg: 0, grupo: "Autoatendimento digital", canal: "App", icone: "app", rotuloVolume: "Sessões no mês", unidade: "sessões no mês",
    metrica: { nome: "MAU", tipo: "qtd", valor: 1240000, var: 2.10, desc: "Usuários únicos que acessaram o app pelo menos uma vez no mês." },
    anel: { pct: 91, rotulo: "Resolução", desc: "sem contato humano" },
    csat: 4.48, csatVar: +0.06,
    etapas: [
      { nome: "Consultas", vol: 3120000, var: 3.40, metrica: "97%", rotulo: "sucesso", semente: 2 },
      { nome: "Transações", vol: 1380000, var: 5.20, metrica: "94%", rotulo: "sucesso", semente: 4 },
      { nome: "Contratações", vol: 312000, var: -1.80, metrica: "12%", rotulo: "conversão", semente: 6 },
    ],
    motivos: [
      ["Saldo e extrato", 1204310], ["Pix: enviar", 842115], ["Fatura do cartão", 455902], ["Pagamento de boleto", 318774],
      ["Limite do cartão", 201346], ["Investimentos", 133580], ["Empréstimo: simulação", 98211], ["Atualização cadastral", 61045],
    ],
    nota: "Números substituídos por marcadores; gráficos ilustrativos.",
  },
  {
    seg: 1, grupo: "Atendimento digital", canal: "Chat", icone: "chat", rotuloVolume: "Conversas no mês", unidade: "conversas no mês",
    metrica: { nome: "Contact rate", tipo: "pct", valor: 8.40, var: 0.30, inverso: true, desc: "Contatos no chat divididos pela base de clientes ativos no mês." },
    anel: { pct: 70, rotulo: "Retenção", desc: "resolvido na BIA" },
    csat: 4.1, csatVar: +0.03,
    etapas: [
      { nome: "BIA", vol: 820000, var: 5.10, metrica: "70%", rotulo: "retenção", semente: 3 },
      { nome: "Chat N1", vol: 190000, var: 2.30, metrica: "4,15", rotulo: "CSAT", semente: 7 },
      { nome: "Chat N2", vol: 22000, var: -3.80, metrica: "4,02", rotulo: "CSAT", semente: 11 },
    ],
    motivos: [
      ["Cartão de crédito: aumento de limite", 12000], ["Cliente inativo sem identificação de assunto", 9300],
      ["Análise de simulação de crédito", 7100], ["Empréstimos: contratação", 5600],
      ["Valor do saldo da conta", 5000], ["Conta bloqueada", 4100], ["Inin-Wrap-Up-Timeout", 3500], ["Cartão de crédito: adesão", 2900],
    ],
    nota: "Números substituídos por marcadores; gráficos ilustrativos.",
  },
  {
    seg: 1, grupo: "Atendimento telefônico", canal: "Voz", icone: "voz", rotuloVolume: "Ligações no mês", unidade: "ligações no mês",
    metrica: { nome: "Contact rate", tipo: "pct", valor: 4.60, var: -0.20, inverso: true, desc: "Ligações recebidas divididas pela base de clientes ativos no mês." },
    anel: { pct: 58, rotulo: "Retenção", desc: "resolvido na URA" },
    csat: 3.97, csatVar: -0.05,
    etapas: [
      { nome: "URA", vol: 412300, var: 2.10, metrica: "58%", rotulo: "retenção", semente: 5 },
      { nome: "Voz N1", vol: 186400, var: -3.25, metrica: "4,02", rotulo: "CSAT", semente: 13 },
      { nome: "Voz N2", vol: 21700, var: 1.12, metrica: "3,88", rotulo: "CSAT", semente: 17 },
    ],
    motivos: [
      ["Cartão de crédito: desbloqueio", 9842], ["Segunda via de fatura", 8120], ["Contestação de compra", 6403], ["Senha e acesso ao app", 5977],
      ["Empréstimos: renegociação", 4310], ["Conta bloqueada", 3986], ["Pix: devolução", 3221], ["Cancelamento de cartão", 2874],
    ],
    nota: "Números substituídos por marcadores; gráficos ilustrativos.",
  },
  {
    seg: 3, grupo: "Autoatendimento físico", canal: "Totem", icone: "totem", rotuloVolume: "Acessos no mês", unidade: "acessos no mês",
    metrica: { nome: "Contact rate", tipo: "pct", valor: 1.30, var: -0.10, inverso: true, desc: "Acessos ao totem divididos pela base de clientes ativos no mês." },
    anel: { pct: 96, rotulo: "Disponibilidade", desc: "terminais operando" },
    csat: 3.92, csatVar: -0.02,
    etapas: [
      { nome: "Saque e depósito", vol: 98400, var: -6.10, metrica: "99%", rotulo: "sucesso", semente: 8 },
      { nome: "Extrato e saldo", vol: 61200, var: -9.40, metrica: "98%", rotulo: "sucesso", semente: 10 },
      { nome: "Cartão e senha", vol: 23100, var: 2.30, metrica: "81%", rotulo: "sucesso", semente: 12 },
    ],
    motivos: [
      ["Saque", 61380], ["Depósito", 37020], ["Extrato", 34775], ["Saldo", 26425],
      ["Desbloqueio de cartão", 12940], ["Troca de senha", 10160], ["Pagamento de boleto", 7212], ["Comprovantes", 3845],
    ],
    nota: "Números substituídos por marcadores; gráficos ilustrativos.",
  },
  {
    seg: 2, grupo: "Reclamações formais", canal: "Manifestações", icone: "doc", rotuloVolume: "Registros no mês", unidade: "registros no mês",
    metrica: { nome: "Claim rate", tipo: "pct", valor: 0.32, var: 0.02, inverso: true, desc: "Reclamações formais divididas pela base de clientes ativos no mês." },
    inverso: true,
    anel: { pct: 88, rotulo: "No prazo", desc: "respondidas em dia" },
    csat: 3.35, csatVar: -0.08,
    etapas: [
      { nome: "SAC formal", vol: 38200, var: 5.40, metrica: "3,41", rotulo: "CSAT", semente: 19 },
      { nome: "Ouvidoria", vol: 6800, var: 3.10, metrica: "3,12", rotulo: "CSAT", semente: 23 },
      { nome: "BACEN", vol: 1900, var: -4.20, metrica: "34%", rotulo: "procedentes", semente: 29 },
    ],
    motivos: [
      ["Cobrança não reconhecida", 4210], ["Contestação de compra sem retorno", 3655], ["Conta bloqueada", 2980], ["Empréstimo não contratado", 2412],
      ["Demora no atendimento", 1986], ["Pix: devolução negada", 1740], ["Tarifa indevida", 1388], ["Encerramento de conta", 1102],
    ],
    nota: "Números substituídos por marcadores; gráficos ilustrativos.",
  },
];

const ICONES = {
  app: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
  totem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="5" y="2" width="14" height="13" rx="1.5"/><path d="M8 6h8M8 9h5M9 15v7h6v-7M7 22h10"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/></svg>',
  voz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
};
const ESTRELA = '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z"/></svg>';

const PERIODO = "02/07 a 31/07/2026";
const FR_ATIVO = 3;
const reduzMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const telaEstreita = matchMedia("(max-width: 1080px)");

// Para ver os números de verdade, troque por: const z = t => String(t);
const z = t => String(t).replace(/\d/g, "0");
const num = (v, casas = 1) => z(v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }));
const compacto = v => v >= 1e6 ? num(v / 1e6, 2) + " mi" : v >= 1e3 ? num(v / 1e3, 1) + " mil" : z(Math.round(v));
const pctSinal = v => (v > 0 ? "+" : "") + num(v, 2) + "%";
// Métrica principal: MAU em quantidade; Contact rate e Claim rate em %, com variação em pontos percentuais
const fmtMetrica = (m, v = m.valor) => m.tipo === "pct" ? num(v, 2) + "%" : compacto(v);
const fmtVarMetrica = m => m.tipo === "pct" ? `${m.var > 0 ? "↗ +" : "↘ "}${num(m.var, 2)} p.p.` : (m.var > 0 ? "↗ " : "↘ ") + pctSinal(m.var);
const classeVar = (v, inverso) => ((v > 0) !== !!inverso) ? "sobe" : "desce";
const seta = v => v > 0 ? "↗ " : "↘ ";

// CSAT das etapas: na meta em verde, abaixo dela em vermelho
const CSAT_META = 4.10, CSAT_MIN = 1, CSAT_MAX = 5;
const naMeta = v => v >= CSAT_META;

function serie(semente, n = 30) {
  let s = semente;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  return Array.from({ length: n }, (_, i) => 0.5 + 0.28 * Math.sin(i / 2.1 + semente) + (r() - 0.5) * 0.45);
}
function faisca(semente) {
  const pts = serie(semente), w = 58, h = 24;
  const min = Math.min(...pts), max = Math.max(...pts);
  const d = pts.map((p, i) => (i ? "L" : "M") + ((i / (pts.length - 1)) * w).toFixed(1) + " " + (h - 2 - ((p - min) / (max - min)) * (h - 4)).toFixed(1)).join(" ");
  return `<svg class="faisca" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="area" d="${d} L${w} ${h} L0 ${h} Z"/><path class="linha-f" d="${d}" pathLength="1"/></svg>`;
}

function contar(el, alvo, duracao, formatar) {
  if (reduzMovimento) { el.textContent = formatar(alvo); return; }
  const inicio = performance.now();
  const passo = agora => {
    const t = Math.min((agora - inicio) / duracao, 1);
    el.textContent = formatar(alvo * (1 - Math.pow(1 - t, 4)));
    if (t < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

function animarAnel(anel, pct, atraso = 0) {
  const c = anel.querySelector(".progresso");
  c.classList.remove("anima");
  c.style.strokeDashoffset = 1;
  void c.getBoundingClientRect();
  setTimeout(() => { c.classList.add("anima"); c.style.strokeDashoffset = 1 - pct / 100; }, reduzMovimento ? 0 : atraso);
}

// ---------- Montagem ----------
const vitrine = document.getElementById("vitrine");
const tpl = document.getElementById("tpl-card");
canais.forEach(c => {
  c.total = c.etapas.reduce((s, e) => s + e.vol, 0);
  const anterior = c.etapas.reduce((s, e) => s + e.vol / (1 + e.var / 100), 0);
  c.variacao = (c.total / anterior - 1) * 100;
});
const maiorVolume = Math.max(...canais.map(c => c.total));

// Trilhos: um por segmento da jornada, ocupando as colunas dos seus canais
// Trilhos na ordem em que aparecem na tela (esquerda para a direita)
SEGMENTOS.map((s, k) => ({ s, k, idx: canais.map((c, i) => c.seg === k ? i : -1).filter(i => i >= 0) }))
  .sort((a, b) => a.idx[0] - b.idx[0])
  .forEach(({ s, idx }) => {
  const soma = idx.reduce((t, i) => t + canais[i].total, 0);
  const fatia = soma / canais.reduce((t, c) => t + c.total, 0);
  const el = document.createElement("div");
  el.className = "trilho";
  el.dataset.nivel = s.nivel;
  el.style.gridColumn = `${idx[0] + 1} / ${idx[idx.length - 1] + 2}`;
  el.innerHTML = `<div class="rot">${s.nome}<span>${compacto(soma)} contatos (${num(fatia * 100, 1)}% do total)</span></div><div class="linha" role="img" aria-label="${num(fatia * 100, 1)}% do volume total"><i style="--s:${fatia.toFixed(4)}"></i></div>`;
  vitrine.appendChild(el);
});

const cards = canais.map((c, i) => {
  const card = tpl.content.firstElementChild.cloneNode(true);
  const C = k => card.querySelector(`[data-c="${k}"]`);
  const F = k => card.querySelector(`[data-f="${k}"]`);
  card.style.gridColumn = i + 1;
  card.style.setProperty("--atraso", i * 90 + "ms");
  card.setAttribute("aria-label", `${c.canal}: ${compacto(c.total)} ${c.unidade}`);
  card.querySelectorAll(".icone").forEach(el => el.outerHTML = ICONES[c.icone]);

  if (c.total === maiorVolume) card.insertAdjacentHTML("afterbegin", `<span class="selo">Maior volume ${ESTRELA}</span>`);

  // Compacto
  C("grupo").textContent = c.grupo;
  C("canal").textContent = c.canal;
  C("total").textContent = compacto(c.total);
  C("unidade").textContent = c.unidade;
  C("variacao").textContent = seta(c.variacao) + pctSinal(c.variacao);
  C("variacao").classList.add(classeVar(c.variacao, c.inverso));
  C("anelPct").textContent = z(c.anel.pct) + "%";
  C("anelRotulo").textContent = c.anel.rotulo;
  C("anelDesc").textContent = c.anel.desc;
  C("csat").textContent = num(c.csat, 2);
  card.querySelectorAll('[data-c="csatVar"], [data-f="csatVar"]').forEach(el => {
    el.textContent = `(${c.csatVar > 0 ? "+" : ""}${num(c.csatVar, 2)})`;
    el.classList.add(c.csatVar >= 0 ? "sobe" : "desce");
  });
  const maxEtapa = Math.max(...c.etapas.map(e => e.vol));
  card.querySelector(".c-etapas").innerHTML = c.etapas.map(e =>
    `<div style="display:block"><div><span>${e.nome}</span><span>${compacto(e.vol)}</span></div><i style="--p:${(e.vol / maxEtapa).toFixed(3)}"></i></div>`).join("");

  // Completo
  F("grupo").textContent = c.grupo;
  F("periodo").textContent = PERIODO;
  F("canal").textContent = c.canal;
  F("qtdEtapas").textContent = `${c.etapas.length} etapas`;
  F("rotuloVolume").textContent = c.rotuloVolume;
  F("variacao").className = classeVar(c.variacao, c.inverso);
  // Valores finais já no lugar: a altura medida do card é a mesma de quando ele está aberto
  F("total").textContent = compacto(c.total);
  F("variacao").textContent = pctSinal(c.variacao);
  F("anelPct").textContent = C("anelPct").textContent;
  const m = c.metrica;
  [C, F].forEach(X => {
    X("metNome").textContent = m.nome;
    X("metValor").textContent = fmtMetrica(m);
    X("metVar").textContent = fmtVarMetrica(m);
    X("metVar").classList.add(classeVar(m.var, m.inverso));
  });
  F("metAjuda").dataset.dica = m.desc;
  F("metAjuda").setAttribute("aria-label", `O que é ${m.nome}: ${m.desc}`);
  F("anelRotulo").textContent = c.anel.rotulo;
  F("anelDesc").textContent = c.anel.desc;
  F("csat").textContent = num(c.csat, 2);
  F("topN").textContent = `Top ${c.motivos.length}`;
  F("nota").textContent = c.nota;
  card.querySelector(".faixa .anel").setAttribute("aria-label", `${z(c.anel.pct)}% ${c.anel.rotulo.toLowerCase()}, ${c.anel.desc}`);

  card.querySelector(".etapas").innerHTML = c.etapas.map(e => `
    <li class="etapa">
      <div><div class="nome">${e.nome}</div><div class="vol">${compacto(e.vol)}</div>
        <div class="var ${classeVar(e.var, c.inverso)}">${seta(e.var)}${pctSinal(e.var)}</div></div>
      ${faisca(e.semente)}
      <div class="metrica${e.rotulo === "CSAT" ? (naMeta(parseFloat(e.metrica.replace(",", "."))) ? " meta" : " critico") : ""}"><b>${z(e.metrica)}</b><span>${e.rotulo}</span></div>
    </li>`).join("");

  const maiorMotivo = c.motivos[0][1];
  card.querySelector(".motivos ol").innerHTML = c.motivos.map(([txt, q], k) => `
    <li><span class="pos">${k + 1}</span><span class="txt" title="${txt}">${txt}</span>
      <span class="barra"><i style="--p:${(q / maiorMotivo).toFixed(3)};--i:${k}"></i></span>
      <span class="qtd">${z(q.toLocaleString("pt-BR"))}</span></li>`).join("");

  card.querySelector(".btn-pri").addEventListener("click", e => {
    e.stopPropagation();
    const b = e.currentTarget, r = b.getBoundingClientRect(), s = Math.max(r.width, r.height);
    const onda = document.createElement("span");
    onda.className = "onda";
    onda.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.appendChild(onda);
    onda.addEventListener("animationend", () => onda.remove());
  });

  vitrine.appendChild(card);
  return card;
});

// ---------- Troca de canal ----------
let ativo = -1;
function ativar(i, { contar: recontar = true } = {}) {
  if (i === ativo) return;
  ativo = i;
  const cols = canais.map((_, k) => k === i ? `${FR_ATIVO}fr` : "1fr").join(" ");
  vitrine.style.gridTemplateColumns = cols;
  cards.forEach((card, k) => {
    const on = k === i;
    card.classList.toggle("ativo", on);
    card.setAttribute("aria-expanded", on);
    card.querySelector(".completo").inert = !on;
  });
  const c = canais[i], card = cards[i];
  const F = k => card.querySelector(`[data-f="${k}"]`);
  animarAnel(card.querySelector(".faixa .anel"), c.anel.pct, 250);
  if (recontar) {
    setTimeout(() => {
      contar(F("total"), c.total, 1000, compacto);
      contar(F("variacao"), c.variacao, 1000, pctSinal);
      contar(F("metValor"), c.metrica.valor, 1000, v => fmtMetrica(c.metrica, v));
      contar(F("csat"), c.csat, 1100, v => num(v, 2));
      contar(F("anelPct"), c.anel.pct, 1200, v => z(Math.round(v)) + "%");
    }, reduzMovimento ? 0 : 220);
  }
}

// Intenção de hover: evita que o card abra só porque o mouse cruzou por cima dele
let espera;
cards.forEach((card, i) => {
  card.addEventListener("mouseenter", () => { clearTimeout(espera); espera = setTimeout(() => ativar(i), 110); });
  card.addEventListener("mouseleave", () => clearTimeout(espera));
  card.addEventListener("click", () => ativar(i));
  card.addEventListener("focus", () => ativar(i));
  card.addEventListener("keydown", e => {
    if (e.target !== card) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const prox = (i + (e.key === "ArrowRight" ? 1 : -1) + cards.length) % cards.length;
      cards[prox].focus();
    }
  });
});

// Largura fixa do conteúdo completo = largura do card aberto, para o texto não refluir enquanto o card cresce
function medir() {
  if (telaEstreita.matches) { vitrine.style.removeProperty("--alt"); return; }
  const W = vitrine.clientWidth;
  const gaps = (canais.length - 1) * parseFloat(getComputedStyle(vitrine).columnGap);
  const larg = (W - gaps) * FR_ATIVO / (canais.length - 1 + FR_ATIVO) - 4;
  vitrine.style.setProperty("--larg-completo", larg + "px");
  // A altura da linha atende o maior conteúdo: o card aberto ou o card fechado
  const alt = Math.max(...cards.flatMap(c => [c.querySelector(".completo").scrollHeight, c.querySelector(".compacto").scrollHeight]));
  vitrine.style.setProperty("--alt", alt + 4 + "px");
}

// ---------- Entrada ----------
const inicial = canais.findIndex(c => c.canal === "Chat");
document.fonts.ready.then(() => {
  medir();
  ativar(inicial, { contar: false });
  vitrine.querySelectorAll(".trilho .linha").forEach((l, k) => setTimeout(() => l.classList.add("pronta"), reduzMovimento ? 0 : 150 + k * 160));
  cards.forEach((card, i) => {
    card.classList.add("entrou");
    card.addEventListener("animationend", ev => {
      if (ev.animationName === "entrada") { card.classList.remove("entrou"); card.classList.add("pronto"); }
    });
    animarAnel(card.querySelector(".c-anel .anel"), canais[i].anel.pct, 400 + i * 90);
  });
  const c = canais[inicial], F = k => cards[inicial].querySelector(`[data-f="${k}"]`);
  setTimeout(() => {
    contar(F("total"), c.total, 1200, compacto);
    contar(F("variacao"), c.variacao, 1200, pctSinal);
    contar(F("metValor"), c.metrica.valor, 1200, v => fmtMetrica(c.metrica, v));
    contar(F("csat"), c.csat, 1200, v => num(v, 2));
    contar(F("anelPct"), c.anel.pct, 1300, v => z(Math.round(v)) + "%");
  }, reduzMovimento ? 0 : 450);
});
addEventListener("resize", medir);
telaEstreita.addEventListener("change", medir);
