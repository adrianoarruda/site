// Notícias do dia, escolhidas pela rotina diária do Claude a partir das fontes da página de links.
// GET público: as notícias do dia mais recente (aparecem na página principal).
// GET ?fontes=1 e POST exigem o token da rotina (variável NOTICIAS_TOKEN), no cabeçalho x-token.
import { neon } from "@neondatabase/serverless";
import { timingSafeEqual } from "node:crypto";

const sql = neon(process.env.DATABASE_URL);

function tokenOk(req) {
  const esperado = Buffer.from(process.env.NOTICIAS_TOKEN || "");
  const recebido = Buffer.from(String(req.headers["x-token"] || ""));
  return esperado.length > 0 && esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

const limpa = (v, max) => String(v ?? "").trim().slice(0, max);

export default async function handler(req, res) {
  // A página principal também roda no GitHub Pages, então a leitura aceita outros domínios
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "GET" && !req.query.fontes) {
      res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
      const [ultimo] = await sql`select max(dia) as dia from noticias`;
      if (!ultimo?.dia) return res.status(200).json({ dia: null, itens: [] });
      const itens = await sql`select titulo, resumo, fonte, url, tema, to_char(publicado_em, 'DD/MM') as publicado
        from noticias where dia = ${ultimo.dia} order by ordem`;
      const [{ dia }] = await sql`select to_char(${ultimo.dia}::date, 'DD/MM/YYYY') as dia`;
      return res.status(200).json({ dia, itens });
    }

    res.setHeader("Cache-Control", "no-store");
    if (!tokenOk(req)) {
      await new Promise(r => setTimeout(r, 800));
      return res.status(401).json({ erro: "Token inválido" });
    }

    if (req.method === "GET") {
      const fontes = await sql`select t, url, feed, cat, d from links where feed is not null order by cat, t`;
      const recentes = await sql`select url from noticias where dia > current_date - 7`;
      return res.status(200).json({ fontes, ja_publicadas: recentes.map(r => r.url) });
    }

    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const dia = limpa(b.dia, 10);
      const itens = Array.isArray(b.itens) ? b.itens.slice(0, 12) : [];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !itens.length) {
        return res.status(400).json({ erro: "Envie dia (AAAA-MM-DD) e ao menos um item" });
      }
      const validos = itens.map((it, i) => ({
        ordem: i,
        titulo: limpa(it.titulo, 200),
        resumo: limpa(it.resumo, 400),
        fonte: limpa(it.fonte, 80),
        url: limpa(it.url, 2000),
        tema: limpa(it.tema, 40),
        publicado_em: /^\d{4}-\d{2}-\d{2}/.test(String(it.publicado_em || "")) ? String(it.publicado_em).slice(0, 25) : null,
      })).filter(it => it.titulo && it.fonte && /^https?:\/\/\S+$/i.test(it.url));
      if (!validos.length) return res.status(400).json({ erro: "Nenhum item válido" });

      // Reenviar o mesmo dia substitui a seleção daquele dia
      await sql`delete from noticias where dia = ${dia}`;
      for (const it of validos) {
        await sql`insert into noticias (dia, ordem, titulo, resumo, fonte, url, tema, publicado_em)
          values (${dia}, ${it.ordem}, ${it.titulo}, ${it.resumo}, ${it.fonte}, ${it.url}, ${it.tema}, ${it.publicado_em})`;
      }
      await sql`delete from noticias where dia < current_date - 30`;
      return res.status(201).json({ ok: true, dia, gravados: validos.length });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ erro: "Método não aceito" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Erro no banco de dados" });
  }
}
