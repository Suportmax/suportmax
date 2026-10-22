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

Markup padrão inicial: 40% sobre o custo. Fórmula: `custo × (1 + markup/100)`. O markup pode ser alterado no modal de importação e fica salvo junto às preferências da conta.

Quando há referências online, o CRM usa a mediana dos preços encontrados como sugestão, mas nunca abaixo do custo acrescido do markup. Ao atualizar um produto existente, preserva o preço atual se ele já for maior que a sugestão. O usuário pode revisar os preços e as fontes antes de concluir a importação.

Os preços online são referências de anúncios; confirme se o modelo, estado, frete, taxas e condições comerciais correspondem ao produto que será vendido.
