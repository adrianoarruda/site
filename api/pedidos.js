// Fila de pedidos ao Claude: o botão "Pedir ao Claude" da Área privada grava aqui; a tarefa diária do PC
// (e o /meudia) lê a fila, faz o pedido e marca como feito, com o resultado em uma linha.
// GET (sessão pessoal ou x-senha) lista; POST (sessão pessoal) cria; PATCH (x-senha, o PC) muda a situação;
// DELETE ?id= (sessão pessoal) cancela um pedido que ainda está na fila.
import { sql, confere, perfilDe } from "./_sessao.js";

const limpa = (v, max) => String(v ?? "").trim().slice(0, max);
const corpoDe = req => (typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}));
const negado = async res => { await new Promise(r => setTimeout(r, 800)); return res.status(401).json({ erro: "Acesso negado" }); };
const SITUACOES = ["fila", "fazendo", "feito", "erro"];

let tabelaPronta = false;
async function tabela() {
  if (tabelaPronta) return;
  await sql`create table if not exists pedidos (id serial primary key, texto text not null, pagina text not null default '',
    situacao text not null default 'fila', resultado text not null default '', criado timestamptz not null default now(), feito timestamptz)`;
  tabelaPronta = true;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  try {
    await tabela();
    const pc = confere(process.env.LINKS_SENHA, req.headers["x-senha"]);
    const pessoal = perfilDe(req) === "pessoal";

    if (req.method === "GET") {
      if (!pessoal && !pc) return negado(res);
      const pedidos = await sql`select id, texto, pagina, situacao, resultado, criado, feito from pedidos
        where situacao in ('fila', 'fazendo') or criado > now() - interval '15 days' order by criado desc limit 40`;
      return res.status(200).json({ pedidos });
    }
    if (req.method === "POST") {
      if (!pessoal) return negado(res);
      const b = corpoDe(req);
      const texto = limpa(b.texto, 500);
      if (!texto) return res.status(400).json({ erro: "Pedido vazio" });
      const [p] = await sql`insert into pedidos (texto, pagina) values (${texto}, ${limpa(b.pagina, 40)})
        returning id, texto, pagina, situacao, resultado, criado, feito`;
      return res.status(201).json({ pedido: p });
    }
    if (req.method === "PATCH") {
      if (!pc) return negado(res);
      const b = corpoDe(req);
      const situacao = SITUACOES.includes(b.situacao) ? b.situacao : null;
      if (!situacao || !b.id) return res.status(400).json({ erro: "Informe id e situação" });
      await sql`update pedidos set situacao = ${situacao}, resultado = ${limpa(b.resultado, 600)},
        feito = ${situacao === "feito" || situacao === "erro" ? new Date().toISOString() : null} where id = ${parseInt(b.id, 10)}`;
      return res.status(200).json({ ok: true });
    }
    if (req.method === "DELETE") {
      if (!pessoal) return negado(res);
      await sql`delete from pedidos where id = ${parseInt(req.query.id, 10) || 0} and situacao = 'fila'`;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ erro: "Método não aceito" });
  } catch (e) {
    return res.status(500).json({ erro: "Erro no servidor" });
  }
}
