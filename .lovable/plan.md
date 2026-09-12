# Painel administrativo interno

## Objetivo
Uma área `/admin` dentro do próprio app, acessível apenas por você (henriquesilva238975@gmail.com), para:
- bloquear a geração de versões por um período definido por você;
- bloquear/desbloquear usuários individualmente;
- excluir usuários e todos os dados deles.

## Segurança do acesso
A senha enviada no chat não será gravada em código (isso permitiria a qualquer pessoa ler o valor no navegador). O acesso funciona assim:
- você entra normalmente pela tela de login com esse e-mail e essa senha (a conta é criada/atualizada no backend com essa senha);
- o e-mail recebe o papel `admin` na tabela de papéis;
- `/admin` e todas as funções administrativas verificam o papel `admin` no servidor, não só na tela.

## 1. Banco de dados (migração)
- `public.app_role` (enum: `admin`, `user`) e `public.user_roles` (usuário + papel), com GRANTs e RLS.
- Função segura `public.has_role(_user_id, _role)`.
- `public.app_settings` (chave/valor) para o bloqueio global de geração:
  - `geracao_bloqueada_ate` — data/hora até quando a geração fica bloqueada.
- Coluna `bloqueado_ate` (e `bloqueado` boolean) em `profiles` para bloqueio por usuário.
- Políticas: admins podem ler/editar todos os `profiles`, `user_roles` e `app_settings`; cada usuário continua vendo só os próprios dados.
- Concessão do papel `admin` ao usuário com o e-mail acima (se ainda não existir a conta, o papel é aplicado assim que ela for criada, via gatilho de cadastro).

## 2. Funções de servidor (protegidas)
Em `src/lib/admin.functions.ts`, todas com `requireSupabaseAuth` + verificação de `has_role(..., 'admin')` antes de qualquer operação privilegiada:
- `listarUsuarios()` — nome, e-mail, data de cadastro, nº de provas/versões, situação de bloqueio.
- `bloquearUsuario({ userId, ate | null })` — bloqueia até a data ou remove o bloqueio.
- `excluirUsuario({ userId })` — apaga arquivos do storage → `versoes` → `provas` → `profiles` → conta de autenticação.
- `buscarConfiguracoes()` / `salvarBloqueioGeracao({ ate | null })`.
- `situacaoDoUsuario()` — usada pelo app para saber se a geração está bloqueada (global ou por usuário) e até quando.

## 3. Tela `/admin`
Rota protegida sob o layout autenticado, com verificação de papel; quem não é admin é levado ao dashboard.

Duas abas:
- **Usuários** — tabela com nome, e-mail, cadastro, provas/versões, situação; ações: bloquear até uma data, desbloquear, excluir (com confirmação destrutiva).
- **Configurações** — seletor de data/hora para bloquear a geração de versões para todos, com botão de desbloqueio imediato e aviso do estado atual.

## 4. Aplicação do bloqueio
- Na tela `/gerar`: se houver bloqueio (global ou do usuário), o botão de gerar fica desabilitado com a mensagem "Geração bloqueada até DD/MM/AAAA às HH:MM".
- A mesma verificação roda no servidor ao registrar a prova/versões, para que o bloqueio não possa ser burlado pela interface.
- Usuário bloqueado também não consegue gerar nem enviar novos DOCX.

## 5. Menu
Item "Admin" no menu lateral/superior/inferior, visível apenas para quem tem o papel `admin`.

## Notas técnicas
- `supabaseAdmin` só é carregado dentro dos handlers, após a checagem de papel.
- Exclusão segue a ordem storage → versões → provas → perfil → conta.
- O painel é construído isoladamente (rota + funções próprias) e só depois ligado ao menu e à tela de geração.

## Resultado esperado
Você entra com seu e-mail, acessa `/admin`, controla quem usa o sistema e liga/desliga a geração de versões com data de desbloqueio — sem precisar de painel externo.
