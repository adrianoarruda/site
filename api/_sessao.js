// Área privada: uma senha abre Meu Dia, Links úteis e Rascunhos de uma vez.
// SENHA_PESSOAL dá acesso a tudo; SENHA_TRABALHO, a uma versão sem dados sensíveis (para o notebook do trabalho).
// Depois da senha, o navegador recebe um cookie de sessão assinado (HttpOnly): a senha não fica guardada no aparelho.
// Arquivo com "_" no começo: o Vercel não cria rota para ele.
import { neon } from "@neondatabase/serverless";
import { createHmac, timingSafeEqual } from "node:crypto";

export const sql = neon(process.env.DATABASE_URL);

const COOKIE = "sessao";
const MAX_ERROS_IP = 10;       // senhas erradas aceitas em 15 minutos, por endereço
const MAX_ERROS_TOTAL = 100;   // e somando todos os endereços (tentativa espalhada)

export function confere(esperado, recebido) {
  const a = Buffer.from(esperado || "");
  const b = Buffer.from(String(recebido || ""));
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export function perfilDaSenha(senha) {
  if (confere(process.env.SENHA_PESSOAL, senha)) return "pessoal";
  if (confere(process.env.SENHA_TRABALHO, senha)) return "trabalho";
  return null;
}

const assina = dados => createHmac("sha256", process.env.SESSAO_SEGREDO || "").update(dados).digest("base64url");

export function cookieDeSessao(perfil, lembrar) {
  const dias = lembrar ? 30 : 0.5;
  const dados = Buffer.from(JSON.stringify({ p: perfil, exp: Date.now() + dias * 864e5 })).toString("base64url");
  const validade = lembrar ? `; Max-Age=${dias * 86400}` : "";
  return `${COOKIE}=${dados}.${assina(dados)}; Path=/; HttpOnly; Secure; SameSite=Strict${validade}`;
}
export const cookieApagado = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

// "pessoal", "trabalho" ou null. O cabeçalho x-senha com a LINKS_SENHA continua valendo
// para os scripts do Claude (gravar links pela API); conta como pessoal.
export function perfilDe(req) {
  if (confere(process.env.LINKS_SENHA, req.headers["x-senha"])) return "pessoal";
  const m = String(req.headers.cookie || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m || !process.env.SESSAO_SEGREDO) return null;
  const [dados, sig] = m[1].split(".");
  if (!dados || !sig || !confere(assina(dados), sig)) return null;
  try {
    const { p, exp } = JSON.parse(Buffer.from(dados, "base64url").toString());
    return exp > Date.now() && (p === "pessoal" || p === "trabalho") ? p : null;
  } catch (e) { return null; }
}

export const ipDe = req => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim().slice(0, 60);

export async function bloqueado(ip) {
  const [r] = await sql`select count(*)::int as total, count(*) filter (where ip = ${ip})::int as deste
    from meudia_tentativas where quando > now() - interval '15 minutes'`;
  return r.deste >= MAX_ERROS_IP || r.total >= MAX_ERROS_TOTAL;
}
export async function registraErro(ip) {
  await sql`insert into meudia_tentativas (ip) values (${ip})`;
  await sql`delete from meudia_tentativas where quando < now() - interval '1 day'`;
}
