// Entrada da área privada. POST {senha, lembrar}: confere a senha e grava o cookie de sessão.
// GET: diz com qual perfil o navegador está (ou 401). DELETE: sai.
import { perfilDaSenha, perfilDe, cookieDeSessao, cookieApagado, ipDe, bloqueado, registraErro } from "./_sessao.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");

  try {
    if (req.method === "GET") {
      const perfil = perfilDe(req);
      return perfil ? res.status(200).json({ perfil }) : res.status(401).json({ erro: "Sem sessão" });
    }

    if (req.method === "DELETE") {
      res.setHeader("Set-Cookie", cookieApagado);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "POST") {
      const ip = ipDe(req);
      if (await bloqueado(ip)) {
        return res.status(429).json({ erro: "Muitas senhas erradas. Tente de novo em 15 minutos." });
      }
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const perfil = perfilDaSenha(b.senha);
      if (!perfil) {
        await registraErro(ip);
        // Atraso curto para dificultar tentativa e erro da senha
        await new Promise(r => setTimeout(r, 800));
        return res.status(401).json({ erro: "Senha incorreta" });
      }
      res.setHeader("Set-Cookie", cookieDeSessao(perfil, !!b.lembrar));
      return res.status(200).json({ perfil });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ erro: "Método não aceito" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Erro no servidor" });
  }
}
