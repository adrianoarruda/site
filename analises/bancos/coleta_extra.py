"""Coleta das abas "Clientes e rede" e "Ações" do painel dos bancos.

- Clientes e reclamações: Ranking de reclamações do Banco Central (CSV trimestral; clientes do CCS).
- Agências e postos: cadastro do IF.data (mesmos arquivos da coleta principal).
- Ações: cotações oficiais da B3 (COTAHIST), número de ações da CVM (ITR/DFP, composição do capital)
  e, para retorno total e dividendos, o histórico ajustado do Yahoo Finance (fonte não oficial).
Uso: python coleta_extra.py [clientes|agencias|b3|cvm|yahoo] ... (sem argumentos: tudo)
"""
import csv, io, json, pathlib, sys, time, urllib.request, zipfile

AQUI = pathlib.Path(__file__).parent
BRUTOS = AQUI / "brutos"
UA = {"User-Agent": "Mozilla/5.0 (analise publica de bancos)"}
TRIMESTRES = [a * 100 + m for a in range(2016, 2027) for m in (3, 6, 9, 12) if a * 100 + m <= 202606]
BANCOS = ["Banco do Brasil", "Bradesco", "Itaú", "Santander"]
NOME_RANKING = {"BB": "Banco do Brasil", "BRADESCO": "Bradesco", "ITAU": "Itaú", "SANTANDER": "Santander"}
CNPJ = {"00.000.000/0001-91": "Banco do Brasil", "60.746.948/0001-12": "Bradesco",
        "60.872.504/0001-23": "Itaú", "90.400.888/0001-42": "Santander"}
# ações de cada banco na B3 (o valor de mercado soma todas as classes)
TICKERS = {"Banco do Brasil": ["BBAS3"], "Bradesco": ["BBDC3", "BBDC4"], "Itaú": ["ITUB3", "ITUB4"], "Santander": ["SANB3", "SANB4"]}
TICKER_PRINCIPAL = {"Banco do Brasil": "BBAS3", "Bradesco": "BBDC4", "Itaú": "ITUB4", "Santander": "SANB11"}


def baixa(url, destino, tentativas=5, vazio_ok=False):
    if destino.exists() and destino.stat().st_size > 0:
        return destino.read_bytes()
    for i in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=600) as r:
                dados = r.read()
            if not dados and vazio_ok:
                return b""
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_bytes(dados)
            return dados
        except Exception as e:
            print(f"  tentativa {i + 1} falhou ({url[:70]}): {str(e)[:60]}", file=sys.stderr)
            time.sleep(5 + 10 * i)
    raise SystemExit("Não consegui baixar " + url)


def clientes():
    saida = []
    for dt in TRIMESTRES:
        ano, tri = dt // 100, dt % 100 // 3
        url = f"https://www3.bcb.gov.br/rdrweb/rest/ext/ranking/arquivo?ano={ano}&periodicidade=TRIMESTRAL&periodo={tri}&tipo=Bancos+e+financeiras"
        texto = baixa(url, BRUTOS / "ranking" / f"ranking_{dt}.csv", vazio_ok=True).decode("latin-1")
        linhas = list(csv.reader(io.StringIO(texto), delimiter=";"))
        if not linhas:
            print("  sem ranking trimestral em", dt); continue
        cab = [c.strip() for c in linhas[0]]
        col = lambda nome: next(i for i, c in enumerate(cab) if c.startswith(nome))
        i_nome, i_tipo, i_ind, i_proc = col("Instituição financeira"), col("Tipo"), col("Índice"), next((i for i, c in enumerate(cab) if "procedentes" in c and "extrapol" not in c), None)
        i_cli = next(i for i, c in enumerate(cab) if c.startswith("Quantidade de clientes") and "CCS" in c and "SCR" not in c)
        for l in linhas[1:]:
            if len(l) <= i_cli or l[i_tipo].strip() != "Conglomerado":
                continue
            nome = l[i_nome].replace("(conglomerado)", "").strip().upper()
            if nome in NOME_RANKING:
                num = lambda v: float(v.replace(".", "").replace(",", ".")) if v.strip() else None
                saida.append({"banco": NOME_RANKING[nome], "trimestre": dt, "clientes": num(l[i_cli]),
                              "indice_reclamacoes": num(l[i_ind]), "reclamacoes_procedentes": num(l[i_proc]) if i_proc is not None else None})
    grava("clientes.csv", saida)


def agencias():
    codigos = {"10069": "Itaú", "10045": "Bradesco", "30379": "Santander", "49906": "Banco do Brasil"}
    idx = {}
    for nome in ("relatorios2000a2024", "relatorios2025a2030"):
        for t in json.loads((BRUTOS / "ifdata" / f"{nome}.json").read_text(encoding="utf-8")):
            idx[t["dt"]] = [f["f"] for f in t["files"]]
    saida = []
    for dt in TRIMESTRES:
        arq = next(f for f in idx[dt] if f.split("/")[-1] == f"cadastro{dt}_1005.json")
        dados = json.loads(baixa("https://www3.bcb.gov.br/ifdata/rest/arquivos?nomeArquivo=" + arq, BRUTOS / "ifdata" / str(dt) / f"cadastro{dt}_1005.json"))
        for x in dados:
            if x.get("c0") in codigos:
                n = lambda v: float(v) if str(v).strip() not in ("", "None") else None
                saida.append({"banco": codigos[x["c0"]], "trimestre": dt, "agencias": n(x.get("c16")), "postos": n(x.get("c17"))})
    grava("agencias.csv", saida)


def b3():
    """Último fechamento de cada trimestre, sem ajuste (serve para o valor de mercado da época)."""
    alvo = {t for ts in TICKERS.values() for t in ts} | {"SANB11"}
    fechamentos = {}
    for ano in range(2016, 2027):
        z = baixa(f"https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_A{ano}.ZIP", BRUTOS / "b3" / f"COTAHIST_A{ano}.ZIP")
        with zipfile.ZipFile(io.BytesIO(z)) as zf, zf.open(zf.namelist()[0]) as fh:
            for linha in io.TextIOWrapper(fh, encoding="latin-1"):
                if linha[:2] != "01" or linha[24:27] != "010":  # registro de cotação, mercado à vista
                    continue
                tk = linha[12:24].strip()
                if tk in alvo:
                    data = int(linha[2:10]); tri = data // 10000 * 100 + ((data // 100 % 100 - 1) // 3 + 1) * 3
                    fech = int(linha[108:121]) / 100
                    if (tk, tri) not in fechamentos or data > fechamentos[(tk, tri)][0]:
                        fechamentos[(tk, tri)] = (data, fech)
    grava("b3_fechamentos.csv", [{"ticker": tk, "trimestre": tri, "data": d, "fechamento": f} for (tk, tri), (d, f) in sorted(fechamentos.items())])


def cvm():
    """Número de ações (ordinárias e preferenciais, sem as em tesouraria) em cada ITR/DFP."""
    saida = []
    for ano in range(2016, 2027):
        for tipo in ("ITR", "DFP"):
            url = f"https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/{tipo}/DADOS/{tipo.lower()}_cia_aberta_{ano}.zip"
            try:
                z = baixa(url, BRUTOS / "cvm" / f"{tipo.lower()}_cia_aberta_{ano}.zip")
            except SystemExit:
                continue  # DFP do ano corrente ainda não existe
            with zipfile.ZipFile(io.BytesIO(z)) as zf:
                nome = next((n for n in zf.namelist() if "composicao_capital" in n), None)
                if not nome:
                    continue
                for r in csv.DictReader(io.TextIOWrapper(zf.open(nome), encoding="latin-1"), delimiter=";"):
                    if r.get("CNPJ_CIA") in CNPJ:
                        q = lambda k: float(r.get(k) or 0)
                        on = q("QT_ACAO_ORDIN_CAP_INTEGR") - q("QT_ACAO_ORDIN_TESOURO")
                        pn = q("QT_ACAO_PREF_CAP_INTEGR") - q("QT_ACAO_PREF_TESOURO")
                        if on + pn < 1e8:  # algumas companhias informam em milhares de ações
                            on, pn = on * 1000, pn * 1000
                        saida.append({"banco": CNPJ[r["CNPJ_CIA"]], "data": r["DT_REFER"], "acoes_on": on, "acoes_pn": pn})
    grava("cvm_acoes.csv", saida)


def yahoo():
    """Preço ajustado (dividendos e desdobramentos) no fim de cada mês e dividendos pagos, da ação principal."""
    saida, divs = [], []
    # a ação principal (retorno total e dividendos) e as outras classes (valor de mercado)
    lista = [(b, tk) for b, tk in TICKER_PRINCIPAL.items()] + [(b, tk) for b, tks in TICKERS.items() for tk in tks if tk != TICKER_PRINCIPAL[b]]
    for banco, tk in lista:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{tk}.SA?period1=1451606400&period2=1793750400&interval=1mo&events=div"
        r = json.loads(baixa(url, BRUTOS / "yahoo" / f"{tk}.json"))["chart"]["result"][0]
        q = r["indicators"]
        for ts, fe, aj in zip(r["timestamp"], q["quote"][0]["close"], q["adjclose"][0]["adjclose"]):
            saida.append({"banco": banco, "ticker": tk, "data": time.strftime("%Y-%m-%d", time.gmtime(ts)), "fechamento": fe, "ajustado": aj})
        if tk != TICKER_PRINCIPAL[banco]:
            continue
        for ev in (r.get("events") or {}).get("dividends", {}).values():
            divs.append({"banco": banco, "ticker": tk, "data": time.strftime("%Y-%m-%d", time.gmtime(ev["date"])), "valor": ev["amount"]})
    grava("yahoo_precos.csv", saida); grava("yahoo_dividendos.csv", divs)


def proventos():
    """Dividendos e JCP por ação, com a data "com" (último dia antes do ex), do site oficial da B3."""
    import base64
    nomes = {"Banco do Brasil": "BRASIL", "Bradesco": "BRADESCO", "Itaú": "ITAUUNIBANCO", "Santander": "SANTANDER BR"}
    saida = []
    for banco, nome in nomes.items():
        pagina, total = 1, 1
        while pagina <= total:
            cfg = base64.b64encode(json.dumps({"language": "pt-br", "pageNumber": pagina, "pageSize": 120, "tradingName": nome}).encode()).decode()
            url = "https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetListedCashDividends/" + cfg
            d = json.loads(baixa(url, BRUTOS / "b3" / f"proventos_{nome.replace(' ', '_')}_{pagina}.json"))
            total = d["page"]["totalPages"]
            for r in d["results"]:
                data = r.get("lastDatePriorEx") or ""
                if len(data) == 10:
                    saida.append({"banco": banco, "classe": r["typeStock"], "tipo": r["corporateAction"],
                                  "data_com": f"{data[6:]}-{data[3:5]}-{data[:2]}", "valor": float(r["valueCash"].replace(".", "").replace(",", "."))})
            pagina += 1
    grava("b3_proventos.csv", saida)


def grava(nome, linhas):
    with open(AQUI / nome, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(linhas[0].keys())); w.writeheader(); w.writerows(linhas)
    print(nome, len(linhas), "linhas")


if __name__ == "__main__":
    for etapa in sys.argv[1:] or ["clientes", "agencias", "yahoo", "cvm", "b3", "proventos"]:
        globals()[etapa]()
