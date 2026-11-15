# Charts

Sito statico "vetrina" per i grafici pubblicati su r/dataisbeautiful.
Astro + Observable Plot, pubblicato su GitHub Pages. Nessun backend, nessun database, nessuna richiesta a terzi.

## Comandi

| Comando | Cosa fa |
| --- | --- |
| `npm install` | Installa le dipendenze (serve Node 22.23.4 o superiore) |
| `npm run dev` | Sito in locale su `http://localhost:4321/charts/`, senza bozze |
| `npm run dev:drafts` | Come sopra, ma mostra anche i grafici con `draft: true` |
| `npm run new-chart <slug>` | Crea lo scheletro di un nuovo grafico |
| `npm run build` | Genera il sito in `dist/` (le bozze sono sempre escluse) |
| `npm run preview` | Serve `dist/` in locale, identico a quello pubblicato |
| `npm run check` | Controllo dei tipi TypeScript e dei file Astro |

## Aggiungere un grafico

1. **Crea lo scheletro.** Lo slug diventa l'indirizzo della pagina: solo minuscole, cifre e trattini.

   ```sh
   npm run new-chart coffee-prices
   ```

   Vengono creati:

   ```
   src/content/charts/coffee-prices/
     index.md      frontmatter + testo (parte con draft: true)
     data.json     dati del grafico (parte vuoto: [])
     preview.png   immagine segnaposto
   src/charts/coffee-prices.ts   funzione che disegna il grafico
   ```

2. **Metti i dati** in `data.json`. Se è un array di oggetti, la pagina mostra anche la tabella "Show data table" (prime 1000 righe).

3. **Scrivi il grafico** in `src/charts/coffee-prices.ts`, nel punto indicato dai commenti. Il modulo esporta `render(container, data, theme)`:
   - usa `container.clientWidth` per la larghezza: `render` viene richiamata a ogni ridimensionamento e al cambio chiaro/scuro;
   - usa `plotOptions(theme, {...})` per le opzioni Plot condivise (griglia orizzontale, assi leggeri, font);
   - usa `theme.colors.accent` per una serie sola e `theme.palette` per più serie, nell'ordine dato;
   - usa `attachTooltip(container, plot, d => ({ title, rows }))` per il tooltip. Il grafico deve avere almeno un mark con `Plot.pointerX`, `Plot.pointerY` o `Plot.pointer`;
   - restituisci una funzione di pulizia (lo scheletro lo fa già).

4. **Compila `index.md`**: frontmatter (tabella qui sotto) e testo in Markdown (highlights, metodo, note).

5. **Sostituisci `preview.png`** con l'immagine pubblicata su Reddit. È quella usata nelle card e nel link "Download image".

### Campi del frontmatter

| Campo | Tipo | Obbligatorio | Note |
| --- | --- | --- | --- |
| `title` | testo | sì | Titolo del grafico |
| `subtitle` | testo | sì | Una frase su cosa mostra. Usata anche come descrizione accessibile del grafico |
| `date` | data (`2026-11-15`) | sì | Data di pubblicazione. Ordina la home |
| `tags` | lista di testi | sì | Può essere vuota (`[]`). Ogni tag genera una pagina `/tags/<tag>/` |
| `source` | testo | sì | Fonte dei dati |
| `redditUrl` | URL | no | Link al post Reddit |
| `preview` | immagine | sì | Percorso relativo, di norma `./preview.png` |
| `chart` | testo | sì | Nome del modulo in `src/charts/`, senza `.ts` |
| `draft` | booleano | no | Default `false`. Con `true` il grafico non entra nella build |

Se manca un campo obbligatorio, o `chart` punta a un modulo che non esiste, o manca `data.json`, la build si ferma con un errore che indica grafico e campo.

## Provare in locale

```sh
npm run dev:drafts
```

Apri `http://localhost:4321/charts/`. La pagina del grafico è `http://localhost:4321/charts/charts/<slug>/` (il primo `charts` è il nome del repo, il secondo la sezione).

Per vedere il sito esattamente come sarà online:

```sh
npm run build && npm run preview
```

## Pubblicare

1. In `index.md` togli `draft: true` (o metti `draft: false`) e controlla `date`.
2. Dopo aver postato su Reddit, aggiungi `redditUrl`.
3. Commit e push su `main`:

   ```sh
   git add .
   git commit -m "Add coffee-prices chart"
   git push
   ```

Il workflow `.github/workflows/deploy.yml` costruisce e pubblica il sito. Home, pagine tag e navigazione si aggiornano da sole.

## Dove cambiare le cose

| Cosa | File |
| --- | --- |
| Nome del sito, riga di presentazione, link GitHub e Reddit | `src/consts.ts` |
| Utente GitHub e nome del repo (URL del sito) | `astro.config.mjs` |
| Colori, palette, font, opzioni Plot, tooltip | `src/charts/theme.ts` |
| Stile delle pagine | `src/styles/global.css` |
| Testo della pagina About | `src/pages/about.astro` |
| Campi del frontmatter | `src/content.config.ts` |

I colori sono definiti solo in `src/charts/theme.ts`: le variabili CSS del sito vengono generate da lì, quindi pagine e grafici restano allineati, anche in modalità scura.
