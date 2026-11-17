/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional: commercial Open-Meteo host, e.g. https://customer-api.open-meteo.com */
  readonly VITE_OPEN_METEO_HOST?: string;
  /** Optional: commercial geocoding host, e.g. https://customer-geocoding-api.open-meteo.com */
  readonly VITE_OPEN_METEO_GEOCODING_HOST?: string;
  /** Optional: commercial historical-weather host, e.g. https://customer-archive-api.open-meteo.com */
  readonly VITE_OPEN_METEO_ARCHIVE_HOST?: string;
  /** Optional: commercial Open-Meteo key. It is visible in the browser; see PRODUTO.md. */
  readonly VITE_OPEN_METEO_API_KEY?: string;
  /** Contact address shown on the landing page. */
  readonly VITE_CONTACT_EMAIL?: string;
}

