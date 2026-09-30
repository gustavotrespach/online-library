# Online Library

> Uma biblioteca digital pessoal e colaborativa para organizar livros, acompanhar leituras e compartilhar experiências literárias.

## Sobre o projeto

**Online Library** é um website desenvolvido para transformar a experiência de organizar e acompanhar livros em algo mais visual, pessoal e imersivo.

A proposta é criar uma biblioteca digital onde cada usuário possa organizar seus livros, acompanhar seu progresso de leitura e registrar suas próprias experiências ao longo do tempo.

O projeto também possui uma visão futura de **biblioteca social**, permitindo que usuários adicionem amigos e explorem suas bibliotecas e experiências de leitura.

---

## ✨ Funcionalidades

### Biblioteca pessoal

- Organização dos livros em uma estante digital.
- Adição de livros à biblioteca pessoal.
- Acompanhamento do progresso de leitura.
- Identificação automática do estado de leitura:
  - Não iniciado
  - Lendo
  - Lido
- Capas dos livros integradas à experiência visual da estante.

### Progresso de leitura

- Visualização dos livros concluídos durante o ano.
- Comparação visual com uma média de referência de leitura.
- Acompanhamento da evolução da própria leitura.

### Feedback dos livros

Ao concluir um livro, o usuário poderá registrar um **feedback pessoal** sobre a obra.

Esse feedback poderá posteriormente ser visualizado:

- pelo próprio usuário ao acessar o livro concluído;
- por amigos que tenham permissão para visualizar sua biblioteca.

### Biblioteca social — futuro

Uma das principais evoluções planejadas para o projeto é transformar a biblioteca em uma experiência social.

Futuramente, usuários poderão:

- adicionar outros usuários como amigos;
- aceitar solicitações de amizade;
- visualizar as bibliotecas dos amigos;
- explorar os livros que seus amigos possuem;
- visualizar informações de leitura compartilhadas;
- visualizar os feedbacks dos livros, de acordo com as permissões definidas.

> A camada social faz parte do roadmap do projeto e não está presente nas primeiras fases de desenvolvimento.

---

## 🎬 Experiência visual

O Online Library busca fugir da aparência tradicional de um sistema de gerenciamento de livros.

A interface combina:

- estética editorial;
- elementos inspirados em bibliotecas físicas;
- tipografia literária;
- animações cinematográficas;
- transições suaves;
- grandes espaços visuais;
- interação baseada em scroll.

A seção Hero terá uma experiência cinematográfica controlada pelo scroll, na qual o usuário atravessa visualmente a cena até chegar à próxima seção do website.

---

## 🛠️ Tecnologias

O projeto utiliza:

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **GSAP + ScrollTrigger**
- **Supabase**
- **PostgreSQL**
- **Google Books API**
- **Open Library API**
- **React Hook Form**
- **Zod**
- **Lucide React**
- **Vercel**

A arquitetura foi planejada para manter o projeto simples, modular e fácil de evoluir.

---

## 🏗️ Arquitetura

O projeto utiliza o **Next.js App Router**.

A estrutura principal foi planejada da seguinte maneira:

```text
online-library/
├── docs/
├── public/
│   └── assets/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── styles/
├── supabase/
│   └── migrations/
├── AGENTS.md
├── plan.md
├── tasks.md
├── decisions.md
└── README.md
