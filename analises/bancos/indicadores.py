"""Calcula os indicadores de balanço a partir de bancos_trimestral.csv e grava bancos_indicadores.csv.

Convenções: fluxos (lucro, PDD, receitas, despesas) são do trimestre; quando o indicador é "ao ano",
o trimestre é multiplicado por 4. Bases de balanço usam a média do saldo atual com o do trimestre anterior.
A PDD vem negativa no IF.data (é despesa); aqui ela aparece positiva, como "quanto foi reservado".
"""
import csv, pathlib, sys

AQUI = pathlib.Path(__file__).parent
ENTRADA, SAIDA = AQUI / "bancos_trimestral.csv", AQUI / "bancos_indicadores.csv"


def num(v):
    return float(v) if v not in ("", None) else None


def div(a, b):
    return a / b if a is not None and b not in (None, 0) else None


def main():
    with open(ENTRADA, encoding="utf-8") as fh:
        linhas = list(csv.DictReader(fh))
    por_banco = {}
    for l in linhas:
        d = {k: (num(v) if k not in ("banco", "trimestre", "epoca_contabil") else v) for k, v in l.items()}
        d["trimestre"] = int(d["trimestre"])
        por_banco.setdefault(d["banco"], []).append(d)
    saida = []
    for banco, serie in por_banco.items():
        serie.sort(key=lambda d: d["trimestre"])
        for i, d in enumerate(serie):
            ant = serie[i - 1] if i > 0 else None
            ano = serie[i - 4] if i >= 4 else None
            media = lambda k: (d[k] + ant[k]) / 2 if ant and d.get(k) is not None and ant.get(k) is not None else d.get(k)
            pdd = -d["pdd"] if d.get("pdd") is not None else None
            mf_antes_pdd = d["resultado_intermediacao"] - d["pdd"] if None not in (d.get("resultado_intermediacao"), d.get("pdd")) else None
            servicos = sum(x for x in (d.get("servicos"), d.get("tarifas"), d.get("transacoes_pagamento")) if x is not None)
            despesas = -(d["despesa_pessoal"] + d["despesa_administrativa"]) if None not in (d.get("despesa_pessoal"), d.get("despesa_administrativa")) else None
            saida.append({
                "banco": banco, "trimestre": d["trimestre"], "epoca_contabil": d["epoca_contabil"],
                # tamanho (R$ bilhões)
                "ativo_total_bi": div(d["ativo_total"], 1e9), "carteira_credito_bi": div(d["carteira_credito"], 1e9),
                "patrimonio_liquido_bi": div(d["patrimonio_liquido"], 1e9), "depositos_bi": div(d["depositos"], 1e9),
                "captacoes_bi": div(d["captacoes"], 1e9), "tvm_bi": div(d["tvm"], 1e9),
                "liquidez_bi": div((d["disponibilidades"] or 0) + (d["aplic_interfinanceiras"] or 0), 1e9),
                # resultado do trimestre (R$ bilhões)
                "lucro_liquido_bi": div(d["lucro_liquido"], 1e9), "pdd_bi": div(pdd, 1e9),
                "margem_financeira_bi": div(mf_antes_pdd, 1e9), "servicos_tarifas_bi": div(servicos, 1e9),
                "despesas_pessoal_adm_bi": div(despesas, 1e9),
                # indicadores (em %)
                "roe": div(d["lucro_liquido"] * 4, media("patrimonio_liquido")) if d.get("lucro_liquido") is not None else None,
                "roa": div(d["lucro_liquido"] * 4, media("ativo_total")) if d.get("lucro_liquido") is not None else None,
                "alavancagem_x": div(d["ativo_total"], d["patrimonio_liquido"]),
                "credito_sobre_ativo": div(d["carteira_credito"], d["ativo_total"]),
                "credito_sobre_depositos": div(d["carteira_credito"], d["depositos"]),
                "margem_sobre_ativo": div(mf_antes_pdd * 4, media("ativo_total")) if mf_antes_pdd is not None else None,
                "custo_credito": div(pdd * 4, media("carteira_credito")) if pdd is not None else None,
                "pdd_sobre_margem": div(pdd, mf_antes_pdd),
                "provisao_sobre_carteira": div(-d["provisao_credito"] if d.get("provisao_credito") is not None else None, d["credito_bruto"]),
                "eficiencia": div(despesas, (mf_antes_pdd or 0) + servicos) if despesas is not None else None,
                "cobertura_tarifas": div(servicos, despesas),
                "crescimento_carteira_12m": div(d["carteira_credito"], ano["carteira_credito"]) - 1 if ano and ano.get("carteira_credito") else None,
                "basileia": d.get("basileia"), "capital_principal": d.get("capital_principal"),
                "razao_alavancagem": d.get("razao_alavancagem"),
            })
    # Versões em 12 meses (soma dos últimos 4 trimestres): suavizam os efeitos contábeis de um trimestre só,
    # como o hedge cambial de investimentos no exterior, que mexe na margem e volta no imposto.
    por = {}
    for l in saida:
        por.setdefault(l["banco"], []).append(l)
    for serie in por.values():
        for i, l in enumerate(serie):
            ult = serie[i - 3:i + 1] if i >= 3 else []
            soma = lambda k: sum(x[k] for x in ult) if len(ult) == 4 and all(x[k] is not None for x in ult) else None
            luc, pdd, mf, srv, dsp = (soma(k) for k in ("lucro_liquido_bi", "pdd_bi", "margem_financeira_bi", "servicos_tarifas_bi", "despesas_pessoal_adm_bi"))
            med = lambda k: sum(x[k] for x in serie[i - 4:i + 1]) / 5 if i >= 4 and all(x[k] is not None for x in serie[i - 4:i + 1]) else None
            l.update({"lucro_12m_bi": luc, "pdd_12m_bi": pdd, "margem_12m_bi": mf,
                      "roe_12m": div(luc, med("patrimonio_liquido_bi")), "roa_12m": div(luc, med("ativo_total_bi")),
                      "custo_credito_12m": div(pdd, med("carteira_credito_bi")), "pdd_sobre_margem_12m": div(pdd, mf),
                      "margem_sobre_ativo_12m": div(mf, med("ativo_total_bi")),
                      "eficiencia_12m": div(dsp, (mf or 0) + (srv or 0)) if dsp is not None and mf is not None else None,
                      "cobertura_tarifas_12m": div(srv, dsp)})
    with open(SAIDA, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(saida[0].keys())); w.writeheader(); w.writerows(saida)
    print(len(saida), "linhas em", SAIDA.name)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
