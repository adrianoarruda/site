// Meu Dia: painel privado de pendências. O conteúdo (gerado no PC a partir do meudia/painel.html)
// e as marcações ficam no Neon; nada disso vai para o repositório público.
// Acesso pela sessão da área privada (ver _sessao.js). O perfil "trabalho" recebe a versão reduzida
// (html_trabalho/js_trabalho) e só as marcações dos itens que aparecem nela (ids_trabalho).
import { sql, perfilDe } from "./_sessao.js";

const THUMBS_POR_PAGINA = 100;

function corpo(req) {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
}

async function idsTrabalho() {
  const [l] = await sql`select valor from meudia_conteudo where chave = 'ids_trabalho'`;
  return new Set(l ? JSON.parse(l.valor) : []);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");

  try {
    const perfil = perfilDe(req);
    if (!perfil) return res.status(401).json({ erro: "Entre pela área privada" });
    const trabalho = perfil === "trabalho";
    const parte = String(req.query.parte || "");

    if (req.method === "GET" && parte === "conteudo") {
      const [h, j] = trabalho ? ["html_trabalho", "js_trabalho"] : ["html", "js"];
      const linhas = await sql`select chave, valor, to_char(atualizado at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') as em
        from meudia_conteudo where chave in ('css', ${h}, ${j})`;
      const c = Object.fromEntries(linhas.map(l => [l.chave, l.valor]));
      const em = linhas.map(l => l.em).sort().pop() || "";
      return res.status(200).json({ perfil, css: c.css || "", html: c[h] || "", js: c[j] || "", enviado: em });
    }

    // Salvos do YouTube e do Instagram (página /salvos/ do site): iguais para as duas senhas
    if (req.method === "GET" && parte === "salvos") {
      const [l] = await sql`select valor from meudia_conteudo where chave = 'salvos'`;
      return res.status(200).json({ perfil, salvos: l ? JSON.parse(l.valor) : {} });
    }

    if (req.method === "GET" && parte === "resumo") {
      const [l] = await sql`select valor, to_char(atualizado at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') as em
        from meudia_conteudo where chave = ${trabalho ? "resumo_trabalho" : "resumo"}`;
      return res.status(200).json({ perfil, resumo: l ? JSON.parse(l.valor) : null, enviado: l ? l.em : "" });
    }

    if (req.method === "GET" && parte === "marcas") {
      const linhas = await sql`select id, dados from meudia_marcas`;
      const permitidos = trabalho ? await idsTrabalho() : null;
      return res.status(200).json({ marcas: Object.fromEntries(linhas.filter(l => !permitidos || permitidos.has(l.id)).map(l => [l.id, l.dados])) });
    }

    if (req.method === "PUT" && parte === "marca") {
      const id = String(req.query.id || "").slice(0, 100);
      const b = corpo(req);
      if (!id || typeof b !== "object" || JSON.stringify(b).length > 20000) {
        return res.status(400).json({ erro: "Marcação inválida" });
      }
      if (trabalho && !(await idsTrabalho()).has(id)) return res.status(403).json({ erro: "Item fora da versão do trabalho" });
      await sql`insert into meudia_marcas (id, dados) values (${id}, ${JSON.stringify(b)}::jsonb)
        on conflict (id) do update set dados = excluded.dados, atualizado = now()`;
      return res.status(200).json({ ok: true });
    }

    if (req.method === "GET" && parte === "thumbs") {
      const pagina = Math.max(0, parseInt(req.query.pagina, 10) || 0);
      const linhas = await sql`select id, uri from meudia_thumbs order by id
        limit ${THUMBS_POR_PAGINA + 1} offset ${pagina * THUMBS_POR_PAGINA}`;
      const mais = linhas.length > THUMBS_POR_PAGINA;
      return res.status(200).json({ thumbs: Object.fromEntries(linhas.slice(0, THUMBS_POR_PAGINA).map(l => [l.id, l.uri])), mais });
    }

    return res.status(400).json({ erro: "Pedido não reconhecido" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Erro no banco de dados" });
  }
}
