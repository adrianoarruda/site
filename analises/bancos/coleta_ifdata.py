"""Coleta do IF.data (Banco Central) para Itaú, Bradesco, Santander e Banco do Brasil.

Para cada trimestre, baixa os relatórios dos conglomerados financeiros (Resumo, Ativo, Passivo,
Demonstração de Resultado e Informações de Capital) e grava tudo numa tabela longa:
trimestre, banco, relatorio, coluna, valor. Os arquivos brutos ficam em cache em brutos/ifdata/.

Uso: python coleta_ifdata.py [AAAAMM_inicial] [AAAAMM_final]
"""
import csv, json, pathlib, sys, time, urllib.request

AQUI = pathlib.Path(__file__).parent
CACHE = AQUI / "brutos" / "ifdata"
SAIDA = AQUI / "ifdata_longo.csv"
BASE = "https://www3.bcb.gov.br/ifdata/rest/"
# Códigos dos conglomerados financeiros no IF.data (coluna c0 do cadastro)
BANCOS = {10069: "Itaú", 10045: "Bradesco", 30379: "Santander", 49906: "Banco do Brasil"}
# Conglomerados prudenciais (só para Informações de Capital, que o IF.data publica nesse nível)
PRUDENCIAIS = {80099: "Itaú", 80075: "Bradesco", 80185: "Santander", 80329: "Banco do Brasil"}
# relatório -> tipos de consolidação aceitos (1005 = conglomerado financeiro; 1004/1009 = prudencial)
RELATORIOS = {"Resumo": {1005}, "Ativo": {1005}, "Passivo": {1005}, "Demonstração de Resultado": {1005},
              "Carteira de crédito ativa - por nível de risco da operação": {1005},
              "Informações de Capital": {1004, 1009}}


def baixa(caminho, destino=None, tentativas=6):
    destino = destino or CACHE / caminho.replace("//", "/").replace("ifdata_2025_2030/", "").replace("ifdata/", "")
    if destino.exists() and destino.stat().st_size > 0:
        return json.loads(destino.read_text(encoding="utf-8"))
    url = BASE + ("arquivos?nomeArquivo=" + caminho if not caminho.startswith("relatorios") else caminho)
    for i in range(tentativas):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (analise publica de bancos)"})
            with urllib.request.urlopen(req, timeout=300) as r:
                texto = r.read().decode("utf-8")
            dados = json.loads(texto)
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_text(texto, encoding="utf-8")
            return dados
        except Exception as e:  # a API do Banco Central às vezes falha; tenta de novo
            print(f"  tentativa {i + 1} falhou: {str(e)[:80]}", file=sys.stderr)
            time.sleep(4 + 6 * i)
    raise SystemExit("Não consegui baixar " + url)


def indice():
    trimestres = {}
    for nome in ("relatorios2000a2024", "relatorios2025a2030"):
        for t in baixa(nome, CACHE / f"{nome}.json"):
            trimestres[t["dt"]] = [f["f"] for f in t["files"]]
    return trimestres


def colunas(cols):
    for c in cols:
        yield c
        yield from colunas(c.get("sc") or [])


def coleta_trimestre(dt, arquivos):
    acha = lambda prefixo: [f for f in arquivos if f.split("/")[-1].startswith(prefixo)]
    info = {x["id"]: x for x in baixa(acha("info")[0])}
    linhas, lids_usados = [], {}
    for f in acha("trel"):
        rel = baixa(f)
        nome_rel = " ".join((rel.get("n") or "").split())
        tipos = {s.get("id") for s in rel.get("s") or []}
        if nome_rel not in RELATORIOS or not (tipos & RELATORIOS[nome_rel]):
            continue
        for c in colunas(rel["c"]):
            x = info.get(c["ifd"])
            if x and x.get("lid", -1) > 100 and x.get("td") == 3:  # só colunas numéricas
                lids_usados[x["lid"]] = (nome_rel, " ".join(x["n"].split()))
    valores = {}
    for f in acha("dados"):
        d = baixa(f)
        for e in d["values"]:
            banco = BANCOS.get(e["e"]) or PRUDENCIAIS.get(e["e"]) or PRUDENCIAIS.get(e["e"] % 100000000)
            if banco:
                for v in e["v"]:
                    if v["i"] in lids_usados and v["v"] is not None:
                        chave = (banco, v["i"])
                        # o conglomerado financeiro tem prioridade sobre o prudencial no mesmo item
                        if chave not in valores or e["e"] in BANCOS:
                            valores[chave] = v["v"]
    for (banco, lid), v in valores.items():
        rel, nome = lids_usados[lid]
        linhas.append((dt, banco, rel, nome, lid, v))
    return linhas


if __name__ == "__main__":
    ini = int(sys.argv[1]) if len(sys.argv) > 1 else 201603
    fim = int(sys.argv[2]) if len(sys.argv) > 2 else 209912
    todos = indice()
    ja = set()
    if SAIDA.exists():
        with open(SAIDA, encoding="utf-8") as fh:
            ja = {int(r["trimestre"]) for r in csv.DictReader(fh)}
    novo = not SAIDA.exists()
    with open(SAIDA, "a", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        if novo:
            w.writerow(["trimestre", "banco", "relatorio", "coluna", "lid", "valor"])
        for dt in sorted(t for t in todos if ini <= t <= fim and t % 100 in (3, 6, 9, 12)):
            if dt in ja:
                continue
            linhas = coleta_trimestre(dt, todos[dt])
            w.writerows(linhas); fh.flush()
            print(dt, len(linhas), "valores", {b: sum(1 for l in linhas if l[1] == b) for b in BANCOS.values()})
