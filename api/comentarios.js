// Comentários dos posts e análises do blog. Abertos e sem aprovação (pedido do Adriano, 05/11/2026:
// crítica também é bem-vinda). As proteções são só contra robô e abuso, nunca contra opinião:
// campo escondido que só robô preenche, limite de envios por endereço, tamanho máximo e no máximo 2 links.
// GET ?slug=: lista pública. POST {slug, nome, texto, site}: comenta (com a sessão pessoal, sai como autor).
// DELETE ?id=: apaga, só com a sessão pessoal da Área privada.
import { createHash } from "node:crypto";
import { sql, perfilDe, ipDe } from "./_sessao.js";

const MAX_POR_HORA = 6;

const limpa = (v, max) => String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
const corpoDe = req => (typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}));
// O endereço não fica guardado: só um resumo (hash) dele, para o limite de envios, apagado depois de 1 dia
const resumoDoIp = req => createHash("sha256").update((process.env.SESSAO_SEGREDO || "") + ipDe(req)).digest("hex").slice(0, 32);

let tabelasProntas = false;
async function prepara() {
  if (tabelasProntas) return;
  await sql`create table if not exists comentarios (id serial primary key, slug text not null, nome text not null,
    texto text not null, do_autor boolean not null default false, criado timestamptz not null default now())`;
  await sql`create index if not exists comentarios_slug on comentarios (slug, criado)`;
  await sql`create table if not exists comentarios_envios (ip text not null, quando timestamptz not null default now())`;
  tabelasProntas = true;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    await prepara();

    if (req.method === "GET") {
      const slug = limpa(req.query.slug, 120);
      const comentarios = await sql`select id, nome, texto, do_autor,
          to_char(criado at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI') as quando
        from comentarios where slug = ${slug} order by criado`;
      return res.status(200).json({ comentarios, autor: perfilDe(req) === "pessoal" });
    }

    if (req.method === "POST") {
      const b = corpoDe(req);
      // Campo "site" fica escondido na página: gente não vê, robô preenche
      if (limpa(b.site, 200)) return res.status(200).json({ ok: true });
      const slug = limpa(b.slug, 120);
      const autor = perfilDe(req) === "pessoal";
      const nome = autor ? "Adriano Arruda" : (limpa(b.nome, 60) || "Anônimo");
      const texto = limpa(b.texto, 2000);
      if (texto.length < 2) return res.status(400).json({ erro: "Escreva o comentário antes de enviar." });
      if ((texto.match(/https?:\/\//gi) || []).length > 2) return res.status(400).json({ erro: "No máximo 2 links por comentário." });
      const [post] = await sql`select 1 from posts where slug = ${slug} and status = 'publicado'`;
      if (!post) return res.status(404).json({ erro: "Post não encontrado." });

      if (!autor) {
        const ip = resumoDoIp(req);
        await sql`delete from comentarios_envios where quando < now() - interval '1 day'`;
        const [r] = await sql`select count(*)::int as n from comentarios_envios where ip = ${ip} and quando > now() - interval '1 hour'`;
        if (r.n >= MAX_POR_HORA) return res.status(429).json({ erro: "Muitos comentários seguidos. Tente de novo daqui a pouco." });
        await sql`insert into comentarios_envios (ip) values (${ip})`;
      }

      const [c] = await sql`insert into comentarios (slug, nome, texto, do_autor) values (${slug}, ${nome}, ${texto}, ${autor})
        returning id, nome, texto, do_autor, to_char(criado at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI') as quando`;
      return res.status(201).json({ comentario: c });
    }

    if (req.method === "DELETE") {
      if (perfilDe(req) !== "pessoal") return res.status(401).json({ erro: "Só o autor do blog apaga comentários." });
      await sql`delete from comentarios where id = ${parseInt(req.query.id, 10) || 0}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ erro: "Método não aceito" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Erro no banco de dados" });
  }
}
