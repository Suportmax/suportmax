# Consulta de preços na importação de NF-e

O CRM usa o Google Shopping via SerpApi para buscar referências. A chave fica como segredo no Supabase e não deve ser colocada no HTML.

## Preparar o serviço

1. Crie uma conta na SerpApi e copie a chave de API. O plano gratuito listado atualmente inclui 250 buscas por mês; cada produto consultado usa uma busca. Confira o plano e o saldo antes de importar notas grandes.
2. No Supabase, abra **Edge Functions → Secrets** e crie `SERPAPI_API_KEY` com a chave. Não publique essa chave no GitHub nem no CRM.
3. Instale/autentique a Supabase CLI e, na raiz deste repositório, execute:

```powershell
supabase login
supabase functions deploy precos-produtos --project-ref rjjduwtjrncjyqexdbqz
```

O endpoint exige sessão autenticada e perfil `admin` em `crm_members`. O CRM faz no máximo 20 pesquisas por nota; os outros itens recebem apenas o cálculo pelo markup.

## Regra aplicada

Markup padrão: 65% sobre o custo. O custo importado soma o valor unitário da NF-e ao frete, seguro e outras despesas rateadas pela quantidade, descontando abatimentos. Despesas variáveis sobre venda (como taxas) podem ser informadas no modal; o padrão é 0%. Fórmula do preço mínimo: `custo total × (1 + markup/100) ÷ (1 - despesas sobre venda/100)`. Markup e despesas variáveis ficam salvos nas preferências da conta. Contas que ainda tinham o padrão anterior de 40% passam a mostrar 65%; outros percentuais salvos são mantidos.

Quando há referências online, o CRM usa a mediana dos preços encontrados como sugestão, mas nunca abaixo do preço mínimo calculado com custo, markup e despesas variáveis. Ao atualizar um produto existente, preserva o preço atual se ele já for maior que a sugestão. O usuário pode revisar os preços e as fontes antes de concluir a importação.

Os preços online são referências de anúncios; confirme se o modelo, estado, frete, taxas e condições comerciais correspondem ao produto que será vendido.
