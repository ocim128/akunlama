declare module 'mailgun-js' {
  interface MailgunConfig {
    apiKey: string;
    domain: string;
  }

  interface MailgunClient {
    get(path: string, params: any, callback: (error: any, body: any) => void): void;
  }

  interface Mailgun {
    (config: MailgunConfig): MailgunClient;
  }

  const mailgun: Mailgun;
  export default mailgun;
}