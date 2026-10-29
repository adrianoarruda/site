// Links úteis: lista, inclui e remove links guardados no Neon (Postgres).
// Tudo exige a senha (variável LINKS_SENHA no Vercel), enviada no cabeçalho x-senha.
import { neon } from "@neondatabase/serverless";
import { timingSafeEqual, randomUUID } from "node:crypto";

const sql = neon(process.env.DATABASE_URL);

function senhaOk(req) {
  const esperada = Buffer.from(process.env.LINKS_SENHA || "");
  const recebida = Buffer.from(String(req.headers["x-senha"] || ""));
  return esperada.length > 0 && esperada.length === recebida.length && timingSafeEqual(esperada, recebida);
}

function limpa(v, max) {
  return String(v ?? "").trim().slice(0, max);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");

  if (!senhaOk(req)) {
    // Atraso curto para dificultar tentativa e erro da senha
    await new Promise(r => setTimeout(r, 800));
    return res.status(401).json({ erro: "Senha incorreta" });
  }

  try {
    if (req.method === "GET") {
      const links = await sql`select id, t, url, cat, d, to_char(add, 'DD/MM/YYYY') as add from links order by cat, t`;
      return res.status(200).json({ links });
    }

    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const url = limpa(b.url, 2000);
      const t = limpa(b.t, 120);
      const cat = limpa(b.cat, 60) || "Outros";
      const d = limpa(b.d, 400);
      if (!t || !/^https?:\/\/[^\s]+$/i.test(url)) {
        return res.status(400).json({ erro: "Preencha o nome e um endereço que comece com http:// ou https://" });
      }
      const id = "lk-" + randomUUID().slice(0, 8);
      const [link] = await sql`insert into links (id, t, url, cat, d) values (${id}, ${t}, ${url}, ${cat}, ${d})
        returning id, t, url, cat, d, to_char(add, 'DD/MM/YYYY') as add`;
      return res.status(201).json({ link });
    }

    if (req.method === "DELETE") {
      const id = limpa(req.query.id, 60);
      await sql`delete from links where id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ erro: "Método não aceito" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Erro no banco de dados" });
  }
}
