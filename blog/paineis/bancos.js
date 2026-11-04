/* Painel "Balanços dos grandes bancos": dados/bancos_balancos.json, gerado em Python a partir do IF.data (Banco Central).
   Uso: window.painelBancos(elemento, urlDosDados?) */
(() => {
  const CORES = { "Banco do Brasil": "#2a78d6", "Bradesco": "#eb6834", "Itaú": "#1baf7a", "Santander": "#eda100" };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const br = (v, c) => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c });
  const fmt = (v, un) => v == null ? "—" : un === "%" ? br(v * 100, 1) + "%" : un === "x" ? br(v, 1) + "x" : un === "mi" ? br(v, 1) + " mi"
    : un === "n" ? br(v, 0) : un === "n1" ? br(v, 1) : un === "R$" ? "R$ " + br(v, 0) : un === "idx" ? br(v, 0) : "R$ " + br(v, Math.abs(v) >= 100 ? 0 : 1) + " bi";
  // variação contra 1 ano antes: pontos percentuais para taxas, % para valores
  const varia = (a, b, un) => {
    if (a == null || b == null) return "";
    if (un === "%") { const d = (a - b) * 100; return (d >= 0 ? "+" : "−") + br(Math.abs(d), 1) + " p.p. em 1 ano"; }
    if (un === "x") { const d = a - b; return (d >= 0 ? "+" : "−") + br(Math.abs(d), 1) + "x em 1 ano"; }
    const d = (a / b - 1) * 100; return (d >= 0 ? "+" : "−") + br(Math.abs(d), 1) + "% em 1 ano";
  };

  const CSS = `
  .pb-ctrl { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
  .pb-ctrl select { font: 500 14px var(--sans); height: 40px; padding: 0 36px 0 14px; border-radius: 9999px; border: 1px solid var(--line); background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 14px center; appearance: none; cursor: pointer; max-width: 100%; }
  .pb-exp { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .pb-exp div { background: var(--card); border-radius: 16px; padding: 14px 16px; font-size: 14px; line-height: 1.5; color: #222; }
  .pb-exp b { display: block; font: 400 11px var(--mono); text-transform: uppercase; letter-spacing: .05em; color: var(--slate); margin-bottom: 4px; }
  .pb-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .pb-kpi { border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; display: grid; gap: 6px; }
  .pb-kpi span { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .pb-kpi span i { width: 10px; height: 10px; border-radius: 50%; }
  .pb-kpi b { font-family: var(--cond); font-stretch: 68%; font-weight: 700; font-size: 38px; line-height: .9; letter-spacing: -.02em; }
  .pb-kpi em { font-style: normal; font-size: 12px; color: var(--soft); }
  .pb-marco { font: 400 10.5px var(--mono); fill: var(--slate); }
  .pb-rot { font: 600 12px var(--sans); fill: #222; }
  .pb-tab { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  .pb-tab th, .pb-tab td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: right; white-space: nowrap; }
  .pb-tab th:first-child, .pb-tab td:first-child { text-align: left; white-space: normal; }
  .pb-tab thead th { font: 400 11px var(--mono); text-transform: uppercase; letter-spacing: .04em; color: var(--slate); }
  .pb-tab thead th i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .pb-tab .grupo td { font: 400 11px var(--mono); text-transform: uppercase; letter-spacing: .05em; color: var(--slate); padding-top: 16px; text-align: left; }
  .pb-tab tbody tr.ind { cursor: pointer; } .pb-tab tbody tr.ind:hover td { background: #fafafa; }
  .pb-tab tbody tr.ativo td { background: #fff3f0; } .pb-tab tbody tr.ativo td:first-child { box-shadow: inset 3px 0 0 var(--orange); }
  .pb-rel { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .pb-rel div { background: var(--card); border-radius: 16px; padding: 14px 16px; font-size: 13px; line-height: 1.45; display: grid; gap: 4px; align-content: start; }
  .pb-rel strong { font-size: 14px; } .pb-rel .pend { color: var(--slate); }
  .pb-h { margin: 6px 0 0; font: 400 12px var(--mono); text-transform: uppercase; letter-spacing: .05em; color: var(--slate); }
  .pb-scroll { overflow-x: auto; }
  .pb-abas { display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid var(--line); }
  .pb-abas button { font: 600 15px var(--sans); border: 0; background: none; padding: 10px 14px; cursor: pointer; color: var(--soft); position: relative; }
  .pb-abas button[aria-selected="true"] { color: #000; }
  .pb-abas button[aria-selected="true"]::after { content: ""; position: absolute; left: 10px; right: 10px; bottom: -1px; height: 2px; border-radius: 2px; background: var(--orange); }
  .pb-aviso { font-size: 13px; color: var(--soft); background: var(--card); border-radius: 12px; padding: 10px 14px; }
  @media (max-width: 900px) { .pb-kpis, .pb-rel { grid-template-columns: repeat(2, 1fr); } .pb-exp { grid-template-columns: 1fr; } }`;

  window.painelBancos = async (el, src = "/dados/bancos_balancos.json") => {
    if (!document.getElementById("pb-css")) document.head.insertAdjacentHTML("beforeend", `<style id="pb-css">${CSS}</style>`);
    el.innerHTML = `<p class="vazio">Carregando os dados…</p>`;
    let d;
    try { d = await (await fetch(src, { cache: "no-cache" })).json(); }
    catch (e) { el.innerHTML = `<p class="vazio">Não consegui carregar os dados agora.</p>`; return; }
    const T = d.trimestres, n = T.length, ult = T[n - 1];
    const INICIAL = { balanco: "roe_12m", clientes: "clientes_mi", acoes: "retorno_total", ano: "lucro_liquido_bi" };
    // ano vigente (o do último trimestre com dado) e o ano anterior, para comparar o mesmo trimestre
    const AA = ult.slice(2), AANT = String(+AA - 1).padStart(2, "0");
    const QS = [1, 2, 3, 4].map(q => ({ q, rot: `${q}T${AA}`, j: T.indexOf(`${q}T${AA}`), jAnt: T.indexOf(`${q}T${AANT}`) }));
    let aba = "balanco", visao = "historico", atual = INICIAL[aba], janela = n;
    const abaEf = () => aba === "balanco" && visao === "ano" ? "ano" : aba;
    const doAba = () => d.indicadores.filter(i => i.aba === abaEf());
    const IND = () => doAba().find(i => i.k === atual);
    const gruposAba = () => [...new Set(doAba().map(i => i.grupo))];

    el.innerHTML = `
      <div class="ph"><div><h4>Balanços dos grandes bancos</h4><small class="mono">IF.data · ${esc(T[0])} a ${esc(ult)} · resultados em 12 meses · valores contábeis</small></div>
        <div class="per" role="group" aria-label="Período">${[[12, "3 anos"], [20, "5 anos"], [n, "10 anos"]].map(([q, t]) =>
          `<button type="button" data-n="${q}" aria-pressed="${q === n}">${t}</button>`).join("")}<button type="button" data-ano="1" aria-pressed="false">20${AA} por trimestre</button></div></div>
      <div class="pb-abas" role="tablist">${d.abas.map(a => `<button type="button" role="tab" data-aba="${a.k}" aria-selected="${a.k === aba}">${esc(a.nome)}</button>`).join("")}</div>
      <div class="pb-aviso" hidden>Só números, a partir de dados públicos. Não é recomendação de investimento.</div>
      <div class="pb-ctrl"><select aria-label="Indicador"></select></div>
      <div class="pb-exp"><div><b>O que é</b><span class="oque"></span></div><div><b>Como ler</b><span class="ler"></span></div></div>
      <div class="pb-kpis"></div>
      <div class="legenda">${d.bancos.map(b => `<span><i style="background:${CORES[b]}"></i>${esc(b)}</span>`).join("")}<span class="pb-traco" hidden><i style="background:none;border-top:2px dashed #000;height:0"></i>mesmo trimestre de 20${AANT}</span></div>
      <div class="grafico"><svg role="img"></svg><div class="tip" hidden></div></div>
      <div class="pb-h pb-raio"></div>
      <div class="pb-scroll"><table class="pb-tab"><thead></thead><tbody></tbody></table></div>
      <div class="pb-h pb-so-balanco">3T26: o que os bancos já divulgaram (números gerenciais, não comparáveis com os contábeis acima)</div>
      <div class="pb-rel pb-so-balanco">${d.bancos.map(b => { const r = d.releases_3t26[b];
        return r ? `<div><strong>${esc(b)}</strong><span>Lucro recorrente: R$ ${br(r.lucro_recorrente_bi, 1)} bi</span><span>ROAE: ${br(r.roae * 100, 1)}%</span><span>Inadimplência acima de 90 dias: ${br(r.inadimplencia_90d * 100, 1)}%</span><span class="pend">${esc(r.nota)} Divulgado em ${esc(r.data)}.</span></div>`
          : `<div><strong>${esc(b)}</strong><span class="pend">Ainda não divulgou o 3T26.</span></div>`; }).join("")}</div>
      <div class="rodape"><span class="pb-fonte"></span><span class="pb-so-balanco">2T e 4T: o IF.data acumula o resultado no semestre; o trimestre sai por diferença.</span><span class="pb-so-balanco">Desde jan/2025 vale um novo padrão contábil (Resolução CMN 4.966), marcado no gráfico.</span><a href="https://github.com/adrianoarruda/site/tree/main/analises/bancos" target="_blank" rel="noopener">Ver o código em Python ↗</a></div>`;

    const sel = el.querySelector("select"), svg = el.querySelector("svg"), tip = el.querySelector(".tip");
    const tabela = () => {
      const ano = abaEf() === "ano", qs = QS.filter(q => q.j >= 0);
      el.querySelector(".pb-raio").textContent = ano ? `20${AA} trimestre a trimestre · clique numa linha para ver no gráfico` : `Raio-X do ${ult} · clique numa linha para ver a história`;
      el.querySelector(".pb-tab thead").innerHTML = ano
        ? `<tr><th rowspan="2">Indicador</th>${d.bancos.map(b => `<th colspan="${qs.length}"><i style="background:${CORES[b]}"></i>${esc(b)}</th>`).join("")}</tr><tr>${d.bancos.map(() => qs.map(q => `<th>${q.rot}</th>`).join("")).join("")}</tr>`
        : `<tr><th>Indicador</th>${d.bancos.map(b => `<th><i style="background:${CORES[b]}"></i>${esc(b)}</th>`).join("")}</tr>`;
      const cols = ano ? d.bancos.length * qs.length : d.bancos.length;
      el.querySelector(".pb-tab tbody").innerHTML = gruposAba().map(g => `<tr class="grupo"><td colspan="${cols + 1}">${esc(g)}</td></tr>` +
        doAba().filter(i => i.grupo === g).map(i => `<tr class="ind${i.k === atual ? " ativo" : ""}" data-k="${i.k}"><td>${esc(i.nome)}</td>${d.bancos.map(b =>
          ano ? qs.map(q => `<td>${fmt(d.series[b][i.k][q.j], i.un)}</td>`).join("") : `<td>${fmt(d.series[b][i.k][n - 1], i.un)}</td>`).join("")}</tr>`).join("")).join("");
    };
    const topo = () => {
      const i = IND(), ano = abaEf() === "ano";
      el.querySelector(".oque").textContent = i.oque; el.querySelector(".ler").textContent = i.ler;
      const qu = QS.filter(q => q.j >= 0).pop();
      el.querySelector(".pb-kpis").innerHTML = d.bancos.map(b => { const s = d.series[b][atual];
        const em = ano ? `${qu.rot} · ${varia(s[qu.j], qu.jAnt >= 0 ? s[qu.jAnt] : null, i.un).replace("em 1 ano", "contra o " + qu.q + "T" + AANT)}` : varia(s[n - 1], s[n - 5], i.un);
        return `<div class="pb-kpi"><span><i style="background:${CORES[b]}"></i>${esc(b)}</span><b>${fmt(s[n - 1], i.un)}</b><em>${em}</em></div>`; }).join("");
      svg.setAttribute("aria-label", ano ? `Gráfico de barras: ${i.nome} dos quatro bancos em cada trimestre de 20${AA}` : `Gráfico de linhas: ${i.nome} dos quatro bancos, trimestre a trimestre`);
    };
    // Visão do ano vigente: barras por trimestre (4 bancos lado a lado), com o mesmo trimestre do ano anterior em traço
    const desenhaAno = () => {
      const i = IND(), k = i.un === "%" ? 100 : 1;
      const W = Math.max(320, Math.round(svg.parentElement.clientWidth || 900)), H = W < 600 ? 280 : 340;
      const m = { t: 18, r: 12, b: 34, l: 52 };
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const vals = d.bancos.flatMap(b => QS.flatMap(q => [q.j, q.jAnt].filter(j => j >= 0).map(j => d.series[b][atual][j]))).filter(v => v != null).map(v => v * k);
      let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
      const bruto = (hi - lo) / 5 || 1, p10 = Math.pow(10, Math.floor(Math.log10(bruto))), passo = [1, 2, 2.5, 5, 10].map(f => f * p10).find(z => z >= bruto) || p10;
      lo = Math.floor(lo / passo) * passo; hi = Math.ceil(hi / passo) * passo; if (hi === lo) hi = lo + passo;
      const y = v => m.t + (1 - (v * k - lo) / (hi - lo)) * (H - m.t - m.b);
      const rot = v => i.un === "%" ? br(v, passo % 1 ? 1 : 0) + "%" : i.un === "x" ? br(v, passo % 1 ? 1 : 0) + "x" : br(v, passo % 1 ? 1 : 0);
      const gw = (W - m.l - m.r) / 4, bw = Math.min(34, (gw - 28) / 4 - 2);
      let g = "";
      for (let v = lo; v <= hi + 1e-9; v += passo) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v / k)}" y2="${y(v / k)}" stroke="${Math.abs(v) < 1e-9 ? "#b5b5b5" : "#eee"}"/><text class="eixo" x="${m.l - 8}" y="${y(v / k) + 4}" text-anchor="end">${rot(v)}</text>`;
      QS.forEach((q, gi) => {
        const cx = m.l + gw * gi + gw / 2, x0 = cx - (bw * 4 + 6) / 2;
        g += `<text class="eixo" x="${cx}" y="${H - 12}" text-anchor="middle">${q.rot}</text>`;
        if (q.j < 0) { g += `<text class="pb-marco" x="${cx}" y="${(m.t + H - m.b) / 2}" text-anchor="middle">${W < 600 ? "sem dado" : "ainda sem dado"}</text>`; return; }
        d.bancos.forEach((b, bi) => {
          const v = d.series[b][atual][q.j], xa = x0 + bi * (bw + 2);
          if (v != null) {
            const y0 = y(0), y1 = y(v), top = Math.min(y0, y1), h = Math.max(1, Math.abs(y1 - y0));
            g += `<rect class="barra" data-b="${esc(b)}" data-j="${q.j}" data-ja="${q.jAnt}" x="${xa}" y="${top}" width="${bw}" height="${h}" rx="3" fill="${CORES[b]}"/>`;
          }
          const va = q.jAnt >= 0 ? d.series[b][atual][q.jAnt] : null;
          if (va != null) g += `<line x1="${xa - 1}" x2="${xa + bw + 1}" y1="${y(va)}" y2="${y(va)}" stroke="#000" stroke-width="2" stroke-dasharray="3 2"/>`;
        });
      });
      svg.innerHTML = g;
      svg.onmousemove = ev => {
        const r = ev.target.closest && ev.target.closest(".barra");
        if (!r) { tip.hidden = true; return; }
        const bb = svg.getBoundingClientRect(), b = r.dataset.b, j = +r.dataset.j, ja = +r.dataset.ja, s = d.series[b][atual];
        tip.hidden = false;
        tip.innerHTML = `<b>${esc(T[j])}</b><div><i style="background:${CORES[b]}"></i>${esc(b)}: ${fmt(s[j], i.un)}</div>` + (ja >= 0 ? `<div>${esc(T[ja])}: ${fmt(s[ja], i.un)}</div>` : "");
        tip.style.left = Math.max(90, Math.min(bb.width - 90, ev.clientX - bb.left)) + "px";
        tip.style.top = Math.max(70, ev.clientY - bb.top - 12) + "px";
      };
      svg.ontouchmove = null;
      svg.onmouseleave = () => { tip.hidden = true; };
    };
    const desenha = () => {
      if (abaEf() === "ano") return desenhaAno();
      const i = IND(), q = Math.min(janela, n), ini = n - q;
      const W = Math.max(320, Math.round(svg.parentElement.clientWidth || 900)), H = W < 600 ? 260 : 340;
      const m = { t: 18, r: W < 600 ? 12 : 118, b: 28, l: 52 };
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const k = i.un === "%" ? 100 : 1;
      const vals = d.bancos.flatMap(b => d.series[b][atual].slice(ini)).filter(v => v != null).map(v => v * k);
      let lo = Math.min(...vals), hi = Math.max(...vals); if (["bi", "mi", "n", "R$"].includes(i.un)) lo = Math.min(lo, 0);
      const bruto = (hi - lo) / 5, p10 = Math.pow(10, Math.floor(Math.log10(bruto || 1))), passo = [1, 2, 2.5, 5, 10].map(f => f * p10).find(s => s >= bruto) || p10;
      lo = Math.floor(lo / passo) * passo; hi = Math.ceil(hi / passo) * passo; if (hi === lo) hi = lo + passo;
      const x = j => m.l + ((j - ini) / Math.max(1, q - 1)) * (W - m.l - m.r), y = v => m.t + (1 - (v * k - lo) / (hi - lo)) * (H - m.t - m.b);
      const rot = v => i.un === "%" ? br(v, passo % 1 ? 1 : 0) + "%" : i.un === "x" ? br(v, passo % 1 ? 1 : 0) + "x" : br(v, passo % 1 ? 1 : 0);
      let g = "";
      for (let v = lo; v <= hi + 1e-9; v += passo) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v / k)}" y2="${y(v / k)}" stroke="${Math.abs(v) < 1e-9 ? "#b5b5b5" : "#eee"}"/><text class="eixo" x="${m.l - 8}" y="${y(v / k) + 4}" text-anchor="end">${rot(v)}</text>`;
      for (let j = ini; j < n; j++) if (T[j].startsWith("1T") && (W >= 600 || q <= 20 || +T[j].slice(2) % 2 === 1)) g += `<text class="eixo" x="${x(j)}" y="${H - 8}" text-anchor="middle">20${T[j].slice(2)}</text>`;
      d.marcos.filter(mc => mc.i >= ini && (!mc.aba || mc.aba === aba) && (!mc.indicador || mc.indicador === atual)).forEach(mc => { g += `<line x1="${x(mc.i)}" x2="${x(mc.i)}" y1="${m.t}" y2="${H - m.b}" stroke="#b5b5b5" stroke-dasharray="3 4"/><text class="pb-marco" x="${x(mc.i) + 5}" y="${m.t + 8}">${esc(mc.rotulo)}</text>`; });
      // linhas: a série escolhida, sem interpolar trimestres faltando
      const fins = [];
      d.bancos.forEach(b => {
        const s = d.series[b][atual]; let dd = "", pena = false;
        for (let j = ini; j < n; j++) { if (s[j] == null) { pena = false; continue; } dd += (pena ? "L" : "M") + x(j).toFixed(1) + " " + y(s[j]).toFixed(1); pena = true; }
        g += `<path d="${dd}" fill="none" stroke="${CORES[b]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
        if (s[n - 1] != null) fins.push({ b, yy: y(s[n - 1]) });
      });
      // rótulo direto no fim de cada linha (afastados para não se sobreporem)
      if (W >= 600) {
        fins.sort((a, c) => a.yy - c.yy); for (let j = 1; j < fins.length; j++) fins[j].yy = Math.max(fins[j].yy, fins[j - 1].yy + 15);
        fins.forEach(f => { g += `<circle cx="${x(n - 1)}" cy="${y(d.series[f.b][atual][n - 1])}" r="4" fill="${CORES[f.b]}" stroke="#fff" stroke-width="2"/><text class="pb-rot" x="${x(n - 1) + 10}" y="${f.yy + 4}">${esc(f.b)}</text>`; });
      }
      g += `<line class="cursor" y1="${m.t}" y2="${H - m.b}" stroke="#000" visibility="hidden"/>` + d.bancos.map(b => `<circle class="pt" data-b="${esc(b)}" r="4.5" fill="${CORES[b]}" stroke="#fff" stroke-width="2" visibility="hidden"/>`).join("");
      g += `<rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/>`;
      svg.innerHTML = g;
      const mostra = cx0 => {
        const bb = svg.getBoundingClientRect(), px = (cx0 - bb.left) * W / bb.width;
        const j = Math.max(ini, Math.min(n - 1, Math.round(ini + (px - m.l) / (W - m.l - m.r) * (q - 1)))), cx = x(j);
        const c = svg.querySelector(".cursor"); c.setAttribute("x1", cx); c.setAttribute("x2", cx); c.setAttribute("visibility", "visible");
        svg.querySelectorAll(".pt").forEach(p => { const v = d.series[p.dataset.b][atual][j]; p.setAttribute("cx", cx); p.setAttribute("cy", v == null ? -99 : y(v)); p.setAttribute("visibility", v == null ? "hidden" : "visible"); });
        const linhas = d.bancos.map(b => ({ b, v: d.series[b][atual][j] })).sort((a, c2) => (c2.v ?? -1e9) - (a.v ?? -1e9));
        tip.hidden = false;
        tip.innerHTML = `<b>${esc(T[j])}</b>` + linhas.map(l => `<div><i style="background:${CORES[l.b]}"></i>${esc(l.b)}: ${fmt(l.v, i.un)}</div>`).join("");
        tip.style.left = Math.max(90, Math.min(bb.width - 90, cx * bb.width / W)) + "px";
        tip.style.top = Math.max(96, (m.t + 40) * bb.height / H) + "px";
      };
      svg.onmousemove = ev => mostra(ev.clientX);
      svg.ontouchmove = ev => mostra(ev.touches[0].clientX);
      svg.onmouseleave = () => { tip.hidden = true; svg.querySelectorAll(".cursor, .pt").forEach(e => e.setAttribute("visibility", "hidden")); };
    };
    const montaAba = () => {
      sel.innerHTML = gruposAba().map(g => `<optgroup label="${esc(g)}">${doAba().filter(i => i.grupo === g).map(i => `<option value="${i.k}">${esc(i.nome)}</option>`).join("")}</optgroup>`).join("");
      el.querySelectorAll(".pb-abas button").forEach(b => b.setAttribute("aria-selected", b.dataset.aba === aba));
      el.querySelectorAll(".pb-so-balanco").forEach(e => { e.hidden = aba !== "balanco"; });
      el.querySelector(".per [data-ano]").hidden = aba !== "balanco";
      el.querySelectorAll(".per button").forEach(z => z.setAttribute("aria-pressed", abaEf() === "ano" ? !!z.dataset.ano : (!z.dataset.ano && +z.dataset.n === janela)));
      el.querySelector(".pb-traco").hidden = abaEf() !== "ano";
      el.querySelector(".pb-aviso").hidden = aba !== "acoes";
      el.querySelector(".pb-fonte").textContent = "Fonte: " + d.fontes[aba] + ".";
    };
    const escolhe = kk => { atual = kk; sel.value = kk; topo(); tabela(); desenha(); };
    el.querySelector(".pb-abas").addEventListener("click", e => {
      const b = e.target.closest("button[data-aba]"); if (!b || b.dataset.aba === aba) return;
      aba = b.dataset.aba; if (aba !== "balanco") visao = "historico"; montaAba(); escolhe(INICIAL[abaEf()]);
    });
    sel.addEventListener("change", () => escolhe(sel.value));
    el.querySelector(".pb-tab").addEventListener("click", e => { const r = e.target.closest("tr.ind"); if (!r) return; escolhe(r.dataset.k); svg.scrollIntoView({ behavior: "smooth", block: "center" }); });
    el.querySelector(".per").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      const antes = abaEf();
      if (b.dataset.ano) visao = "ano"; else { visao = "historico"; janela = +b.dataset.n; }
      if (abaEf() !== antes) { montaAba(); escolhe(doAba().some(i => i.k === atual) ? atual : INICIAL[abaEf()]); }
      else { montaAba(); desenha(); }
    });
    addEventListener("resize", desenha);
    montaAba(); escolhe(atual);
  };
})();
