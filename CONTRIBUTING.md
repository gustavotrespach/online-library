# Contribuindo com o Online Library

Guia para desenvolvedores humanos. Agentes de IA devem seguir o
`AGENTS.md`.

## Requisitos

- Node.js 24 LTS (mínimo exigido pelo Next.js: 20.9)
- npm

## Primeiros passos

``` bash
npm install
cp .env.example .env.local   # e preencha com os valores do Supabase
npm run dev
```

O website fica disponível em <http://localhost:3000>. Use `localhost`, e
não `127.0.0.1`: os cookies de sessão e os links de confirmação do Auth
dependem desse host. Sem as variáveis do `.env.local`, as páginas não
respondem. Detalhes do banco e do Auth: `docs/banco-de-dados.md`.

## Scripts

| Comando             | Descrição                                     |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                   |
| `npm run build`     | Build de produção                             |
| `npm run start`     | Serve o build de produção                     |
| `npm run lint`      | ESLint                                        |
| `npm run typecheck` | Gera os tipos de rotas do Next.js e roda `tsc` |

Antes de concluir uma alteração, rode `typecheck`, `lint` e `build`.

## Documentação

- `plan.md`: o que o website deve ser e as fases de desenvolvimento.
- `tasks.md`: estado atual das tarefas.
- `AGENTS.md`: regras de trabalho, arquitetura e convenções, válidas
  também para humanos.
