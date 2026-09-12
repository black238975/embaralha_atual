# Prova Shuffle

Crie do ZERO um sistema web completo chamado "EmbaralhaProvas".



IMPORTANTE:

Não quero apenas uma interface bonita ou uma demonstração.

Quero um sistema FUNCIONAL, pronto para uso real, com login, banco de dados, armazenamento de PDFs, processamento de PDFs, geração das versões, download, ZIP e organização das provas.



Antes de considerar o projeto concluído, teste TODAS as funções descritas abaixo e corrija todos os erros encontrados.



==================================================

1. OBJETIVO DO SISTEMA

==================================================



O sistema será utilizado por professores para enviar uma prova em PDF e gerar várias versões embaralhadas dessa mesma prova.



Fluxo obrigatório:



UPLOAD

↓

GERAÇÃO

↓

RESULTADOS

↓

MINHAS PROVAS



O PDF original NÃO deve ficar permanentemente na área Upload.



As versões geradas NÃO devem permanecer permanentemente na área Resultados.



A única área permanente para armazenamento das provas deve ser "Minhas Provas".



==================================================

2. LOGIN E CONTA

==================================================



Criar sistema completo de autenticação:



- Criar conta

- Entrar

- Sair

- Esqueci minha senha

- Recuperação de senha

- Alterar senha

- Manter sessão do usuário



Cada usuário deve enxergar somente suas próprias provas.



Um usuário NÃO pode acessar provas de outro usuário.



Utilizar Supabase para autenticação, banco de dados e armazenamento.



==================================================

3. DESIGN

==================================================



Interface moderna, profissional e responsiva.



Tema escuro como padrão.



O sistema deve funcionar perfeitamente em:



- celular

- tablet

- computador



No celular utilizar menu inferior ou menu responsivo.



Criar navegação:



- Dashboard

- Upload

- Gerar

- Resultados

- Minhas Provas

- Minha Conta

- Sair



Nome do sistema:



"EmbaralhaProvas"



Visual profissional voltado para professores.



==================================================

4. ÁREA UPLOAD

==================================================



Criar uma área exclusiva para envio do PDF original.



Permitir:



- selecionar PDF

- arrastar PDF

- visualizar nome do arquivo

- visualizar tamanho

- remover o PDF antes da geração

- enviar PDF



Depois que o PDF for enviado, mostrar claramente:



"PDF enviado com sucesso"



E mostrar o botão:



"Gerar versões"



IMPORTANTE:



O upload deve funcionar como uma área TEMPORÁRIA.



O PDF enviado NÃO deve permanecer ocupando a área Upload depois que o processo de geração terminar.



Fluxo:



1. Usuário envia PDF.

2. PDF fica disponível temporariamente.

3. Usuário escolhe a quantidade de versões.

4. Usuário clica em "Gerar versões".

5. O sistema processa o PDF.

6. As versões são criadas.

7. O PDF temporário é removido da área Upload.

8. A área Upload volta a ficar VAZIA e pronta para receber outro PDF.



Depois de gerar uma prova, o professor deve poder imediatamente enviar outro PDF sem precisar apagar manualmente o anterior.



==================================================

5. QUANTIDADE DE VERSÕES

==================================================



Permitir gerar de 1 até 10 versões.



Exemplo:



Quantidade de versões:



[ 1 ]

[ 2 ]

[ 3 ]

...

[ 10 ]



O máximo permitido é 10.



Nunca permitir mais de 10 versões.



Exemplo:



Versão A

Versão B

Versão C

Versão D

Versão E

Versão F

Versão G

Versão H

Versão I

Versão J



==================================================

6. INFORMAÇÕES DA PROVA

==================================================



Antes de gerar, permitir informar:



- Nome da prova

- Série

- Turma



Exemplos de séries/turmas:



2º Ano A

2º Ano B

2º Ano C

3º Ano A

3º Ano B

5º Ano A

9º Ano C



O professor pode criar provas para diferentes séries e turmas.



Essas informações devem ficar associadas à prova.



==================================================

7. ORGANIZAÇÃO EM "MINHAS PROVAS"

==================================================



"Minhas Provas" será o armazenamento PERMANENTE.



Toda prova processada deve ficar salva nessa área.



Organizar as provas por:



SÉRIE / TURMA



Exemplo:



2º Ano

  ├── 2º Ano A

  │   ├── Prova de Matemática

  │   └── Avaliação 1

  │

  ├── 2º Ano B

  │   └── Prova de Matemática

  │

  └── 2º Ano C

      └── Avaliação 2



3º Ano

  ├── 3º Ano A

  └── 3º Ano B



Também permitir pesquisar provas.



Cada prova deve mostrar:



- nome da prova

- série

- turma

- data

- quantidade de versões

- versões disponíveis



Ao abrir uma prova, mostrar todas as versões geradas.



==================================================

8. REGRA DE ARMAZENAMENTO

==================================================



IMPORTANTE.



Existem três estados diferentes:



UPLOAD:

TEMPORÁRIO.



RESULTADOS:

TEMPORÁRIO.



MINHAS PROVAS:

PERMANENTE.



Portanto:



PDF enviado → fica temporariamente no Upload.



PDF processado → gera versões.



Versões geradas → aparecem em Resultados.



Depois que a geração terminar, a prova deve ser registrada em Minhas Provas.



Resultados NÃO devem ser utilizados como armazenamento permanente.



O sistema pode limpar os resultados temporários depois que o usuário sair da página, iniciar uma nova geração ou concluir o salvamento.



A prova permanente deve continuar disponível em "Minhas Provas".



Se o usuário fechar o navegador e voltar depois, suas provas continuam em "Minhas Provas".



==================================================

9. ÁREA RESULTADOS

==================================================



A área Resultados deve mostrar somente as versões da geração atual/recente.



Não transformar Resultados em um arquivo permanente.



Depois da geração, mostrar:



"Versões geradas com sucesso!"



E listar:



Versão A

Versão B

Versão C

...



Cada versão deve ter:



- Visualizar

- Baixar

- Imprimir



Também criar:



"Baixar todas em ZIP"



O botão deve gerar um arquivo ZIP contendo todas as versões da prova.



Exemplo:



Prova_Matematica_Versao_A.pdf

Prova_Matematica_Versao_B.pdf

Prova_Matematica_Versao_C.pdf

...



E então:



Prova_Matematica.zip



==================================================

10. MINHAS PROVAS

==================================================



A área Minhas Provas é permanente.



Criar uma interface organizada.



Exemplo:



MINHAS PROVAS



🔎 Pesquisar



2º Ano

  2º Ano A

  2º Ano B

  2º Ano C



3º Ano

  3º Ano A

  3º Ano B



Ao clicar em uma turma, mostrar as provas daquela turma.



Cada prova deve permitir:



- Visualizar

- Abrir versões

- Baixar versão

- Baixar todas em ZIP

- Imprimir

- Excluir prova



Criar confirmação antes de excluir.



Exemplo:



"Tem certeza que deseja excluir esta prova?"



[Cancelar]

[Excluir]



==================================================

11. EXCLUIR TODAS AS VERSÕES

==================================================



Deve existir uma opção para excluir TODAS as versões de uma prova.



Exemplo:



"Excluir todas as versões"



Ao clicar:



"Tem certeza que deseja excluir todas as versões desta prova?"



[Cancelar]

[Excluir todas]



Isso NÃO deve excluir necessariamente a organização da turma.



A exclusão deve remover os arquivos e registros das versões correspondentes.



==================================================

12. EMBARALHAMENTO DAS QUESTÕES

==================================================



Essa é uma das partes MAIS IMPORTANTES.



O sistema deve detectar automaticamente as questões do PDF.



Exemplos de numeração:



1.

2.

3.

4.



Também reconhecer:



01.

02.

03.



E também reconhecer:



(1)

(2)

(3)



E:



(01)

(02)

(03)



Também reconhecer variações como:



1)

1 -

1:

Questão 1

QUESTÃO 1

(1)



Não depender exclusivamente de um único formato.



==================================================

13. REGRA FUNDAMENTAL DA NUMERAÇÃO

==================================================



Quando as questões forem embaralhadas, o número da questão deve acompanhar a POSIÇÃO NOVA.



NÃO manter o número original.



Exemplo original:



1) Questão sobre matemática

2) Questão sobre português

3) Questão sobre ciências

...

10) Questão sobre história



Se depois do embaralhamento a questão original 1 for para a posição 10:



Ela DEVE aparecer como:



10) Questão sobre matemática



E NÃO:



1) Questão sobre matemática



Outro exemplo:



Questão original 19 foi para a posição 1.



Então deve aparecer:



1) texto da antiga questão 19



O número "19" deve ser substituído por "1".



Outro exemplo:



Questão original 1 foi para a posição 10.



Resultado:



10) texto da questão original 1.



Isso deve funcionar para todos os formatos:



1.

1)

(1)

01.

(01)



A numeração exibida na versão final deve ser sequencial:



1

2

3

4

5

...



independentemente da numeração original.



==================================================

14. PRESERVAR O CONTEÚDO DA QUESTÃO

==================================================



Quando uma questão for movimentada:



- enunciado

- imagem

- gráfico

- tabela

- desenho

- fórmula

- alternativas

- qualquer conteúdo pertencente à questão



deve permanecer junto.



NUNCA separar imagem de uma questão e colocar em outra.



Exemplo:



Questão 19 possui uma imagem.



Se a questão 19 virar questão 1:



A imagem dela também deve ir para a posição 1.



==================================================

15. QUESTÕES DE MÚLTIPLA ESCOLHA

==================================================



Quando a questão possuir alternativas, também embaralhar as alternativas.



Exemplo original:



1) Qual é a capital do Brasil?



a) Rio de Janeiro

b) Brasília

c) São Paulo

d) Recife



Versão A:



1) Qual é a capital do Brasil?



a) Rio de Janeiro

b) Brasília

c) São Paulo

d) Recife



Versão B:



1) Qual é a capital do Brasil?



a) Brasília

b) Recife

c) Rio de Janeiro

d) São Paulo



Versão C:



1) Qual é a capital do Brasil?



a) São Paulo

b) Rio de Janeiro

c) Recife

d) Brasília



As alternativas devem realmente mudar de posição.



==================================================

16. RENOMEAR AS LETRAS DAS ALTERNATIVAS

==================================================



Depois de embaralhar as alternativas, as letras também devem ser refeitas.



Exemplo:



Original:



a) Pedro

b) João



Depois do embaralhamento:



a) João

b) Pedro



NUNCA deixar:



b) João

a) Pedro



A posição nova determina a letra.



Portanto:



primeira alternativa = a)

segunda alternativa = b)

terceira alternativa = c)

quarta alternativa = d)

quinta alternativa = e)



==================================================

17. DIFERENTES TIPOS DE QUESTÃO

==================================================



O sistema deve suportar:



- múltipla escolha

- questões abertas

- verdadeiro ou falso

- complete

- associação

- questões com imagens

- questões com tabelas

- questões com gráficos

- questões com fórmulas

- questões com alternativas

- questões sem alternativas



Não destruir o layout de nenhum desses tipos.



==================================================

18. QUESTÕES V OU F

==================================================



Reconhecer questões de Verdadeiro ou Falso.



Preservar todos os itens pertencentes à questão.



Se houver:



( ) Verdadeiro

( ) Falso



ou:



V

F



ou outras estruturas semelhantes, preservar o conteúdo.



Se houver mais de uma afirmação dentro da mesma questão, todas devem permanecer juntas.



==================================================

19. QUESTÕES ABERTAS

==================================================



Questões abertas devem ser tratadas como uma unidade.



Preservar:



- enunciado

- linhas para resposta

- imagens

- gráficos

- tabelas

- espaços



Não misturar partes de uma questão aberta com outra.



==================================================

20. IMAGENS

==================================================



Esse é um requisito crítico.



Toda imagem deve permanecer vinculada à questão correta.



Exemplo:



Questão 5 possui imagem X.



Se a questão 5 virar questão 12:



A imagem X deve continuar na questão 12.



Nunca:



Questão 12 com imagem da questão 5 e texto de outra questão.



==================================================

21. CABEÇALHO

==================================================



Preservar o cabeçalho original da prova.



Exemplo:



Nome da escola

Professor

Disciplina

Aluno

Data

Turma

etc.



O cabeçalho NÃO deve ser embaralhado.



As questões devem ser embaralhadas abaixo do cabeçalho.



==================================================

22. FORMATAÇÃO DO PDF

==================================================



O PDF final deve manter o máximo possível da aparência original:



- fontes

- imagens

- espaçamento

- alinhamento

- tabelas

- gráficos

- desenhos

- fórmulas

- cabeçalho



Não criar uma versão final apenas como texto simples.



O resultado precisa estar pronto para imprimir.



==================================================

23. VISUALIZAÇÃO

==================================================



O botão "Visualizar" deve realmente abrir a prova.



Criar visualizador de PDF funcional.



Permitir:



- página anterior

- próxima página

- zoom

- ajustar à tela

- fechar visualização



Não mostrar apenas um botão que não abre nada.



==================================================

24. IMPRESSÃO

==================================================



O botão "Imprimir" deve abrir diretamente a função de impressão do navegador/sistema.



Não criar uma tela intermediária desnecessária.



O PDF deve estar preparado para impressão.



==================================================

25. DOWNLOAD

==================================================



Cada versão deve possuir botão:



"Baixar PDF"



O arquivo deve ser baixado corretamente.



Exemplo:



Prova_Matematica_Versao_A.pdf



==================================================

26. DOWNLOAD DE TODAS AS VERSÕES

==================================================



Criar botão:



"Baixar todas as versões"



Esse botão deve criar um ZIP.



Exemplo:



Prova_Matematica.zip



Dentro:



Prova_Matematica_Versao_A.pdf

Prova_Matematica_Versao_B.pdf

Prova_Matematica_Versao_C.pdf

...

até a quantidade selecionada.



Se forem 10 versões, o ZIP terá 10 PDFs.



==================================================

27. GERAÇÃO

==================================================



Depois do upload, o usuário deve clicar em:



"Gerar versões"



Não gerar automaticamente antes do clique.



Durante a geração mostrar:



"Analisando PDF..."



"Identificando questões..."



"Embaralhando questões..."



"Embaralhando alternativas..."



"Gerando PDFs..."



"Salvando prova..."



"Concluído!"



Usar barra de progresso ou indicador visual.



Não permitir que o usuário clique várias vezes e gere duplicado.



==================================================

28. CORREÇÃO MANUAL

==================================================



Criar uma opção para corrigir manualmente a análise quando o sistema não conseguir identificar corretamente uma questão.



Exemplo:



"Revisar questões"



Mostrar as questões identificadas.



Permitir ao usuário ajustar:



- início da questão

- fim da questão

- número da questão

- alternativas

- associação de imagens/conteúdo



A correção manual deve ser simples e visual.



IMPORTANTE:

Não obrigar o usuário a corrigir manualmente quando o sistema conseguir identificar tudo corretamente.



==================================================

29. NÃO EXISTE GABARITO

==================================================



NÃO criar:



- gabarito

- página de respostas

- botão de gabarito

- arquivo de gabarito

- área de gabarito



O sistema é exclusivamente para gerar versões embaralhadas das provas.



==================================================

30. SEGURANÇA

==================================================



Cada usuário só pode acessar suas próprias informações.



Utilizar Row Level Security no Supabase.



Os arquivos armazenados devem ser vinculados ao usuário.



Não permitir acesso público indevido aos PDFs.



Validar:



- tipo de arquivo

- tamanho

- usuário autenticado

- permissões



==================================================

31. BANCO DE DADOS

==================================================



Criar estrutura adequada no Supabase.



Sugestão:



profiles

provas

versoes

arquivos



Relacionamentos:



usuário

↓

provas

↓

versões



Cada prova deve possuir:



- id

- user_id

- nome

- série

- turma

- data

- status

- quantidade_de_versoes

- created_at



Cada versão:



- id

- prova_id

- nome

- número

- arquivo

- created_at



==================================================

32. STORAGE

==================================================



Organizar os arquivos por usuário.



Exemplo:



/usuarios/{user_id}/provas/{prova_id}/



Dentro:



/versoes/



O arquivo original enviado deve ser temporário.



Depois da geração, remover o arquivo temporário do Upload.



As versões finais devem ser armazenadas de forma permanente em Minhas Provas.



==================================================

33. NOVO UPLOAD

==================================================



Depois que uma geração terminar:



A área Upload deve voltar automaticamente para:



"Nenhum PDF selecionado"



e:



"Selecione ou arraste um PDF"



O usuário deve poder imediatamente enviar outro PDF.



Não deixar o PDF anterior preso na tela.



Exemplo:



Upload 1

↓

Gerar

↓

Finalizado

↓

Upload LIMPO

↓

Upload 2



==================================================

34. RESULTADOS TEMPORÁRIOS

==================================================



Depois que as versões forem geradas, mostrar os resultados.



Porém, Resultados NÃO deve funcionar como armazenamento permanente.



As versões devem ser associadas à prova permanente em Minhas Provas.



Quando o usuário acessar Minhas Provas posteriormente, deverá encontrar a prova e suas versões.



==================================================

35. EXCLUSÃO

==================================================



Criar:



"Excluir prova"



e:



"Excluir todas as versões"



Sempre pedir confirmação.



Nunca excluir acidentalmente.



Após exclusão, atualizar a interface automaticamente.



==================================================

36. DASHBOARD

==================================================



Criar Dashboard com:



- quantidade de provas

- quantidade de versões geradas

- provas recentes

- botão "Nova prova"

- botão "Minhas provas"



Exemplo:



Olá, Professor!



Suas provas

12



Versões geradas

48



[ + Nova prova ]



[ Ver minhas provas ]



==================================================

37. RESPONSIVIDADE

==================================================



No celular:



- menu responsivo

- botões grandes

- cards adaptados

- visualizador funcionando

- upload funcionando

- download funcionando

- ZIP funcionando

- navegação fácil



No computador:



- layout completo

- menu lateral ou superior

- área de trabalho ampla



==================================================

38. TRATAMENTO DE ERROS

==================================================



Criar mensagens claras.



Exemplos:



"Este arquivo não é um PDF."



"Não foi possível identificar as questões."



"Não foi possível gerar a versão."



"Erro ao salvar a prova."



"Erro ao baixar o arquivo."



"Erro ao criar o ZIP."



Nunca deixar o sistema travado sem explicação.



==================================================

39. DETECÇÃO DE QUESTÕES

==================================================



A análise do PDF deve ser robusta.



Não assumir somente:



1.

2.

3.



Reconhecer:



1.

1)

1-

1:

01.

01)

(1)

(01)

Questão 1

QUESTÃO 1

Questão 01

QUESTÃO 01



Reconhecer espaços e pequenas diferenças de formatação.



A numeração pode estar em diferentes posições do PDF.



Não confundir números que aparecem dentro do enunciado com início de nova questão.



Exemplo:



"Um aluno possui 20 reais..."



Esse "20" NÃO pode ser interpretado como questão 20.



==================================================

40. EMBARALHAMENTO

==================================================



Cada versão deve possuir uma ordem diferente sempre que possível.



Exemplo original:



1

2

3

4

5



Versão A:



3

1

5

2

4



Mas na versão final os números devem ser:



1

2

3

4

5



Ou seja:



A questão original 3 que foi para a posição 1 passa a ser chamada de questão 1.



A questão original 1 que foi para a posição 2 passa a ser chamada de questão 2.



E assim por diante.



==================================================

41. EVITAR REPETIÇÃO

==================================================



Ao gerar várias versões, tentar produzir ordens diferentes.



Não gerar 10 versões exatamente iguais.



Quando houver alternativas, também variar as alternativas.



==================================================

42. EXEMPLO COMPLETO

==================================================



PDF ORIGINAL:



1) Qual é a capital do Brasil?



a) Rio de Janeiro

b) Brasília

c) Recife



2) Resolva:



2 + 2 = ______



3) Observe a imagem e responda.



[IMAGEM 3]



4) Marque V ou F.



( ) A água é líquida.

( ) O fogo é frio.



GERAR VERSÃO B:



1) Observe a imagem e responda.



[IMAGEM 3]



2) Marque V ou F.



( ) A água é líquida.

( ) O fogo é frio.



3) Qual é a capital do Brasil?



a) Recife

b) Brasília

c) Rio de Janeiro



4) Resolva:



2 + 2 = ______



Observe que:



- a antiga questão 3 virou 1

- a antiga questão 4 virou 2

- a antiga questão 1 virou 3

- a antiga questão 2 virou 4



E as alternativas da questão de múltipla escolha também foram embaralhadas.



==================================================

43. O QUE NÃO PODE ACONTECER

==================================================



NUNCA:



- misturar imagem de uma questão com outra

- apagar alternativas

- perder tabelas

- perder gráficos

- perder fórmulas

- manter o número original depois do embaralhamento

- criar gabarito

- deixar PDF preso no Upload

- deixar resultados como armazenamento permanente

- impedir novo upload depois da geração

- permitir mais de 10 versões

- criar versões vazias

- criar PDFs corrompidos

- gerar ZIP vazio

- permitir usuário acessar provas de outro usuário



==================================================

44. TESTES OBRIGATÓRIOS

==================================================



Antes de finalizar o projeto, faça testes reais de todas as funções.



TESTE 1:

Criar conta.



TESTE 2:

Login.



TESTE 3:

Logout.



TESTE 4:

Recuperação de senha.



TESTE 5:

Enviar PDF.



TESTE 6:

Gerar 1 versão.



TESTE 7:

Gerar 5 versões.



TESTE 8:

Gerar 10 versões.



TESTE 9:

Tentar gerar 11 versões e confirmar que o sistema bloqueia.



TESTE 10:

PDF com questões numeradas 1., 2., 3.



TESTE 11:

PDF com questões numeradas (1), (2), (3).



TESTE 12:

PDF com questões 01, 02, 03.



TESTE 13:

Embaralhamento das questões.



TESTE 14:

Verificar se o número muda de acordo com a nova posição.



TESTE 15:

Verificar questão com imagem.



TESTE 16:

Verificar questão de múltipla escolha.



TESTE 17:

Verificar embaralhamento das alternativas.



TESTE 18:

Verificar renumeração das alternativas a), b), c), d), e).



TESTE 19:

Verificar questão aberta.



TESTE 20:

Verificar V ou F.



TESTE 21:

Visualizar PDF.



TESTE 22:

Baixar PDF.



TESTE 23:

Imprimir PDF.



TESTE 24:

Baixar todas as versões em ZIP.



TESTE 25:

Abrir ZIP e verificar todos os PDFs.



TESTE 26:

Enviar segundo PDF depois da geração.



Confirmar que o Upload está limpo.



TESTE 27:

Fechar o navegador e entrar novamente.



Confirmar que a prova continua em Minhas Provas.



TESTE 28:

Verificar organização por série/turma.



TESTE 29:

Excluir todas as versões.



TESTE 30:

Excluir uma prova.



TESTE 31:

Confirmar que um usuário não consegue acessar provas de outro usuário.



==================================================

45. TESTE COM PDF REAL

==================================================



Não testar apenas com dados fictícios.



Utilizar pelo menos um PDF real contendo:



- questões numeradas

- imagens

- múltipla escolha

- questões abertas

- V/F

- diferentes formatos de numeração



Verificar visualmente o PDF final.



Comparar:



PDF original

versão gerada



Garantir que o conteúdo das questões permaneça correto.



==================================================

46. CRITÉRIO FINAL DE ENTREGA

==================================================



Só considerar o projeto concluído quando:



✓ Login funcionando

✓ Cadastro funcionando

✓ Recuperação de senha funcionando

✓ Upload funcionando

✓ Upload temporário funcionando

✓ Upload limpando após geração

✓ Geração funcionando

✓ Até 10 versões

✓ Questões embaralhadas

✓ Numeração refeita conforme nova posição

✓ Numeração entre parênteses reconhecida

✓ Alternativas embaralhadas

✓ Letras das alternativas refeitas

✓ Imagens permanecendo com suas questões

✓ Questões abertas funcionando

✓ V/F funcionando

✓ Cabeçalho preservado

✓ Visualização funcionando

✓ Download funcionando

✓ Impressão funcionando

✓ ZIP funcionando

✓ Resultados temporários

✓ Minhas Provas permanentes

✓ Organização por série/turma

✓ Exclusão de versões funcionando

✓ Exclusão de provas funcionando

✓ Segurança funcionando

✓ Responsividade funcionando

✓ Nenhum gabarito

✓ Nenhum erro crítico



IMPORTANTE:



Não pare depois de criar a interface.



Implemente a lógica real, banco de dados, armazenamento, processamento dos PDFs e geração das versões.



Depois de implementar, execute os testes.



Se encontrar erros, corrija-os.



Faça uma revisão final de todo o fluxo:



UPLOAD → GERAÇÃO → RESULTADOS → MINHAS PROVAS



E só então considere o sistema pronto.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f9d5ad0f-44bc-449c-8fcf-dfd27e73ba71).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
