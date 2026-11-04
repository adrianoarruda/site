"""Gera o JSON do painel (publicar/dados/bancos_balancos.json) a partir de bancos_indicadores.csv."""
import csv, datetime, json, pathlib

AQUI = pathlib.Path(__file__).parent
SAIDA = AQUI.parent.parent / "dados" / "bancos_balancos.json"
INICIO = 201703  # 10 anos de painel; 2016 fica só para os cálculos de 12 meses
BANCOS = ["Banco do Brasil", "Bradesco", "Itaú", "Santander"]  # ordem alfabética = ordem fixa das cores

# chave, nome, unidade ("%", "x" ou "bi"), grupo, o que é, como ler
INDICADORES = [
    ("roe_12m", "ROE", "%", "Rentabilidade", "Lucro dos últimos 12 meses dividido pelo patrimônio líquido médio: quanto o banco ganha para cada R$ 100 dos acionistas.", "Quanto maior, mais rentável. Acima do custo de capital (perto de 15% no Brasil) o banco cria valor."),
    ("roa_12m", "ROA", "%", "Rentabilidade", "Lucro de 12 meses dividido pelo ativo total médio: quanto o banco ganha sobre tudo o que tem.", "Bancos ganham pouco por real de ativo (1% a 2%) e compensam com alavancagem."),
    ("lucro_12m_bi", "Lucro líquido em 12 meses", "bi", "Rentabilidade", "Soma do lucro contábil dos últimos 4 trimestres, em R$ bilhões.", "É o lucro do balanço oficial, não o 'recorrente' do release; os dois ficam perto, mas não são iguais."),
    ("pdd_12m_bi", "PDD em 12 meses", "bi", "Crédito e PDD", "Provisão para devedores duvidosos: o que o banco reservou nos últimos 12 meses para perdas esperadas com calote.", "Sobe antes da inadimplência aparecer por completo. Uma PDD que cresce mais que a carteira indica piora do crédito."),
    ("pdd_sobre_margem_12m", "PDD sobre a margem financeira", "%", "Crédito e PDD", "Quanto da margem financeira (o que o banco ganha com juros) foi consumido pela PDD em 12 meses.", "Quanto maior, menos sobra da margem para pagar despesas e virar lucro."),
    ("custo_credito_12m", "Custo do crédito", "%", "Crédito e PDD", "PDD de 12 meses dividida pela carteira de crédito média.", "É a 'taxa de perda' que o banco espera. Precisa caber no spread que ele cobra."),
    ("provisao_sobre_carteira", "Provisão acumulada / carteira", "%", "Crédito e PDD", "Saldo de provisão que fica no balanço dividido pela carteira bruta: o colchão já guardado para perdas.", "Mais alto pode ser prudência ou carteira mais arriscada; compare com o custo do crédito."),
    ("carteira_credito_bi", "Carteira de crédito", "bi", "Crédito e PDD", "Total de empréstimos e financiamentos (carteira classificada), em R$ bilhões.", "É o principal ativo gerador de receita do banco."),
    ("crescimento_carteira_12m", "Crescimento da carteira em 12 meses", "%", "Crédito e PDD", "Variação da carteira de crédito contra o mesmo trimestre do ano anterior.", "Crescer muito acima da economia pede atenção à PDD dos trimestres seguintes."),
    ("ativo_total_bi", "Ativo total", "bi", "Balanço", "Tudo o que o banco tem: caixa, títulos, crédito e outros ativos, em R$ bilhões.", "Mede o tamanho do banco."),
    ("patrimonio_liquido_bi", "Patrimônio líquido", "bi", "Balanço", "Capital dos acionistas: ativo menos tudo o que o banco deve.", "É a base que absorve perdas e a referência do ROE."),
    ("alavancagem_x", "Alavancagem (ativo / PL)", "x", "Balanço", "Quantas vezes o ativo é maior que o patrimônio líquido.", "Bancos operam alavancados (10x a 15x). Mais alavancagem aumenta o retorno e o risco."),
    ("credito_sobre_ativo", "Crédito sobre o ativo", "%", "Balanço", "Parte do ativo que está emprestada a clientes.", "O resto fica em títulos e liquidez. Mais crédito costuma dar mais margem e mais risco."),
    ("credito_sobre_depositos", "Crédito sobre depósitos", "%", "Balanço", "Carteira de crédito dividida pelos depósitos de clientes.", "Acima de 100%, o banco precisa de outras fontes (letras, emissões, repasses) para financiar o crédito."),
    ("depositos_bi", "Depósitos", "bi", "Balanço", "Depósitos à vista, de poupança, a prazo e outros, em R$ bilhões.", "É a captação mais estável e, em geral, a mais barata."),
    ("tvm_bi", "Títulos e derivativos", "bi", "Balanço", "Títulos e valores mobiliários (como títulos públicos) e derivativos, em R$ bilhões.", "Parte da liquidez e da tesouraria do banco."),
    ("margem_sobre_ativo_12m", "Margem financeira sobre o ativo", "%", "Margem e receitas", "Resultado de intermediação antes da PDD em 12 meses, dividido pelo ativo médio.", "Mostra quanto o banco ganha com juros sobre o seu tamanho. No IF.data inclui efeitos de hedge, então compare tendências, não décimos."),
    ("cobertura_tarifas_12m", "Tarifas e serviços / despesas", "%", "Margem e receitas", "Receitas de tarifas e serviços divididas pelas despesas de pessoal e administrativas, em 12 meses.", "Quanto das despesas do dia a dia é pago por receitas que não dependem de juros."),
    ("basileia", "Índice de Basileia", "%", "Capital", "Capital regulatório dividido pelos ativos ponderados pelo risco (conglomerado prudencial).", "O mínimo regulatório com adicionais fica perto de 10,5% a 11,5%; folga acima disso é espaço para crescer."),
    ("capital_principal", "Capital principal", "%", "Capital", "A parte de melhor qualidade do capital (basicamente patrimônio) sobre os ativos ponderados pelo risco.", "É o indicador de capital que o mercado mais olha."),
    ("razao_alavancagem", "Razão de alavancagem", "%", "Capital", "Capital nível I dividido pela exposição total, sem ponderar risco.", "Mínimo regulatório de 3%; complementa a Basileia."),
]

# Números divulgados pelos bancos para o 3T26 (gerenciais/recorrentes), enquanto o IF.data não traz setembro
RELEASES_3T26 = {
    "Bradesco": {"data": "out/2026", "lucro_recorrente_bi": 7.109, "roae": 0.161, "inadimplencia_90d": 0.046,
                 "nota": "Lucro recorrente +14,6% em 12 meses."},
    "Santander": {"data": "28/10/2026", "lucro_recorrente_bi": 2.885, "roae": 0.119, "inadimplencia_90d": 0.034,
                  "nota": "Lucro recorrente −28% em 12 meses."},
    "Itaú": None, "Banco do Brasil": None,
}
CLIENTES = [
    ("clientes_mi", "Clientes", "mi", "Clientes", "Pessoas e empresas com relacionamento no conglomerado, pelo Cadastro de Clientes do Sistema Financeiro (CCS), em milhões.", "É contado do mesmo jeito para todos os bancos pelo Banco Central; pode diferir do número que o banco divulga."),
    ("crescimento_clientes_12m", "Crescimento de clientes em 12 meses", "%", "Clientes", "Variação do número de clientes contra o mesmo trimestre do ano anterior.", "Mostra quem está ganhando ou perdendo base de clientes."),
    ("lucro_por_cliente", "Lucro por cliente", "R$", "Clientes", "Lucro líquido de 12 meses dividido pelo número de clientes, em reais por ano.", "Quanto cada cliente rende, em média. Bases com mais clientes de alta renda tendem a ter valores maiores."),
    ("carteira_por_cliente", "Crédito por cliente", "R$", "Clientes", "Carteira de crédito dividida pelo número de clientes, em reais.", "Quanto o banco empresta por cliente, em média."),
    ("indice_reclamacoes", "Índice de reclamações", "n1", "Clientes", "Reclamações procedentes registradas no Banco Central para cada milhão de clientes, no trimestre.", "Quanto menor, melhor. A metodologia do Banco Central mudou no 2T24 (marcado no gráfico): compare cada período com ele mesmo."),
    ("agencias", "Agências", "n", "Rede", "Número de agências do conglomerado, pelo cadastro do Banco Central.", "A queda acompanha a digitalização do atendimento."),
    ("postos", "Postos de atendimento", "n", "Rede", "Postos de atendimento, unidades menores que uma agência, pelo cadastro do Banco Central.", "Alguns bancos trocam agências por postos e correspondentes."),
    ("clientes_por_agencia", "Clientes por agência", "n", "Rede", "Número de clientes dividido pelo número de agências.", "Quanto maior, menos o banco depende da rede física para atender."),
]
ACOES = [
    ("retorno_total", "Retorno total da ação (base 100)", "idx", "Ações", "Evolução da ação principal com os dividendos reinvestidos, começando em 100 no 1T17.", "Compara o que o acionista ganhou em cada banco no período. Ações: BBAS3, BBDC4, ITUB4 e SANB11."),
    ("dividend_yield_12m", "Dividend yield em 12 meses", "%", "Ações", "Dividendos e juros sobre capital pagos nos últimos 12 meses, divididos pelo preço da ação no fim do trimestre.", "Quanto o acionista recebeu em dinheiro sobre o preço da ação."),
    ("pl", "P/L (preço sobre lucro)", "x", "Ações", "Valor de mercado dividido pelo lucro líquido de 12 meses.", "Quantos anos de lucro o mercado está pagando. Mais alto indica mais expectativa de crescimento ou menos risco percebido."),
    ("pvp", "P/VP (preço sobre valor patrimonial)", "x", "Ações", "Valor de mercado dividido pelo patrimônio líquido.", "Acima de 1, o mercado paga mais que o patrimônio contábil; costuma andar junto com o ROE."),
    ("payout_12m", "Payout em 12 meses", "%", "Ações", "Parte do lucro de 12 meses que foi paga aos acionistas.", "Mais alto devolve mais dinheiro; mais baixo guarda capital para crescer."),
    ("valor_mercado_bi", "Valor de mercado", "bi", "Ações", "Preço de cada classe de ação vezes o número de ações (sem as em tesouraria), em R$ bilhões.", "Quanto o mercado diz que o banco vale."),
]
MARCOS = [{"trimestre": 202003, "rotulo": "Pandemia"}, {"trimestre": 202503, "rotulo": "Novo padrão contábil", "aba": "balanco"},
          {"trimestre": 202406, "rotulo": "Nova metodologia", "indicador": "indice_reclamacoes"}]
# Visão "ano atual, trimestre a trimestre" (aba Balanço): fluxos só do trimestre; taxas anualizadas (trimestre x 4)
ANO = [
    ("lucro_liquido_bi", "Lucro líquido do trimestre", "bi", "Resultado do trimestre", "Lucro contábil só dos 3 meses do trimestre, em R$ bilhões.", "Compare com o mesmo trimestre do ano anterior para tirar o efeito de sazonalidade."),
    ("roe", "ROE do trimestre (anualizado)", "%", "Resultado do trimestre", "Lucro do trimestre vezes 4, dividido pelo patrimônio líquido médio.", "Mostra o ritmo de rentabilidade do trimestre; oscila mais que o ROE de 12 meses."),
    ("margem_financeira_bi", "Margem financeira do trimestre", "bi", "Resultado do trimestre", "Resultado de intermediação financeira antes da PDD, só do trimestre, em R$ bilhões.", "É a principal receita do banco. No IF.data inclui efeitos de hedge, que podem mexer bastante num trimestre só."),
    ("servicos_tarifas_bi", "Tarifas e serviços do trimestre", "bi", "Resultado do trimestre", "Receitas de tarifas e de prestação de serviços do trimestre, em R$ bilhões.", "Receita que não depende de juros; costuma ser mais estável."),
    ("despesas_pessoal_adm_bi", "Despesas de pessoal e administrativas", "bi", "Resultado do trimestre", "Despesas com pessoal e despesas administrativas do trimestre, em R$ bilhões.", "O custo de funcionamento do banco."),
    ("pdd_bi", "PDD do trimestre", "bi", "Crédito e PDD", "O que o banco reservou no trimestre para perdas esperadas com calote, em R$ bilhões.", "Subidas fortes num trimestre costumam antecipar piora do crédito ou casos específicos."),
    ("pdd_sobre_margem", "PDD sobre a margem do trimestre", "%", "Crédito e PDD", "Quanto da margem financeira do trimestre foi consumido pela PDD.", "Quanto maior, menos sobra da margem para virar lucro."),
    ("custo_credito", "Custo do crédito do trimestre (anualizado)", "%", "Crédito e PDD", "PDD do trimestre vezes 4, dividida pela carteira média.", "A taxa de perda esperada no ritmo do trimestre."),
    ("provisao_sobre_carteira", "Provisão acumulada / carteira", "%", "Crédito e PDD", "Saldo de provisão no balanço dividido pela carteira bruta, no fim do trimestre.", "O colchão já guardado para perdas."),
    ("carteira_credito_bi", "Carteira de crédito", "bi", "Balanço no fim do trimestre", "Total de empréstimos e financiamentos no fim do trimestre, em R$ bilhões.", "Veja quanto cresceu de um trimestre para o outro."),
    ("ativo_total_bi", "Ativo total", "bi", "Balanço no fim do trimestre", "Tudo o que o banco tem no fim do trimestre, em R$ bilhões.", "O tamanho do banco."),
    ("patrimonio_liquido_bi", "Patrimônio líquido", "bi", "Balanço no fim do trimestre", "Capital dos acionistas no fim do trimestre, em R$ bilhões.", "A base que absorve perdas."),
    ("depositos_bi", "Depósitos", "bi", "Balanço no fim do trimestre", "Depósitos de clientes no fim do trimestre, em R$ bilhões.", "A captação mais estável."),
    ("alavancagem_x", "Alavancagem (ativo / PL)", "x", "Balanço no fim do trimestre", "Quantas vezes o ativo é maior que o patrimônio.", "Mais alavancagem aumenta retorno e risco."),
    ("basileia", "Índice de Basileia", "%", "Capital", "Capital regulatório sobre ativos ponderados pelo risco, no fim do trimestre.", "Folga acima do mínimo é espaço para crescer."),
    ("capital_principal", "Capital principal", "%", "Capital", "Capital de melhor qualidade sobre os ativos ponderados pelo risco.", "O indicador de capital que o mercado mais olha."),
]
ABAS = [("balanco", "Balanço"), ("clientes", "Clientes e rede"), ("acoes", "Ações")]
CLASSES = {"Banco do Brasil": ["BBAS3"], "Bradesco": ["BBDC3", "BBDC4"], "Itaú": ["ITUB3", "ITUB4"], "Santander": ["SANB3", "SANB4"]}
PRINCIPAL = {"Banco do Brasil": "BBAS3", "Bradesco": "BBDC4", "Itaú": "ITUB4", "Santander": "SANB11"}


def le(nome):
    arq = AQUI / nome
    if not arq.exists():
        return []
    with open(arq, encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def tri_de(data):  # "2026-06-30" -> 202606
    a, m = int(data[:4]), int(data[5:7])
    return a * 100 + ((m - 1) // 3 + 1) * 3


def extras(trimestres, base):
    """Séries das abas Clientes e rede e Ações. base = indicadores de balanço por (banco, trimestre)."""
    num = lambda v: float(v) if v not in (None, "", "None") else None
    cli = {(r["banco"], int(r["trimestre"])): r for r in le("clientes.csv")}
    ag = {(r["banco"], int(r["trimestre"])): r for r in le("agencias.csv")}
    # número de ações mais recente de cada classe (CVM); o preço do Yahoo já vem ajustado por desdobramentos
    # e bonificações, então preço da época x ações de hoje dá o valor de mercado da época (sem contar recompras)
    acoes = {}
    for r in sorted(le("cvm_acoes.csv"), key=lambda r: r["data"]):
        acoes[r["banco"]] = (float(r["acoes_on"]), float(r["acoes_pn"]))
    precos = {}
    for r in le("yahoo_precos.csv"):
        if num(r["fechamento"]) and num(r["ajustado"]):
            precos.setdefault(r["ticker"], []).append((r["data"], float(r["fechamento"]), float(r["ajustado"])))
    fim = {tk: {} for tk in precos}
    for tk, ps in precos.items():
        for p in sorted(ps):
            fim[tk][tri_de(p[0])] = p  # último mês do trimestre fica por último
    # proventos oficiais da B3, por ação da classe principal (a unit SANB11 = 1 ON + 1 PN)
    classe_principal = {"Banco do Brasil": ("ON",), "Bradesco": ("PN",), "Itaú": ("PN",), "Santander": ("ON", "PN")}
    divs = {}
    for r in le("b3_proventos.csv"):
        if r["classe"] in classe_principal[r["banco"]]:
            divs.setdefault(r["banco"], []).append((r["data_com"], float(r["valor"])))
    fech_b3 = {(r["ticker"], int(r["trimestre"])): float(r["fechamento"]) for r in le("b3_fechamentos.csv")}
    out = {}
    for b in BANCOS:
        s = {k: [] for k in [c[0] for c in CLIENTES + ACOES]}
        tp = PRINCIPAL[b]
        p0 = fim.get(tp, {}).get(INICIO)
        for t in trimestres:
            c, a, bal = cli.get((b, t)), ag.get((b, t)), base.get((b, t), {})
            cl = num(c["clientes"]) if c else None
            cl_ano = num(cli[(b, t - 100)]["clientes"]) if (b, t - 100) in cli else None
            luc, cart, pl_ = num(bal.get("lucro_12m_bi")), num(bal.get("carteira_credito_bi")), num(bal.get("patrimonio_liquido_bi"))
            agn = num(a["agencias"]) if a else None
            s["clientes_mi"].append(cl / 1e6 if cl else None)
            s["crescimento_clientes_12m"].append(cl / cl_ano - 1 if cl and cl_ano else None)
            s["lucro_por_cliente"].append(luc * 1e9 / cl if luc is not None and cl else None)
            s["carteira_por_cliente"].append(cart * 1e9 / cl if cart is not None and cl else None)
            s["indice_reclamacoes"].append(num(c["indice_reclamacoes"]) if c else None)
            s["agencias"].append(agn)
            s["postos"].append(num(a["postos"]) if a else None)
            s["clientes_por_agencia"].append(cl / agn if cl and agn else None)
            pt = fim.get(tp, {}).get(t)
            s["retorno_total"].append(pt[2] / p0[2] * 100 if pt and p0 else None)
            dy, preco = None, fech_b3.get((tp, t))
            if preco and b in divs:
                ano, mes = t // 100, t % 100
                ini, fim_ = f"{ano - 1}-{mes:02d}-99", f"{ano}-{mes:02d}-99"
                dy = sum(v for d_, v in divs[b] if ini < d_ <= fim_) / preco
            s["dividend_yield_12m"].append(dy)
            vm = None
            if b in acoes:
                on, pn = acoes[b]
                cl_on, *cl_pn = CLASSES[b]
                p_on, p_pn = fim.get(cl_on, {}).get(t), (fim.get(cl_pn[0], {}).get(t) if cl_pn else None)
                if p_on and (not cl_pn or p_pn):
                    vm = (on * p_on[1] + (pn * p_pn[1] if cl_pn else 0)) / 1e9
            s["valor_mercado_bi"].append(vm)
            s["pl"].append(vm / luc if vm and luc and luc > 0 else None)
            s["pvp"].append(vm / pl_ if vm and pl_ else None)
            s["payout_12m"].append(dy * vm / luc if dy is not None and vm and luc and luc > 0 else None)
        out[b] = s
    return out


def main():
    with open(AQUI / "bancos_indicadores.csv", encoding="utf-8") as fh:
        linhas = [l for l in csv.DictReader(fh) if int(l["trimestre"]) >= INICIO]
    chaves = [i[0] for i in INDICADORES]
    base = {(l["banco"], int(l["trimestre"])): l for l in linhas}
    trimestres = sorted({int(l["trimestre"]) for l in linhas})
    series = {b: {k: [] for k in chaves} for b in BANCOS}
    idx = {(l["banco"], int(l["trimestre"])): l for l in linhas}
    for b in BANCOS:
        for t in trimestres:
            l = idx.get((b, t), {})
            for k in chaves:
                v = l.get(k)
                series[b][k].append(round(float(v), 5) if v not in (None, "") else None)
    extra = extras(trimestres, base)
    for b in BANCOS:
        series[b].update({k: [round(v, 5) if v is not None else None for v in vs] for k, vs in extra[b].items()})
    campos = ("k", "nome", "un", "grupo", "oque", "ler")
    for b in BANCOS:  # séries trimestrais que ainda não estão no painel de 10 anos
        for k in [a[0] for a in ANO]:
            if k not in series[b]:
                series[b][k] = [round(float(idx[(b, t)][k]), 5) if (b, t) in idx and idx[(b, t)].get(k) not in (None, "") else None for t in trimestres]
    lista = [dict(zip(campos, i), aba="ano") for i in ANO] + [dict(zip(campos, i), aba="balanco") for i in INDICADORES] + \
        [dict(zip(campos, i), aba="clientes") for i in CLIENTES] + [dict(zip(campos, i), aba="acoes") for i in ACOES]
    out = {
        "fonte": "IF.data (Banco Central do Brasil): conglomerado financeiro; capital no conglomerado prudencial",
        "gerado_em": datetime.date.today().isoformat(),
        "trimestres": [f"{t % 100 // 3}T{str(t // 100)[2:]}" for t in trimestres],
        "bancos": BANCOS,
        "abas": [{"k": k, "nome": n} for k, n in ABAS], "indicadores": lista,
        "fontes": {"balanco": "IF.data (Banco Central do Brasil): conglomerado financeiro; capital no conglomerado prudencial",
                   "clientes": "Banco Central: Ranking de reclamações (clientes do CCS e índice de reclamações) e cadastro do IF.data (agências e postos)",
                   "acoes": "B3 (cotações e proventos), CVM (número de ações), IF.data (lucro e patrimônio) e Yahoo Finance (preço ajustado para o retorno total; fonte não oficial)"},
        "series": series, "releases_3t26": RELEASES_3T26, "marcos": [
            {**m, "i": trimestres.index(m["trimestre"])} for m in MARCOS if m["trimestre"] in trimestres],
    }
    SAIDA.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(SAIDA, SAIDA.stat().st_size // 1024, "KB,", len(trimestres), "trimestres")


if __name__ == "__main__":
    main()
