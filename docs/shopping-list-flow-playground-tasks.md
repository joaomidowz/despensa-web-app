# Shopping List Flow Playground

Objetivo: validar no frontend o novo backend da lista de compras antes de partir para o fluxo completo de compra.

## Branches

- Frontend: `feat/shopping-list-flow-playground`
- Backend: `feat/shopping-list-backend-foundation`

## Endpoints Disponiveis Para Integracao

- `GET /api/shopping-list/items`
- `POST /api/shopping-list/items`
- `POST /api/shopping-list/items/from-inventory`
- `PATCH /api/shopping-list/items/{shopping_list_item_id}`
- `DELETE /api/shopping-list/items/{shopping_list_item_id}`
- `GET /api/shopping-list/catalog`
- `GET /api/inventory`

## Fase 1: Lista Persistida

- [ ] Trocar a lista local atual por dados vindos de `GET /shopping-list/items`
- [ ] Criar item manual com nome, anotacao e quantidade desejada
- [ ] Editar item da lista
  - nome
  - anotacao
  - quantidade desejada
  - marcado ou nao marcado
- [ ] Remover item da lista
- [ ] Exibir origem do item
  - manual
  - inventory

## Fase 2: Inventario Integrado

- [ ] Adicionar CTA por linha na tela de inventario
  - `Adicionar a lista`
- [ ] Integrar CTA com `POST /shopping-list/items/from-inventory`
- [ ] Mostrar feedback visual quando item ja existir e a quantidade for somada
- [ ] Revisar empty states
  - inventario vazio
  - lista vazia

## Fase 3: Tela de Lista Melhorada

- [ ] Reorganizar a tela em tres blocos claros
  - recomendados do sistema
  - itens da lista atual
  - comprados antes
- [ ] Permitir adicionar item de historico para a lista atual
- [ ] Exibir anotacao logo no card ou linha do item
- [ ] Exibir quantidade desejada de forma clara

## Fase 4: Modo Fazer Compras

- [ ] Adicionar botao fixo `Fazer compras`
- [ ] Entrar em modo focado
  - esconder recomendacoes
  - esconder catalogo
  - mostrar apenas checklist da compra atual
- [ ] Manter CTA fixo no rodape
- [ ] So habilitar `Finalizar compra` com pelo menos 1 item marcado

## Fase 5: Fechamento da Compra

- [ ] Tela de escolha ao finalizar
  - `Adicionar manualmente`
  - `Escanear nota`
- [ ] Preparar payload local do que foi marcado nessa compra
- [ ] Definir contrato backend da sessao de compra antes da integracao final

## Fase 6: Proximas Bases de Produto

- [ ] Listas pre-definidas por casa
- [ ] Aplicar lista modelo na compra atual
- [ ] Matching entre anotacao curta e item real da nota
  - exemplo: `Queijo` x `QUEIJO M 250G`
- [ ] Revisao manual de match quando houver ambiguidade

## Observacoes

- Nao misturar ainda com acabamento visual final.
- O foco dessa branch e validar fluxo, contrato e ergonomia.
- Sessao de compra e templates ainda dependem da proxima rodada do backend.
