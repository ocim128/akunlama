export interface EmailEvent {
  'event': string;
  'timestamp': number;
  'id': string;
  'recipient': string;
  'sender': string;
  'from': string;
  'subject': string;
  'message': {
    'headers': {
      'from': string;
      'subject': string;
      [key: string]: string;
    };
  };
  'envelope'?: {
    'sender': string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface MailgunResponse {
  items: EmailEvent[];
  [key: string]: any;
}

export interface RateLimitData {
  requestTimestamps: number[];
  uniqueUsernames: Set<string>;
  resetTime: number;
}

export interface CacheEntry {
  emails: EmailEvent[];
  timestamp: number;
}