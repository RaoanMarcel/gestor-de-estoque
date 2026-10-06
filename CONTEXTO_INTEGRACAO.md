Guia Técnico de Arquitetura e Integração: Módulo WMS no Core JU.KO
Este documento estabelece as diretrizes técnicas, arquiteturais e operacionais para incorporar as funcionalidades do sistema WMS como um submódulo nativo dentro do sistema pai JU.KO.

1. Diretrizes de Comportamento e Blindagem para o Agente AI (Claude Code)
Protocolo de Validação Obrigatória
Questionamento Prévio: Antes de executar qualquer refatoração, modificação de arquivos ou adição de rotas, o assistente deve obrigatoriamente questionar a estrutura existente do JU.KO e aguardar a validação dos pontos ambíguos.

Proibição de Suposições: Não assumir nomes de tabelas, chaves de armazenamento local (localStorage), middlewares de autenticação ou nomenclaturas de cargos sem validação prévia com o desenvolvedor.

Preservação do Core: O sistema JU.KO é soberano. Nenhuma alteração no WMS pode sobrescrever ou alterar comportamentos globais do JU.KO (como Sidebars, Headers globais, Temas ou Provedores de Autenticação).

Regras de Blindagem contra Erros
Auditoria de Dependências: Verificar se bibliotecas utilitárias (como exceljs, socket.io-client, react-hot-toast) utilizadas no WMS já existem no JU.KO para evitar duplicidade ou conflito de versões.

Isolamento de Tipagem: Garantir que as interfaces TypeScript do WMS sejam exportadas a partir de um módulo dedicado (ex: @/modules/wms/types), sem poluir o namespace global do sistema pai.

Zero Código Nativo de Alerta: Bloquear estritamente qualquer chamada a window.confirm, window.alert ou window.prompt. Toda interação deve ser roteada pelo sistema de confirmação assíncrono do ToastProvider.

2. Especificação da Arquitetura de Integração
A) Base de Dados e Persistência (Prisma ORM)
Conexão Multitenant: As tabelas do WMS (Pallet, ProdutoPallet, HistoricoMovimentacao, Contador) devem ser integradas ao schema do JU.KO, adicionando a chave estrangeira do identificador de empresa em cada entidade principal.

Auditoria de Operações: A tabela de histórico deve receber a referência direta do identificador de usuário do JU.KO, permitindo rastrear qual operador executou cada movimentação de estoque.

Migração de Dados: A alteração do banco deve prever uma estratégia de migração onde os dados legados do WMS sejam vinculados a uma empresa padrão inicial sem perda de registros.

B) Frontend, Layout e Navegação (React)
Desmantelamento de Encapsuladores: Remover o arquivo de entrada principal do WMS, o componente de layout próprio e o gerenciador de rotas protegidas.

Herança de UI: O WMS deve funcionar exclusivamente dentro do container de rotas filhas do JU.KO, herdando a Sidebar, o Header e o mecanismo de controle de acesso por cargo (Roles/Permissions).

Migração do ToastProvider: O provedor de notificações e o modal de confirmação assíncrono centralizado devem ser movidos para a raiz da árvore de componentes do JU.KO, permitindo seu uso por qualquer outro módulo do sistema pai.

C) Backend, APIs e Comunicação em Tempo Real (Node.js/Express/Socket.io)
Namespacing de Rotas HTTP: Todas as rotas de backend do WMS devem receber um prefixo uniforme (ex: /api/wms/...) para evitar colisões com endpoints de outros módulos do JU.KO.

Mecanismo de Autenticação: Substituir os validadores de token do WMS pelo middleware central de autenticação do JU.KO, extraindo o identificador do usuário e da empresa diretamente do payload do token unificado.

Isolamento de Canais Sockets: Os eventos de WebSockets (como atualizações de malha e alertas de movimentação) devem utilizar canais restritos ou salas (rooms) identificadas pela empresa do usuário logado.

3. Checklist de Questionamentos do Agente Antes da Execução
Antes de iniciar a implementação de cada etapa, o assistente deve realizar as seguintes perguntas ao desenvolvedor:

Sobre o Core JU.KO:

Qual é o padrão exato da chave de armazenamento do token JWT no cliente (ex: juko_token) e como o payload identifica a empresa e o perfil do usuário?

Quais são os nomes exatos dos papéis/cargos configurados no JU.KO para restrição de rotas operacionais?

Como o JU.KO estrutura seus componentes de layout pai e qual o mecanismo utilizado para injeção de páginas filhas (ex: <Outlet/> do React Router)?

Sobre o Backend e Banco de Dados:

Onde fica localizado o arquivo de definição de rotas principal do JU.KO para o acoplamento do router do WMS?

Como o JU.KO inicializa a instância do Socket.io no servidor HTTP e se há padrão de namespaces já definido?

O banco de dados do JU.KO utiliza PostgreSQL via Prisma ORM ou possui outra estratégia de ORM/Migration?

Sobre UI/UX e Estilização:

Qual a versão exata do Tailwind CSS configurada no JU.KO e se existem tokens de cores customizados no arquivo de configuração do Tailwind que devam ser reaproveitados pelas telas do WMS?