// Páginas da Área privada que vieram dos artifacts (Meus comandos, comparativos etc.).
// O HTML fica no Neon (privado_paginas), enviado do PC por area-privada/enviar_pagina.mjs.
// GET ?lista=1: as páginas que o perfil da sessão pode ver (cartões da Área privada).
// GET ?nome=<nome>: o HTML da página, se o perfil puder ver.
import { sql, perfilDe } from "./_sessao.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");

  try {
    const perfil = perfilDe(req);
    if (!perfil) return res.status(401).json({ erro: "Entre pela área privada" });
    if (req.method !== "GET") return res.status(405).json({ erro: "Método não aceito" });

    if (req.query.lista) {
      const paginas = await sql`select nome, titulo, descricao from privado_paginas where ${perfil} = any(perfis) order by titulo`;
      return res.status(200).json({ paginas });
    }

    const nome = String(req.query.nome || "").slice(0, 40);
    const [p] = await sql`select titulo, html, to_char(atualizado at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') as em
      from privado_paginas where nome = ${nome} and ${perfil} = any(perfis)`;
    if (!p) return res.status(404).json({ erro: "Página não encontrada" });
    return res.status(200).json({ titulo: p.titulo, html: p.html, enviado: p.em });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Erro no banco de dados" });
  }
}
