interface ImportMetaEnv {
  readonly VITE_MAILGUN_EMAIL_DOMAIN: string
  readonly VITE_WEBSITE_DOMAIN: string
  readonly MAILGUN_EMAIL_DOMAIN: string
  readonly WEBSITE_DOMAIN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}