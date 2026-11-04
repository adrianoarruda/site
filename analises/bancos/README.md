# Balanços dos grandes bancos

Código da análise publicada em https://www.adrianoarruda.com/blog/ (Itaú, Bradesco, Santander e Banco do Brasil, de 2017 em diante).

Ordem para rodar (Python 3, só biblioteca padrão):

1. `coleta_ifdata.py` — balanço, resultado e capital no IF.data (Banco Central).
2. `transforma.py` — linhas comparáveis entre as duas épocas contábeis (antes e depois da Resolução CMN 4.966, de 2025) e resultado do trimestre (o IF.data acumula no semestre).
3. `indicadores.py` — ROE, PDD sobre margem, custo do crédito, alavancagem, Basileia e os demais, inclusive em 12 meses.
4. `coleta_extra.py` — clientes e reclamações (ranking do Banco Central), agências (IF.data), ações (CVM), cotações e proventos (B3) e preço ajustado (Yahoo Finance, não oficial).
5. `gera_json.py` — grava `dados/bancos_balancos.json`, que o painel do blog lê.

Os arquivos baixados ficam em `brutos/` e as tabelas intermediárias em `.csv` (fora do git).
