// Barra do topo da Área privada: a mesma em todas as páginas logadas (Visão geral, Meu Dia, Links,
// Rascunhos e as páginas que vieram dos artifacts). Cada página só inclui:
//   <script src="/privado/barra.js"></script>   (logo no começo do <body>)
// A barra se monta sozinha: confere a sessão, lista as páginas liberadas para a senha e marca a página atual.
// Para mostrar uma informação curta ao lado (ex.: "atualizado em 07/11"), a página chama AreaBarra.info("...").
(() => {
  if (window.AreaBarra) return;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const atual = location.pathname.split("/").filter(Boolean)[0] || "";

  if (!document.querySelector('link[href*="family=Archivo"]')) {
    const f = document.createElement("link");
    f.rel = "stylesheet";
    f.href = "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..800&family=Geist:wght@400..600&display=swap";
    document.head.appendChild(f);
  }

  const css = document.createElement("style");
  css.textContent = `
  .ab-top { display: block; margin: 0; --ab-ink: #0b0b0b; --ab-soft: #5c5c5c; --ab-slate: #8a8a8a; --ab-line: #e6e6e6; --ab-chip: #f1f1f0; --ab-acc: #ff3b1f; --ab-blue: #4686ac;
    background: #fff; border-bottom: 1px solid var(--ab-line); position: sticky; top: 0; z-index: 1000; font: 15px/1.5 "Geist", "Helvetica Neue", Arial, sans-serif; letter-spacing: -.01em; color: var(--ab-ink); }
  .ab-top *, .ab-top *::before, .ab-top *::after { box-sizing: border-box; }
  .ab-top [hidden] { display: none !important; }
  .ab-wrap { max-width: 1440px; margin: 0 auto; padding-inline: 24px; height: 64px; display: flex; align-items: center; gap: 20px; }
  .ab-ico { width: 18px; height: 18px; flex: none; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .ab-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; flex: none; }
  .ab-logo { width: 34px; height: 34px; border-radius: 9px; background: var(--ab-ink); color: #fff; display: grid; place-items: center; font: 700 15px "Archivo", "Arial Narrow", sans-serif; font-stretch: 75%; }
  .ab-brand b { font: 700 22px/1 "Archivo", "Arial Narrow", sans-serif; font-stretch: 68%; text-transform: uppercase; letter-spacing: -.01em; }
  .ab-menu { display: flex; align-items: stretch; height: 100%; gap: 2px; flex: 1; min-width: 0; }
  .ab-menu > a, .ab-drop > button { display: flex; align-items: center; gap: 8px; padding: 0 12px; height: 100%; color: var(--ab-soft); text-decoration: none; font: 500 14.5px "Geist", Arial, sans-serif; letter-spacing: -.01em; background: none; border: 0; border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; }
  .ab-menu > a:hover, .ab-drop > button:hover { color: var(--ab-ink); }
  .ab-menu > a.ab-on, .ab-drop.ab-on > button { color: var(--ab-ink); border-bottom-color: var(--ab-acc); }
  .ab-drop { position: relative; display: flex; }
  .ab-seta { width: 14px; height: 14px; }
  .ab-lista { position: absolute; top: calc(100% + 6px); left: 0; min-width: 300px; background: #fff; border: 1px solid var(--ab-line); border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,.08); padding: 6px; display: none; }
  .ab-aberto > .ab-lista { display: grid; }
  .ab-lista a, .ab-lista button { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 9px 10px; border-radius: 8px; text-decoration: none; color: var(--ab-ink); background: none; border: 0; font: 14px "Geist", Arial, sans-serif; cursor: pointer; text-align: left; width: 100%; }
  .ab-lista a:hover, .ab-lista button:hover { background: var(--ab-chip); }
  .ab-lista a.ab-on { background: var(--ab-chip); font-weight: 600; }
  .ab-lista small { color: var(--ab-slate); font-size: 12px; font-weight: 400; }
  .ab-lista .ab-linha { flex-direction: row; align-items: center; gap: 8px; }
  .ab-lista hr { border: 0; border-top: 1px solid var(--ab-line); margin: 4px 0; }
  .ab-lado { display: flex; align-items: center; gap: 14px; margin-left: auto; flex: none; }
  .ab-info { color: var(--ab-slate); font-size: 12.5px; white-space: nowrap; max-width: 280px; overflow: hidden; text-overflow: ellipsis; }
  .ab-site { color: var(--ab-soft); font-size: 14px; text-decoration: none; }
  .ab-site:hover { color: var(--ab-ink); }
  .ab-user { position: relative; }
  .ab-user > button { display: flex; align-items: center; gap: 10px; background: none; border: 0; cursor: pointer; padding: 4px 6px 4px 4px; border-radius: 10px; text-align: left; font: inherit; color: inherit; }
  .ab-user > button:hover { background: var(--ab-chip); }
  .ab-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--ab-acc); color: #fff; display: grid; place-items: center; font: 700 14px "Geist", Arial, sans-serif; }
  .ab-user.ab-trab .ab-avatar { background: var(--ab-blue); }
  .ab-nome { font-weight: 600; font-size: 14px; line-height: 1.2; display: block; }
  .ab-papel { color: var(--ab-slate); font-size: 12px; line-height: 1.2; display: block; }
  .ab-user .ab-lista { left: auto; right: 0; min-width: 220px; top: calc(100% + 8px); }
  .ab-hamb { display: none; background: none; border: 1px solid var(--ab-line); border-radius: 10px; width: 40px; height: 40px; cursor: pointer; align-items: center; justify-content: center; color: var(--ab-ink); }
  @media (max-width: 1440px) { .ab-info { display: none; } }
  @media (max-width: 1180px) { .ab-site { display: none; } }
  @media (max-width: 960px) {
    .ab-hamb { display: inline-flex; }
    .ab-menu { display: none; position: absolute; top: 64px; left: 0; right: 0; background: #fff; border-bottom: 1px solid var(--ab-line); flex-direction: column; height: auto; padding: 8px 16px 14px; box-shadow: 0 12px 24px rgba(0,0,0,.06); }
    .ab-top.ab-menu-aberto .ab-menu { display: flex; }
    .ab-menu > a, .ab-drop > button { height: 44px; border-bottom: 0; border-left: 2px solid transparent; }
    .ab-menu > a.ab-on, .ab-drop.ab-on > button { border-left-color: var(--ab-acc); }
    .ab-drop { flex-direction: column; }
    .ab-drop > .ab-lista { position: static; display: grid; box-shadow: none; border: 0; padding: 0 0 0 26px; min-width: 0; }
    .ab-drop .ab-seta { display: none; }
    .ab-nome, .ab-papel, .ab-user > button > .ab-seta { display: none; }
  }
  @media (max-width: 640px) { .ab-wrap { padding-inline: 16px; gap: 12px; } .ab-brand b { font-size: 19px; } }`;
  document.head.appendChild(css);

  const icone = {
    casa: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    dia: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    texto: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    lupa: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    term: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/>',
    seta: '<path d="M6 9l6 6 6-6"/>',
    sair: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    site: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    marca: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    peso: '<path d="M2 12h20M6 7v10M18 7v10M3.5 9v6M20.5 9v6"/>',
  };
  const ico = (n, cls = "") => `<svg class="ab-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${icone[n]}</svg>`;

  const topo = document.createElement("div");
  topo.className = "ab-top";
  topo.setAttribute("role", "banner");
  topo.innerHTML = `<div class="ab-wrap">
    <a class="ab-brand" href="/privado/"><span class="ab-logo">AA</span><b>Área privada</b></a>
    <nav class="ab-menu" aria-label="Seções da área privada" hidden></nav>
    <div class="ab-lado">
      <span class="ab-info" hidden></span>
      <a class="ab-site" href="/">Voltar ao site</a>
      <div class="ab-user" hidden>
        <button type="button" aria-haspopup="true" aria-expanded="false">
          <span class="ab-avatar">AA</span>
          <span><span class="ab-nome">Adriano Arruda</span><span class="ab-papel"></span></span>
          ${ico("seta", "ab-seta")}
        </button>
        <div class="ab-lista" role="menu">
          <a class="ab-linha" href="/" role="menuitem">${ico("site")}Ver o site</a>
          <a class="ab-linha ab-cmds" href="/comandos/" role="menuitem" hidden>${ico("term")}Meus comandos</a>
          <hr>
          <button class="ab-linha ab-sair" type="button" role="menuitem">${ico("sair")}Sair</button>
        </div>
      </div>
      <button class="ab-hamb" type="button" aria-label="Abrir o menu" hidden>${ico("menu")}</button>
    </div>
  </div>`;
  document.body.prepend(topo);
  const q = s => topo.querySelector(s);

  const FIXAS = [["privado", "Visão geral", "casa"], ["meudia", "Meu Dia", "dia"], ["salvos", "Salvos", "marca"], ["rascunhos", "Rascunhos", "texto"]];
  function monta(paginas) {
    // Comandos e Treino têm item próprio no menu; o resto são páginas de pesquisa
    const pesquisas = paginas.filter(p => p.nome !== "comandos" && p.nome !== "treino");
    const temCmds = paginas.some(p => p.nome === "comandos");
    const temTreino = paginas.some(p => p.nome === "treino");
    const emPesquisa = pesquisas.some(p => p.nome === atual);
    const item = (nome, txt, ic) => `<a href="/${nome}/"${nome === atual ? ' class="ab-on" aria-current="page"' : ""}>${ico(ic)}${esc(txt)}</a>`;
    q(".ab-menu").innerHTML = FIXAS.map(([n, t, i]) => item(n, t, i)).join("") +
      (pesquisas.length ? `<div class="ab-drop${emPesquisa ? " ab-on" : ""}"><button type="button" aria-expanded="false">${ico("lupa")}Pesquisas${ico("seta", "ab-seta")}</button>
        <div class="ab-lista">${pesquisas.map(p => `<a href="/${esc(p.nome)}/"${p.nome === atual ? ' class="ab-on" aria-current="page"' : ""}>${esc(p.titulo)}<small>${esc(p.descricao || "")}</small></a>`).join("")}</div></div>` : "") +
      (temTreino ? item("treino", "Treino", "peso") : "") +
      (temCmds ? item("comandos", "Comandos", "term") : "");
    q(".ab-menu").hidden = false;
    q(".ab-cmds").hidden = !temCmds;
    const d = q(".ab-drop");
    if (d) d.querySelector("button").addEventListener("click", e => { e.stopPropagation(); const a = d.classList.toggle("ab-aberto"); e.currentTarget.setAttribute("aria-expanded", a); });
  }

  const fecha = () => { q(".ab-user").classList.remove("ab-aberto"); q(".ab-drop")?.classList.remove("ab-aberto"); };
  q(".ab-user > button").addEventListener("click", e => { e.stopPropagation(); const a = q(".ab-user").classList.toggle("ab-aberto"); e.currentTarget.setAttribute("aria-expanded", a); });
  q(".ab-hamb").addEventListener("click", () => topo.classList.toggle("ab-menu-aberto"));
  document.addEventListener("click", fecha);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { fecha(); topo.classList.remove("ab-menu-aberto"); } });
  q(".ab-sair").addEventListener("click", async () => { await fetch("/api/entrar", { method: "DELETE" }); location.replace("/privado/"); });

  fetch("/api/entrar").then(r => r.ok ? r.json() : null).then(j => {
    if (!j) return;
    const trab = j.perfil === "trabalho";
    q(".ab-papel").textContent = trab ? "Senha do trabalho" : "Senha pessoal";
    q(".ab-user").classList.toggle("ab-trab", trab);
    q(".ab-user").hidden = false;
    q(".ab-hamb").hidden = false;
    fetch("/api/pagina?lista=1").then(r => r.ok ? r.json() : { paginas: [] }).then(({ paginas }) => monta(paginas)).catch(() => monta([]));
  }).catch(() => {});

  window.AreaBarra = {
    info(texto) { const el = q(".ab-info"); el.textContent = texto || ""; el.title = texto || ""; el.hidden = !texto; },
    // A visão geral avisa quando a pessoa acabou de entrar com a senha (a barra estava sem sessão)
    recarrega() { topo.remove(); css.remove(); delete window.AreaBarra; const s = document.createElement("script"); s.src = "/privado/barra.js?" + Date.now(); document.body.appendChild(s); },
  };
})();
