declare global {
  interface ImportMeta {
    readonly env: {
      readonly MAILGUN_EMAIL_DOMAIN: string
      readonly WEBSITE_DOMAIN: string
    }
  }
}