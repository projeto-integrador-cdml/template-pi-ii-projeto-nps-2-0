declare module 'whatsapp-web.js' {
  export class Client {
    constructor(options?: any);
    on(event: string, callback: (...args: any[]) => void): void;
    initialize(): Promise<void>;
    sendMessage(chatId: string, content: any, options?: any): Promise<any>;
    info: any;
    logout(): Promise<void>;
    destroy(): Promise<void>;
  }
  export class LocalAuth {
    constructor(options?: any);
  }

  const content: {
    Client: typeof Client;
    LocalAuth: typeof LocalAuth;
  };
  export default content;
}

