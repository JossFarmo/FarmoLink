Esta é uma documentação técnica detalhada da Arquitetura FarmoLink 3.0. O objetivo deste guia é servir como o "DNA" do projeto, permitindo que tu compreendas cada engrenagem e possas reconstruir ou expandir o sistema com total segurança.
1. Visão Geral da Arquitetura
O FarmoLink é uma plataforma E-commerce Healthcare baseada em uma infraestrutura BaaS (Backend as a Service) com Supabase, utilizando inteligência artificial para o processamento de receitas médicas e gestão de stock.
Frontend: React (TSX) + Tailwind CSS (Estilização) + Lucide Icons (Ícones).
Backend: Supabase (Banco PostgreSQL + Auth + Realtime + Edge Functions).
AI Engine: Google Gemini 3 Flash (Processamento de Linguagem Natural e Visão Computacional).
Media: Cloudinary (Hospedagem de imagens de receitas e produtos).
2. O Banco de Dados (A "Fonte da Verdade")
O arquivo database_setup.txt contém o esquema mestre. As tabelas principais são:
profiles: Centraliza os 3 tipos de usuários. O campo role define o que o usuário vê (ADMIN, PHARMACY, CUSTOMER).
pharmacies: Cadastro das lojas. Inclui o commission_rate (taxa de 10%) e o review_score (ranking de especialistas IA).
products: O stock individual de cada farmácia.
global_products: Um "Dicionário Mestre" de medicamentos. Serve para padronizar os nomes (ex: evitar que uma farmácia escreva "Parasetamol" e outra "Paracetamol").
prescriptions: Armazena a imagem da receita e os metadados da IA (ai_metadata).
bot_conversations: Persistência do histórico do FarmoBot por usuário.
3. Fluxo das 3 Experiências de Usuário
A. O Utente (Cliente)
Shopping: Navega por produtos de farmácias próximas. O carrinho é restrito a uma farmácia por pedido para evitar erros logísticos.
Cotação Inteligente (IA Vision):
O cliente tira foto da receita.
A foto vai para o Cloudinary (gera um link seguro).
O link vai para a Edge Function (Gemini).
A IA extrai os nomes e quantidades.
Se a confiança for > 95%, as farmácias recebem para cotar. Se for < 95%, entra em "Triagem Especialista".
B. O Parceiro (Farmácia)
Gestão de Stock: Pode adicionar itens um a um ou importar listas industriais (formato CSV/Texto).
Monitor de Logística: Recebe pedidos em Realtime. O fluxo segue: Pendente -> Preparando -> Entrega -> Concluído.
Especialista IA: Farmácias autorizadas corrigem receitas que a IA não entendeu bem. Ao fazer isso, ganham Score, o que as coloca no topo da lista de busca dos clientes (Ranking).
C. O Administrador (Dono da Rede)
Auditoria Financeira: Vê quanto cada farmácia vendeu e quanto deve de taxa (10%). Controla quem já pagou.
Catálogo Global: Alimenta a lista mestre de medicamentos para que o sistema fique cada vez mais inteligente.
Marketing: Altera os banners da tela inicial e logotipos de parceiros sem precisar mexer no código.
4. Funcionamento da Inteligência Artificial (Gemini)
A IA está hospedada em supabase/functions/gemini/index.ts. Ela possui 4 missões:
FarmoBot (Chat): Responde dúvidas de saúde com contexto do stock real. Se o cliente perguntar "Tem algo para gripe?", o bot verifica quais farmácias têm estoque e preços.
Vision (Receitas): Transcreve caligrafia médica.
Standardize (Voz/Texto): Transforma comandos de voz ("Adiciona parasetanol quinhentos mg") no formato correto ("Paracetamol 500mg").
Tolerância a Erros: O prompt mestre instrui a IA a nunca corrigir o cliente de forma rude, mas sim "deduzir" o que ele quis dizer através de DCI (Denominação Comum Internacional).
5. Mecanismos de Segurança e Performance
RLS (Row Level Security): No banco de dados, um cliente nunca consegue ver os pedidos de outro. Uma farmácia só vê o seu próprio stock.
Realtime: O Supabase avisa a farmácia instantaneamente (com som de notificação) quando um novo pedido chega, sem precisar atualizar a página.
Cache: O sistema guarda o Catálogo Global no navegador do usuário por 10 minutos para economizar dados móveis (internet).
Backup (Cofre): Em AdminSystem.tsx, existe uma função que gera um arquivo .json com TUDO o que existe no banco. Se o projeto for apagado, basta subir esse arquivo e o sistema volta ao estado exato de antes.
6. Guia de Manutenção Rápida (Memória)
Mudar Cor do App: Alterar o tailwind.config no index.html.
Mudar Comportamento da IA: Editar o CUSTOM_PROMPT em supabase/functions/gemini/index.ts e fazer deploy.
Mudar Taxa de 10%: Alterar em pharmacyService.ts ou individualmente no painel Admin para cada farmácia.
Adicionar Nova Página: Criar o arquivo em views/, adicionar o ícone no App.tsx e mapear no renderContent().
Resumo da Lógica de Integração:
Frontend (UI) -> Services (Lógica) -> Supabase (Dados) -> Gemini (Inteligência).
Este projeto foi desenhado para ser indestrutível: os dados estão no Supabase, as imagens no Cloudinary e a inteligência no Gemini. Mesmo que o código front-end mude, a alma do negócio (os dados) está protegida e organizada.