# Fixtures da Open Library

Usadas por `tests/unit/books.test.mts` (testes "resposta real"). Os testes
leem estes arquivos e não fazem chamadas HTTP: rodam sem internet.

## Procedência

Capturas reais feitas em 2026-10-07 com `curl` (User-Agent
"OnlineLibrary/0.1 (desenvolvimento local)"), durante a Fase 08. Os arquivos
ficavam fora do repositório e foram apagados pela limpeza automática do
diretório temporário em 2026-10-13. Foram reconstruídos a partir do que a
sessão de 07/10 imprimiu dessas respostas. Nenhum valor foi inventado; o
que não estava impresso ficou de fora. A formatação (indentação) não é a
original.

| Arquivo | Requisição | Fidelidade |
|---|---|---|
| `ol-isbn.json` | `search.json?isbn=9780140449136&limit=3&fields=key,title,author_name,first_publish_year,cover_i,number_of_pages_median,editions,editions.key,editions.title,editions.isbn,editions.cover_i,editions.publish_year` | Resposta completa (foi impressa inteira). |
| `ol-text.json` | `search.json?q=dom%20casmurro&limit=3&fields=key,title,author_name,first_publish_year,cover_i,number_of_pages_median,editions,editions.key,editions.title,editions.isbn,editions.number_of_pages,editions.cover_i,editions.publish_year,editions.language` | **Recorte**: metadados da busca e os 2 primeiros resultados completos. O 3º resultado (uma obra de 1899) foi truncado na impressão e não foi incluído. |
| `ol-edition.json` | `books/OL56164313M.json` | **Recorte**: só os campos impressos: os lidos por `normalizeOpenLibraryEdition` (`title`, `number_of_pages`, `publish_date`, `isbn_13`, `isbn_10`, `covers`), mais `authors` e `works`. Não é a resposta bruta completa. |

## Cobertura

- "resultado completo" valida pelo `bookSearchResultSchema` os resultados
  disponíveis: 2, e não os 3 da resposta original.
- Não completar os arquivos com dados novos da API nem com dados
  inventados: uma nova captura deve substituir o arquivo inteiro e
  atualizar esta tabela.
