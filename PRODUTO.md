# Climora · estratégia de produto

> Documento vivo. Números de preço e metas são **hipóteses para validar no piloto**, não decisões.

## 1. O problema

Decidir **quando plantar** é a escolha que mais pesa na safra: fora de época a
planta sofre com frio, calor, falta de chuva ou geada, e a colheita cai na chuva.
Os calendários disponíveis são genéricos (por região do país ou no pacote da
semente) e não dizem quando a colheita vai sair. O ZARC oficial cobre poucas
hortaliças e não é pensado para o dia a dia do pequeno produtor.

Depois, na colheita, quem produz para venda direta (feira, encomenda,
restaurante, merenda escolar) decide **todo dia** a hora de colher. Uma chuva na
hora errada significa folha molhada que murcha e apodrece, raiz colhida no barro,
atraso na entrega e cliente insatisfeito. A previsão disponível (TV, apps
genéricos) fala da capital e do dia inteiro, não **da roça na hora da colheita**.

## 2. A proposta

> **Saiba quando plantar. E quando vai colher.**

A pessoa diz o que quer plantar; o Climora analisa 10 anos de clima do município
e mostra até três melhores épocas de plantio, com a colheita prevista e os
motivos. Ela salva o plantio, acompanha o crescimento e, perto da colheita, o
app cruza a chuva hora a hora com o horário de colher e entregar.

Princípios de produto:
- **Uma decisão por cartão**: mover para o horário sugerido ou manter o plano.
- **Nunca inventar previsão**: sem dado, o app diz "sem previsão", nunca "0%".
- **Funciona no campo**: celular, sinal fraco, sem cadastro obrigatório.
- **Linguagem do produtor**: português simples, sem termos técnicos.

## 3. Para quem

| Segmento | Papel | Dor principal | Paga? |
| --- | --- | --- | --- |
| Agricultor familiar (venda direta) | Usuário principal | Perder colheita/entrega por chuva | Não (grátis para sempre) |
| Cooperativas e associações | Cliente pagante | Coordenar entregas coletivas (PNAE, PAA, feiras) e reduzir perdas | Sim |
| Prefeituras, ATER (Emater etc.), programas e ONGs | Parceiro / cliente institucional | Apoiar produtores atendidos e ter visão regional de risco | Contrato / convênio |

Por que cooperativas pagam: uma entrega coletiva perdida ou atrasada (merenda
escolar, por exemplo) custa mais que a assinatura, e hoje a coordenação é feita
por grupos de WhatsApp e planilhas. A lei do PNAE reserva parte das compras da
merenda à agricultura familiar, o que torna essas entregas recorrentes e
sensíveis a prazo.

## 4. Modelo de negócio (hipótese)

**B2B2C freemium**: grátis para o produtor; receita de quem organiza produtores.

| Plano | O que inclui | Preço a testar |
| --- | --- | --- |
| Produtor | Tudo o que existe hoje no app | Grátis |
| Cooperativa | Painel dos associados, alertas de entregas coletivas, relatórios, suporte | R$ 8–15 por produtor ativo/mês, com mínimo mensal |
| Institucional | Implantação, capacitação, visão regional, integração com programas | Contrato anual |

Custos principais: licença comercial da API de previsão (planos mensais fixos —
ver https://open-meteo.com/en/pricing), hospedagem, mensagens do WhatsApp
Business (cobradas por conversa) e suporte. O cache de previsão por região
(Fase 2) faz o custo de API crescer com o número de **regiões**, não de usuários.

## 5. Métricas

| Métrica | Definição | Meta inicial (hipótese) |
| --- | --- | --- |
| Ativação | Escolheu a localização e criou 1 colheita em até 24 h | 60% dos que abrem o app |
| Uso semanal | Produtores com ≥ 1 colheita criada ou concluída na semana | 40% dos ativados |
| Valor do alerta | % de alertas com ação (mover ou manter) | 70% |
| Entregas registradas | Colheitas marcadas como entregues por produtor/mês | ≥ 8 |
| Retenção semana 4 | Ativados que ainda usam na 4ª semana | 35% |

Pergunta de validação qualitativa: *"o Climora evitou alguma perda ou atraso este mês?"*

## 6. Ir ao mercado

1. **Piloto (8 semanas)** com 2–3 cooperativas ou associações e o técnico de ATER
   que já as atende. Instalação presencial no celular de cada produtor.
2. Canal principal: **organizações**, não anúncios. Um técnico ou dirigente
   alcança dezenas de produtores e é quem paga.
3. Indicação via WhatsApp: o resumo da semana e a confirmação ao cliente
   levam o nome do produto para fora do app.
4. Feiras e eventos regionais para captação direta de produtores.

## 7. Roadmap

**Fase 1 — feita**: planejamento de plantio por clima local (71 culturas + cadastradas), colheita prevista, Minhas plantações, previsão real, alertas com limite, horário
sugerido, status, cliente/quantidade, WhatsApp, calendário, backup, PWA,
página de apresentação.

**Fase 2 — serviço (próximos 2–3 meses)**
- Rota de servidor `/api/forecast` (TanStack Start) que guarda a chave comercial
  e faz cache por grade de ~10 km por 1 h.
- Conta opcional (telefone) e sincronização entre aparelhos.
- Alertas ativos: Web Push e mensagem no WhatsApp na véspera da colheita em risco.
- Analytics de produto com consentimento (LGPD).

**Fase 3 — organizações**
- Painel da cooperativa: colheitas dos associados, risco por entrega coletiva.
- Relatórios para PNAE/PAA e feiras.
- Ciclos de cultura calibrados por região com parceiros de ATER.

## 8. Riscos e respostas

| Risco | Resposta |
| --- | --- |
| Recomendação de época errada | Parâmetros gerais revisados com Embrapa/ATER; mostrar motivos e notas, nunca certeza; integrar o ZARC onde existir. |
| Previsão local erra | Mostrar chance (não certeza), hora da atualização e deixar a decisão com o produtor; medir alertas "falsos" relatados. |
| Sinal fraco no campo | PWA com última previsão salva; atualização automática ao voltar o sinal. |
| Letramento digital | Fluxo de 3 passos, botões grandes, instalação assistida no piloto; avaliar entrada por voz. |
| Licença da API | Plano comercial antes de qualquer cobrança; host e chave configuráveis por `.env`. |
| Dados pessoais (LGPD) | Hoje tudo fica no aparelho. Na Fase 2: mínimo de dados, consentimento explícito e exclusão a pedido. |
| Dependência de um fornecedor | Parsing isolado em `lib/weather.ts`; trocar ou combinar fontes sem mexer nas regras. |
