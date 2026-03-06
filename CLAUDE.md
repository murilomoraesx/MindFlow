# CLAUDE.md — MindFlow Project Rules

## Projeto
- **MindFlow** é um app de mapas mentais construído com React 19 + TypeScript + Vite + Zustand + @xyflow/react + Tailwind CSS v4.
- Idioma da interface: **Português Brasileiro** — todo texto visível ao usuário deve estar em PT-BR.

## Estrutura do Projeto
```
src/
├── App.tsx                          # Componente principal, auto-save, roteamento de views
├── main.tsx                         # Entry point
├── index.css                        # Estilos globais (Tailwind + background customizado)
├── types/index.ts                   # Tipos: NodeData, MindFlowNode, MindFlowEdge, MapData
├── store/useFlowStore.ts            # Zustand store (nodes, edges, history, undo/redo)
├── hooks/
│   ├── useKeyboardShortcuts.ts      # Atalhos de teclado (Tab, Ctrl+Z, Delete, etc.)
│   └── useAutoSave.ts               # Auto-save (não usado atualmente, lógica está no App.tsx)
├── utils/
│   ├── cn.ts                        # Utilitário clsx + tailwind-merge
│   └── colors.ts                    # Paleta de cores
├── components/
│   ├── Canvas/FlowCanvas.tsx        # Canvas principal com React Flow
│   ├── Nodes/
│   │   ├── IdeaNode.tsx             # Nó de ideia (padrão)
│   │   ├── FunnelNode.tsx           # Nó de funil (builder de etapas)
│   │   ├── GroupNode.tsx            # Nó de grupo (container visual)
│   │   ├── NoteNode.tsx             # Nó de nota adesiva
│   │   └── ImageNode.tsx            # Nó de imagem
│   ├── Edges/
│   │   ├── AnimatedEdge.tsx         # Aresta animada padrão
│   │   └── FunnelEdge.tsx           # Aresta de funil
│   ├── Sidebar/
│   │   ├── NodePalette.tsx          # Paleta de nós (arrastar e soltar)
│   │   └── StylePanel.tsx           # Painel de propriedades do nó selecionado
│   ├── Toolbar/TopBar.tsx           # Barra superior (nome, undo/redo, tema, export)
│   └── ProjectList.tsx              # Tela de listagem/criação de projetos
```

## Servidor de Desenvolvimento
- **Comando:** `npm run dev` (Vite na porta 3000)
- **Acesso:** `http://localhost:3000`
- Antes de rodar, instalar dependências: `npm install`
- Hot-reload automático — alterações no código atualizam o navegador.

## Convenções de Código
- Componentes funcionais com TypeScript
- Estado global via Zustand (`useFlowStore`)
- Estilização com Tailwind CSS v4 (classes utilitárias inline)
- Modo claro/escuro via classe `.dark` no `<html>`
- Animações com `motion` (Framer Motion) — apenas `transform` e `opacity`
- Ícones via `lucide-react`

## Tipos de Nós
| Tipo      | Componente       | Descrição                                    |
|-----------|------------------|----------------------------------------------|
| `idea`    | IdeaNode.tsx     | Nó padrão para ideias no mapa mental         |
| `funnel`  | FunnelNode.tsx   | Builder de funil com etapas configuráveis     |
| `group`   | GroupNode.tsx     | Container visual para agrupar nós            |
| `note`    | NoteNode.tsx     | Nota adesiva estilo post-it                  |
| `image`   | ImageNode.tsx    | Nó com imagem (via URL)                      |

## Atalhos de Teclado
- `Tab` — Cria novo nó conectado ao selecionado
- `Ctrl+Z` — Desfazer
- `Ctrl+Shift+Z` / `Ctrl+Y` — Refazer
- `Ctrl+D` — Duplicar nó
- `Delete` / `Backspace` — Excluir selecionados
- `Ctrl++` / `Ctrl+-` — Zoom in/out
- `Ctrl+0` — Ajustar à tela

## Persistência
- Dados salvos em `localStorage` com debounce de 500ms
- Chaves: `mindflow_${mapId}` (dados do mapa), `mindflow_recent_maps` (lista de projetos)

## Design Guidelines
- Fundo do canvas: gradiente radial moderno com grid sutil de linhas (sem pontilhado)
- Tema escuro: tons de slate-900/950 com acentos coloridos
- Tema claro: tons de slate-50/100 com acentos coloridos
- Espaçamento consistente usando tokens do Tailwind
- Profundidade com camadas (base → elevado → flutuante)

## Hard Rules
- Todo texto visível deve ser em Português Brasileiro
- Não usar `transition-all` — preferir propriedades específicas
- Não adicionar features além do solicitado
- Manter código simples e focado
