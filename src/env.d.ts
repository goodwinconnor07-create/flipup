/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The server's full address, for builds that don't run on the server's own domain. */
  readonly VITE_SERVER_URL?: string;
}
