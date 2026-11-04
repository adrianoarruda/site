"""Transforma a tabela longa do IF.data em séries trimestrais comparáveis e indicadores de balanço.

Cuidados:
- Em 2025 mudou o padrão contábil dos bancos (Resolução CMN 4.966): os nomes e a composição de algumas linhas
  mudaram. Cada linha canônica abaixo tem uma regra para cada época.
- No IF.data a Demonstração de Resultado é acumulada no semestre: o 2º e o 4º trimestres trazem 6 meses.
  O valor do trimestre sai por diferença (2T = 1S − 1T; 4T = 2S − 3T).
Saída: bancos_trimestral.csv (uma linha por banco e trimestre).
"""
import csv, pathlib, re, sys
from collections import defaultdict

AQUI = pathlib.Path(__file__).parent
ENTRADA, SAIDA = AQUI / "ifdata_longo.csv", AQUI / "bancos_trimestral.csv"

# (nome canônico, relatório, regex da época antiga (até 2024), regex da época nova (desde 2025))
ESTOQUES = [
    ("ativo_total", "Resumo", r"^Ativo Total$", r"^Ativo Total$"),
    ("carteira_credito", "Resumo", r"^Carteira de Crédito Classificada$", r"^Carteira de Crédito$"),
    ("captacoes", "Resumo", r"^Captações$", r"^Captações$"),
    ("patrimonio_liquido", "Resumo", r"^Patrimônio Líquido$", r"^Patrimônio Líquido$"),
    ("disponibilidades", "Ativo", r"^Disponibilidades \(a\)", r"^Disponibilidades \(a\)"),
    ("aplic_interfinanceiras", "Ativo", r"^Aplicações Interfinanceiras de Liquidez \(b\)", r"^Aplicações Interfinanceiras de Liquidez \(b\)"),
    ("tvm", "Ativo", r"^TVM e Instrumentos Financeiros Derivativos \(c\)", None),  # nova época: Resumo + derivativos
    ("credito_bruto", "Ativo", r"^Operações de Crédito \(d1\)", r"^Valor Contábil Bruto \(e1\)"),
    ("provisao_credito", "Ativo", r"^Provisão sobre Operações de Crédito \(d2\)", r"^Perda Esperada \(e2\)"),
    ("depositos", "Passivo", r"^Depósito Total \(a\)", r"^Depósitos \(a\)"),
    ("dep_vista", "Passivo", r"^Depósitos à Vista", r"^Depósitos à Vista"),
    ("dep_poupanca", "Passivo", r"^Depósitos de Poupança", r"^Depósitos de Poupança"),
    ("dep_prazo", "Passivo", r"^Depósitos a Prazo", r"^Depósitos a Prazo"),
    ("compromissadas", "Passivo", r"^Obrigações por Operações Compromissadas", r"^Obrigações por Operações Compromissadas"),
    ("emissoes", "Passivo", r"^Recursos de Aceites e Emissão de Títulos \(c\)", r"^Outros Instrumentos de Dívida \(c\)"),
    ("emprestimos_repasses", "Passivo", r"^Obrigações por Empréstimos e Repasses", r"^Obrigações por Empréstimos e Repasses"),
    # Capital (conglomerado prudencial; índices em fração)
    ("basileia", "Informações de Capital", r"^Índice de Basileia", r"^Índice de Basileia"),
    ("capital_principal", "Informações de Capital", r"^Índice de Capital Principal", r"^Índice de Capital Principal"),
    ("capital_nivel1", "Informações de Capital", r"^Índice de Capital Nível I", r"^Índice de Capital Nível I"),
    ("razao_alavancagem", "Informações de Capital", r"^Razão de Alavancagem", r"^Razão de Alavancagem"),
    ("rwa", "Informações de Capital", r"^Ativos Ponderados pelo Risco", r"^Ativos Ponderados pelo Risco"),
]
FLUXOS = [
    ("lucro_liquido", "Resumo", r"^Lucro Líquido$", r"^Lucro Líquido$"),
    ("receita_credito", "Demonstração de Resultado", r"^Rendas de Operações de Crédito \(a1\)", r"^Rendas de Operações de Crédito \(c\)"),
    ("despesa_captacao", "Demonstração de Resultado", r"^Despesas de Captação \(b1\)", r"^Despesas de Captações \(g\)"),
    ("pdd", "Demonstração de Resultado", r"^Resultado de Provisão para Créditos de Difícil Liquidação", r"^Resultado com Perda Esperada \(f\)"),
    ("resultado_intermediacao", "Demonstração de Resultado", r"^Resultado de Intermediação Financeira \(c\)", r"^Resultado de Intermediação Financeira \(k\)"),
    ("servicos", "Demonstração de Resultado", r"^Rendas de Prestação de Serviços \(d1\)", r"^Outras Rendas de Prestação de Serviços \(n\)"),
    ("tarifas", "Demonstração de Resultado", r"^Rendas de Tarifas Bancárias \(d2\)", r"^Rendas de Tarifas Bancárias \(m\)"),
    ("transacoes_pagamento", "Demonstração de Resultado", None, r"^Resultado com Transações de Pagamento \(l\)"),
    ("despesa_pessoal", "Demonstração de Resultado", r"^Despesas de Pessoal \(d3\)", r"^Despesas de Pessoal \(o\)"),
    ("despesa_administrativa", "Demonstração de Resultado", r"^Despesas Administrativas \(d4\)", r"^Despesas Administrativas \(p\)"),
    ("despesa_tributaria", "Demonstração de Resultado", r"^Despesas Tributárias \(d5\)", r"^Despesas Tributárias \(r\)"),
    ("resultado_antes_ir", "Demonstração de Resultado", r"^Resultado antes da Tributação, Lucro e Participação \(g\)", r"^Resultado antes da Tributação e Participações \(w\)"),
    ("ir_csll", "Demonstração de Resultado", r"^Imposto de Renda e Contribuição Social", r"^Imposto de Renda e Contribuição Social"),
]


def carrega():
    bruto = defaultdict(dict)  # (banco, trimestre) -> {(relatorio, coluna): valor}
    with open(ENTRADA, encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            bruto[(r["banco"], int(r["trimestre"]))][(r["relatorio"], r["coluna"])] = float(r["valor"])
    return bruto


# Quando a linha do Resumo não vem num trimestre, usa a mesma informação de outro relatório
ALTERNATIVAS = {
    "ativo_total": [("Ativo", r"^Ativo Total \(k\)"), ("Passivo", r"^Passivo Total \(k\)")],
    "patrimonio_liquido": [("Passivo", r"^Patrimônio Líquido \(j\)")],
    "captacoes": [("Passivo", r"^Captações \(e\)")],
    "lucro_liquido": [("Demonstração de Resultado", r"^Lucro Líquido \(j\)"), ("Demonstração de Resultado", r"^Lucro Líquido")],
}


def pega(linhas, rel, regex, nome=None):
    tentativas = ([(rel, regex)] if regex else []) + ALTERNATIVAS.get(nome, [])
    for r_, rx in tentativas:
        achados = [v for (rr, c), v in linhas.items() if rr == r_ and re.search(rx, c)]
        if achados:
            return achados[0]
    return None


def trimestral(ac, dt, nome):
    """DRE do IF.data vem acumulada no semestre; devolve só os 3 meses do trimestre."""
    v = ac.get((dt, nome))
    if v is None:
        return None
    if dt % 100 in (6, 12):
        anterior = ac.get((dt - 3, nome))
        return None if anterior is None else v - anterior
    return v


def main():
    bruto = carrega()
    bancos = sorted({b for b, _ in bruto})
    saida = []
    for banco in bancos:
        dts = sorted(dt for b, dt in bruto if b == banco)
        est, ac = {}, {}
        for dt in dts:
            linhas, nova = bruto[(banco, dt)], dt >= 202503
            for nome, rel, antigo, novo in ESTOQUES:
                est[(dt, nome)] = pega(linhas, rel, novo if nova else antigo, nome)
            if nova:  # TVM na nova época: títulos (Resumo) + derivativos (Ativo)
                t, d = pega(linhas, "Resumo", r"^Títulos e Valores Mobiliários$"), pega(linhas, "Ativo", r"^Instrumentos Derivativos \(d\)")
                est[(dt, "tvm")] = (t or 0) + (d or 0) if t is not None else None
            for nome, rel, antigo, novo in FLUXOS:
                ac[(dt, nome)] = pega(linhas, rel, novo if nova else antigo, nome)
        for dt in dts:
            linha = {"banco": banco, "trimestre": dt, "epoca_contabil": "Res. 4.966 (desde 2025)" if dt >= 202503 else "Cosif anterior"}
            for nome, *_ in ESTOQUES:
                linha[nome] = est.get((dt, nome))
            for nome, *_ in FLUXOS:
                linha[nome] = trimestral(ac, dt, nome)
            saida.append(linha)
    campos = list(saida[0].keys())
    with open(SAIDA, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=campos); w.writeheader(); w.writerows(saida)
    falta = [(l["banco"], l["trimestre"], k) for l in saida for k in campos if l[k] is None]
    print(len(saida), "linhas;", len(falta), "valores faltando")
    for f in falta[:40]:
        print("  falta", f)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
