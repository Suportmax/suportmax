# Configuração do CRM

O CRM usa Supabase para autenticação e armazenamento. O site no GitHub Pages não autentica usuários nem protege dados por conta própria; as políticas de segurança no banco Supabase fazem essa proteção.

## Preparar o Supabase

1. Crie um projeto no [Supabase](https://supabase.com/).
2. No painel do projeto, abra **SQL Editor**, cole e execute **todo** o conteúdo atualizado de `crm-schema.sql`. Isso cria as tabelas, a função `public.is_crm_member()` e as políticas de segurança, e solicita a atualização do cache da API. Se a função já existir, executar o script novamente é seguro.
3. Em **Authentication > Providers**, mantenha o provedor de e-mail habilitado.
4. Desabilite o cadastro público (sign-ups). Crie cada conta autorizada em **Authentication > Users** e defina uma senha forte para ela. Não use uma senha compartilhada entre várias pessoas.
5. Para cada conta, copie o UUID do usuário em **Authentication > Users** e autorize-o na tabela do CRM pelo **SQL Editor**:

   ```sql
   insert into public.crm_members (user_id)
   values ('UUID_DO_USUARIO');
   ```

   Só contas listadas em `crm_members` acessam os dados, mesmo que outra conta consiga autenticar no projeto. Para remover o acesso, exclua o UUID dessa tabela.
6. Em **Project Settings > API**, copie a **Project URL** e a chave pública **anon** (ou **publishable key**).
7. Em `crm.html`, substitua `COLE_A_URL_DO_PROJETO` e `COLE_A_CHAVE_PUBLICA_ANON` pelos valores copiados.
8. Publique `crm.html`, `crm-schema.sql` e `marca.png` junto com os demais arquivos do site.

A chave pública pode ficar no código do site porque o acesso aos dados é restringido por Row Level Security (RLS), pelas políticas instaladas pelo SQL e pela lista de membros autorizados. **Nunca coloque no site a chave `service_role` ou qualquer segredo do Supabase.**

As contas autorizadas têm as mesmas permissões no CRM: podem consultar e alterar todos os clientes, registrar interações e excluir clientes (o histórico do cliente também é excluído). O histórico não pode ser alterado ou apagado pela interface.

Se o CRM informar que `public.is_crm_member` não foi encontrada, execute novamente todo o arquivo atualizado `crm-schema.sql` no SQL Editor. Depois, aguarde alguns segundos e recarregue `crm.html`.

## Testar

Abra `crm.html` pelo endereço publicado no GitHub Pages, entre com uma conta criada no Supabase e teste cadastro, edição, busca, exclusão e histórico. Se uma operação falhar, a página mostra a mensagem retornada pelo Supabase.
