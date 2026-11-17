<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application rules
- `/` is the marketing page and `/app` is the product. The product's core is choosing planting seasons: `/app` opens on Planejar, then Plantações and Colheitas. Sections, the harvest form and settings are states of the same route so it works offline from one cached page.
- Planting seasons come only from `lib/climate.ts` (10-year local climate profile) + `lib/crops.ts` (crop profiles) + `lib/suitability.ts` (simulation and windows). Keep these pure and covered by the regional tests (Sul, Cerrado, Semiárido fixtures); when changing crop parameters or scoring, check the regional expectations still hold.
- Keep domain rules pure and browser-safe with tests: `lib/harvest.ts` (plans, plantings, settings, storage format and migrations), `lib/weather.ts` (forecast and rain rules), `lib/share.ts`, `lib/dates.ts`, plus the three planting modules above.
- Dates are `YYYY-MM-DD` strings and times `HH:mm`. Never introduce timezone conversions: the forecast is requested with `timezone=auto`, so its hours are local wall-clock strings that compare directly with plans; calendar arithmetic uses UTC days.
- Never invent a forecast: an hour without data, a past date or a date beyond the 16-day range is shown as "sem previsão", never as 0%.
- Suggested harvest windows keep the same length and end no later than the original end, so the preparation time before delivery is preserved.
- A "manter plano" decision stores the chance the farmer accepted; it re-alerts only if the chance rises above it, and it is cleared when the harvest date or window changes.
- Load and save state only after mount through `useHarvest`; storage failures keep an in-memory session with a warning and never overwrite unreadable data. Any change to the stored shape needs a new version plus a migration and tests.
- Planting advice uses the climate history, never the 16-day forecast. Always present it as an estimate from general crop parameters and point to ZARC/ATER; never invent precision (no cultivar-specific claims).
- Show the Open-Meteo attribution wherever forecast data appears. The free API is non-commercial only (see `PRODUTO.md`).
- All user-facing text is Brazilian Portuguese, written for farmers: short, concrete, no jargon.
