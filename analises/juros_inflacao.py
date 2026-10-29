"""Selic x IPCA: juro real no Brasil nos últimos 10 anos.

Busca as séries públicas do Banco Central (SGS), calcula o juro real
(Selic acumulada em 12 meses descontada do IPCA em 12 meses) e grava um
JSON em public/data/ que o site lê.

Uso (dentro de site-pessoal/):
    analises\\.venv\\Scripts\\python analises\\juros_inflacao.py
"""

import json
import time
from datetime import date
from pathlib import Path

import pandas as pd
import requests

SGS_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados"
SELIC_MENSAL = 4390  # Selic acumulada no mês, % a.m.
IPCA_MENSAL = 433  # IPCA, variação % no mês

SAIDA = Path(__file__).resolve().parent.parent / "dados" / "juros_inflacao.json"


def baixar_serie(codigo: int, inicio: str) -> pd.Series:
    # A API do Banco Central às vezes demora: até 3 tentativas, com espera crescente
    for tentativa in range(3):
        try:
            resp = requests.get(
                SGS_URL.format(codigo=codigo),
                params={"formato": "json", "dataInicial": inicio},
                timeout=120,
            )
            resp.raise_for_status()
            break
        except requests.RequestException:
            if tentativa == 2:
                raise
            time.sleep(15 * (tentativa + 1))
    df = pd.DataFrame(resp.json())
    df["data"] = pd.to_datetime(df["data"], format="%d/%m/%Y")
    df["valor"] = pd.to_numeric(df["valor"])
    return df.set_index("data")["valor"]


def acumulado_12m(serie_mensal: pd.Series) -> pd.Series:
    """Compõe 12 meses de taxas mensais (%) em uma taxa anual (%)."""
    fator = (1 + serie_mensal / 100).rolling(12).apply(lambda x: x.prod(), raw=True)
    return (fator - 1) * 100


def main() -> None:
    inicio = date(date.today().year - 11, 1, 1).strftime("%d/%m/%Y")
    selic = acumulado_12m(baixar_serie(SELIC_MENSAL, inicio))
    ipca = acumulado_12m(baixar_serie(IPCA_MENSAL, inicio))

    df = pd.DataFrame({"selic": selic, "ipca": ipca}).dropna()
    df["juro_real"] = ((1 + df["selic"] / 100) / (1 + df["ipca"] / 100) - 1) * 100
    df = df.tail(120).round(2)

    ultimo = df.iloc[-1]
    resultado = {
        "fonte": "Banco Central do Brasil (SGS 4390: Selic) e IBGE (IPCA, publicado no SGS 433)",
        "atualizado_em": date.today().isoformat(),
        "ultimo_mes": df.index[-1].strftime("%Y-%m"),
        "resumo": {
            "selic_12m": ultimo["selic"],
            "ipca_12m": ultimo["ipca"],
            "juro_real_12m": ultimo["juro_real"],
            "juro_real_medio_10a": round(df["juro_real"].mean(), 2),
            "meses_juro_real_negativo": int((df["juro_real"] < 0).sum()),
        },
        "serie": [
            {"mes": idx.strftime("%Y-%m"), **linha.to_dict()}
            for idx, linha in df.iterrows()
        ],
    }

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: {len(df)} meses gravados em {SAIDA}")
    print(json.dumps(resultado["resumo"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
