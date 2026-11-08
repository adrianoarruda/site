// Atualizações automáticas: o que cada parte da atualização diária encontrou e se deu certo.
// Quem grava: a rotina das 8h na nuvem (cabeçalho x-token com o NOTICIAS_TOKEN) e a tarefa diária do PC
// (cabeçalho x-senha com a LINKS_SENHA). Quem lê: a Área privada, pela sessão (visão geral e aba "Hoje" do Meu Dia).
// POST { partes: [{ parte, situacao: "ok"|"aviso"|"erro"|"aguardando", resumo, detalhe, dados }] }
// GET  ?carteira=1 (com token): a lista da carteira que a rotina usa nas notícias e nos fundos.
import { sql, confere, perfilDe } from "./_sessao.js";

const PARTES = ["email", "transito", "fundos", "noticias_rf", "noticias_rv", "instagram_email", "youtube", "instagram", "pedidos", "carteira"];
// Na versão do trabalho só aparecem as partes sem dados pessoais, e sem o conteúdo
const DO_TRABALHO = ["youtube", "instagram", "pedidos"];
const SITUACOES = ["ok", "aviso", "erro", "aguardando"];
const limpa = (v, max) => String(v ?? "").trim().slice(0, max);
const corpoDe = req => (typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}));
const negado = async res => { await new Promise(r => setTimeout(r, 800)); return res.status(401).json({ erro: "Acesso negado" }); };
const quemGrava = req => confere(process.env.NOTICIAS_TOKEN, req.headers["x-token"]) || confere(process.env.LINKS_SENHA, req.headers["x-senha"]);

let tabelaPronta = false;
async function tabela() {
  if (tabelaPronta) return;
  await sql`create table if not exists atualizacoes (parte text primary key, situacao text not null, resumo text not null default '',
    detalhe text not null default '', dados jsonb, quando timestamptz not null default now())`;
  tabelaPronta = true;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  try {
    await tabela();

    if (req.method === "GET" && req.query.carteira) {
      if (!quemGrava(req)) return negado(res);
      const [c] = await sql`select dados, to_char(quando at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') as em from atualizacoes where parte = 'carteira'`;
      return res.status(200).json({ carteira: c ? c.dados : null, atualizada: c ? c.em : "" });
    }

    if (req.method === "GET") {
      const perfil = perfilDe(req);
      if (!perfil) return negado(res);
      const trab = perfil === "trabalho";
      const linhas = await sql`select parte, situacao, resumo, detalhe, dados, quando from atualizacoes where parte <> 'carteira'`;
      const partes = linhas.filter(l => !trab || DO_TRABALHO.includes(l.parte)).map(l => ({
        parte: l.parte, situacao: l.situacao, resumo: l.resumo, quando: l.quando,
        ...(trab ? {} : { detalhe: l.detalhe, dados: l.dados }),
      }));
      return res.status(200).json({ perfil, agora: new Date().toISOString(), partes });
    }

    if (req.method === "POST") {
      if (!quemGrava(req)) return negado(res);
      const lista = Array.isArray(corpoDe(req).partes) ? corpoDe(req).partes.slice(0, 12) : [];
      const gravadas = [];
      for (const p of lista) {
        const parte = limpa(p.parte, 30);
        if (!PARTES.includes(parte)) continue;
        const situacao = SITUACOES.includes(p.situacao) ? p.situacao : "aviso";
        const dados = p.dados === undefined ? null : JSON.stringify(p.dados);
        if (dados && dados.length > 400000) return res.status(413).json({ erro: `dados de ${parte} grandes demais` });
        await sql`insert into atualizacoes (parte, situacao, resumo, detalhe, dados, quando)
          values (${parte}, ${situacao}, ${limpa(p.resumo, 300)}, ${limpa(p.detalhe, 4000)}, ${dados}::jsonb, now())
          on conflict (parte) do update set situacao = excluded.situacao, resumo = excluded.resumo, detalhe = excluded.detalhe,
            dados = excluded.dados, quando = excluded.quando`;
        gravadas.push(parte);
      }
      return res.status(201).json({ gravadas });
    }

    return res.status(405).json({ erro: "Método não aceito" });
  } catch (e) {
    return res.status(500).json({ erro: "Erro no servidor" });
  }
}
