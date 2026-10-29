// Blog: rascunhos escritos pela rotina semanal do Claude, revisados e publicados pelo Adriano.
// GET público: posts publicados (lista ou ?slug=).
// GET ?fontes=1 e POST (novos rascunhos): só a rotina, com o token NOTICIAS_TOKEN no cabeçalho x-token.
// GET ?rascunhos=1 e PATCH (editar, publicar, descartar): só o Adriano, com a senha LINKS_SENHA no cabeçalho x-senha.
import { neon } from "@neondatabase/serverless";
import { timingSafeEqual } from "node:crypto";

const sql = neon(process.env.DATABASE_URL);

function confere(valorEsperado, recebido) {
  const a = Buffer.from(valorEsperado || "");
  const b = Buffer.from(String(recebido || ""));
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}
const tokenOk = req => confere(process.env.NOTICIAS_TOKEN, req.headers["x-token"]);
const senhaOk = req => confere(process.env.LINKS_SENHA, req.headers["x-senha"]);
const limpa = (v, max) => String(v ?? "").trim().slice(0, max);
const corpoDe = req => (typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}));
const urlOk = u => /^https?:\/\/\S+$/i.test(u);
const negado = async res => { await new Promise(r => setTimeout(r, 800)); return res.status(401).json({ erro: "Acesso negado" }); };

function slugDe(titulo) {
  const base = titulo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70).replace(/-+$/, "");
  return (base || "post") + "-" + Math.random().toString(36).slice(2, 6);
}

const CAMPOS = sql.unsafe(`id, slug, status, titulo, resumo, corpo, tema, fonte, fonte_url, editado,
  to_char(criado_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') as criado,
  to_char(publicado_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') as publicado`);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    // Leitura pública
    if (req.method === "GET" && !req.query.fontes && !req.query.rascunhos) {
      res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
      if (req.query.slug) {
        const [post] = await sql`select ${CAMPOS} from posts where slug = ${limpa(req.query.slug, 120)} and status = 'publicado'`;
        return post ? res.status(200).json({ post }) : res.status(404).json({ erro: "Post não encontrado" });
      }
      const limite = Math.min(50, Math.max(1, parseInt(req.query.limite, 10) || 50));
      const posts = await sql`select slug, titulo, resumo, tema, fonte,
          to_char(publicado_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') as publicado
        from posts where status = 'publicado' order by publicado_em desc limit ${limite}`;
      return res.status(200).json({ posts });
    }

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex");

    // Rotina: fontes e envio de rascunhos
    if (req.method === "GET" && req.query.fontes) {
      if (!tokenOk(req)) return negado(res);
      const fontes = await sql`select t, url, feed, cat, d from links where feed is not null order by cat, t`;
      const usadas = await sql`select fonte_url from posts where criado_em > now() - interval '60 days'`;
      return res.status(200).json({ fontes, ja_usadas: usadas.map(r => r.fonte_url) });
    }
    if (req.method === "POST") {
      if (!tokenOk(req)) return negado(res);
      const lista = Array.isArray(corpoDe(req).rascunhos) ? corpoDe(req).rascunhos.slice(0, 6) : [];
      const gravados = [];
      for (const r of lista) {
        const titulo = limpa(r.titulo, 160), corpo = limpa(r.corpo, 8000), fonte_url = limpa(r.fonte_url, 2000);
        if (!titulo || corpo.length < 200 || !urlOk(fonte_url)) continue;
        const [p] = await sql`insert into posts (slug, titulo, resumo, corpo, tema, fonte, fonte_url)
          values (${slugDe(titulo)}, ${titulo}, ${limpa(r.resumo, 300)}, ${corpo}, ${limpa(r.tema, 40)}, ${limpa(r.fonte, 80)}, ${fonte_url})
          returning id, slug`;
        gravados.push(p);
      }
      // Rascunho esquecido por mais de 15 dias sai da fila
      await sql`update posts set status = 'descartado' where status = 'rascunho' and criado_em < now() - interval '15 days'`;
      return gravados.length ? res.status(201).json({ gravados }) : res.status(400).json({ erro: "Nenhum rascunho válido" });
    }

    // Adriano: revisar
    if (!senhaOk(req)) return negado(res);
    if (req.method === "GET") {
      const rascunhos = await sql`select ${CAMPOS} from posts where status = 'rascunho' order by criado_em desc`;
      const publicados = await sql`select ${CAMPOS} from posts where status = 'publicado' order by publicado_em desc limit 20`;
      return res.status(200).json({ rascunhos, publicados });
    }
    if (req.method === "PATCH") {
      const b = corpoDe(req);
      const id = parseInt(b.id, 10);
      const [atual] = await sql`select id, status from posts where id = ${id}`;
      if (!atual) return res.status(404).json({ erro: "Post não encontrado" });
      if (b.titulo !== undefined || b.resumo !== undefined || b.corpo !== undefined) {
        const titulo = limpa(b.titulo, 160), corpo = limpa(b.corpo, 8000);
        if (!titulo || !corpo) return res.status(400).json({ erro: "Título e texto não podem ficar vazios" });
        await sql`update posts set titulo = ${titulo}, resumo = ${limpa(b.resumo, 300)}, corpo = ${corpo}, editado = true where id = ${id}`;
      }
      if (b.acao === "publicar") await sql`update posts set status = 'publicado', publicado_em = coalesce(publicado_em, now()) where id = ${id}`;
      if (b.acao === "descartar") await sql`update posts set status = 'descartado' where id = ${id}`;
      if (b.acao === "despublicar") await sql`update posts set status = 'rascunho' where id = ${id}`;
      const [post] = await sql`select ${CAMPOS} from posts where id = ${id}`;
      return res.status(200).json({ post });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ erro: "Método não aceito" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Erro no banco de dados" });
  }
}
