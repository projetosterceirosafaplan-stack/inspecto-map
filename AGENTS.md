<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md

## Arquitetura

- Todos os dados da fiscalização ficam no dispositivo em IndexedDB (`src/lib/db.ts`, store `fiscalizacoes`) — o app foi pedido sem login, então não há backend.
- Fotos são guardadas como data URL JPEG redimensionada (`src/lib/image.ts`) para funcionarem offline e serem embutidas no Word sem upload.
- A lista oficial de pendências vive em `src/data/pendencias.json` (gerada da planilha do cliente) e é consultada por `src/lib/pendencias.ts` — é catálogo estático, não dado do usuário.
- O relatório Word é gerado 100% no navegador com `docx` em `src/lib/report.ts`, seguindo o modelo do cliente (uma tabela CÓDIGO/DESCRIÇÃO/PRIORIDADE/FOTO/CORREÇÃO por pendência).
- O mapa usa Maps JavaScript API com a chave de navegador do conector Google Maps, sem biblioteca Places e com `clickableIcons: false` (Places no navegador não é autorizado).
