# Climora

**Saiba quando plantar. E quando vai colher.**

A pessoa escolhe o município e o que quer plantar. O Climora analisa 10 anos de
clima diário da região e mostra as **melhores épocas de plantio** (até três
opções), cada uma com a **data prevista da colheita** e os motivos (temperatura,
chuva, geada, chuva na colheita), com ou sem irrigação. Depois acompanha a
plantação e, perto da colheita, confere a **chuva hora a hora** para escolher o
horário mais seco de colher e entregar.

## Como funciona o cálculo

1. **Clima do município** (`src/lib/climate.ts`): 10 anos de dados diários do
   Open-Meteo (reanálise ERA5) viram um "ano típico" de 365 dias: temperatura
   média/mínima/máxima, chuva, evapotranspiração e chance de geada.
2. **Perfil da cultura** (`src/lib/crops.ts`): 71 culturas com faixa de
   temperatura (mínima, ideal, máxima), ciclo, sensibilidade à geada, necessidade
   de água, se precisa de colheita seca, se sofre com chuva excessiva. Culturas
   fora da lista são cadastradas a partir de um tipo parecido e do ciclo.
3. **Simulação** (`src/lib/suitability.ts`): para cada data de plantio do ano
   (a cada 5 dias), o ciclo é simulado dia a dia. O ciclo segue **graus-dia**,
   então no frio a colheita demora mais. A nota (0–100) combina temperatura,
   água (ignorada com irrigação), geada e chuva na colheita. As três melhores
   janelas separadas viram as opções, convertidas em datas reais a partir de hoje.

As épocas são estimativas por clima histórico e parâmetros gerais das culturas,
não por cultivar. Para crédito e seguro rural vale o ZARC (MAPA).

## O que o produto faz

| Recurso | Onde está no código |
| --- | --- |
| Página de apresentação (`/`) | `src/routes/index.tsx` |
| **Planejar**: busca de cultura, irrigação, 3 opções de época, ano inteiro, simulador de data | `src/components/planner.tsx` |
| **Plantações**: plantios salvos, progresso, "Plantei", "Colhi", agendar colheita | `src/components/plantings-list.tsx` |
| **Colheitas**: agenda com chuva hora a hora, horário mais seco, WhatsApp, calendário | `src/components/harvest-agenda.tsx`, `src/lib/weather.ts` |
| Município: todos os municípios do Brasil (busca enquanto digita) ou GPS | `src/components/settings-panel.tsx` |
| Backup, migração automática de versões anteriores, PWA | `src/lib/harvest.ts`, `public/` |

## Rodando localmente

Requer Node.js 20+ (ou Bun).

```sh
bun install        # ou: npm install
bun run dev        # ou: npm run dev
```

Abra o endereço impresso no terminal (normalmente http://localhost:8080).
A página inicial é a apresentação; o app fica em `/app`.

Outros comandos:

- `bun run test` — testes das regras (clima, culturas, épocas de plantio por região, previsão, agenda, armazenamento)
- `bun run build` — build de produção
- `bun run preview` — serve o build de produção (o service worker só é registrado em produção)

## Configuração (`.env`)

Nada é obrigatório para desenvolver. Veja `.env.example`:

| Variável | Para quê |
| --- | --- |
| `VITE_OPEN_METEO_HOST` | Host da API comercial, ex.: `https://customer-api.open-meteo.com` |
| `VITE_OPEN_METEO_GEOCODING_HOST` | Host comercial da busca de cidades |
| `VITE_OPEN_METEO_ARCHIVE_HOST` | Host comercial do histórico climático |
| `VITE_OPEN_METEO_API_KEY` | Chave comercial do Open-Meteo |
| `VITE_CONTACT_EMAIL` | E-mail exibido na página inicial (padrão: `contato@climora.app`) |

> **Importante para uso comercial:** a API gratuita do Open-Meteo é só para uso
> não comercial. Ao cobrar por qualquer parte do serviço, contrate um plano
> comercial e, de preferência, passe as chamadas por um servidor próprio para
> que a chave não fique exposta no navegador (ver `PRODUTO.md`, Fase 2).
> A atribuição "Open-Meteo.com (CC BY 4.0)" já aparece no app e na página inicial.

## Dados

Plantações, colheitas e ajustes ficam no `localStorage` do navegador (`climora:v2`, formato versão 3);
o clima do município fica em `climora:climate:v1` e a última previsão em `climora:forecast:v1`. Dados da versão de demonstração
(`chuva-colheita:v1`) são migrados automaticamente na primeira abertura.
O usuário pode baixar e restaurar um backup em **Ajustes → Seus dados**.

## Tecnologia

TanStack Start · React 19 · TypeScript (strict) · Tailwind CSS 4 · Vitest · Open-Meteo
