interface ImportMetaEnv {
  readonly MAILGUN_EMAIL_DOMAIN: string
  readonly WEBSITE_DOMAIN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}