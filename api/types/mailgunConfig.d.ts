declare module '../../config/mailgunConfig' {
  interface MailgunConfig {
    apiKey: string;
    emailDomain: string;
    adminAccessKey: string;
  }

  const config: MailgunConfig;
  export default config;
}

declare module '../../config/mailgunConfig.js' {
  interface MailgunConfig {
    apiKey: string;
    emailDomain: string;
    adminAccessKey: string;
  }

  const config: MailgunConfig;
  export default config;
}