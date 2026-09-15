declare module 'tiktok-live-connector' {
  export class WebcastPushConnection {
    constructor(username:string, options?:any);
    connect(): Promise<any>;
    disconnect(): void;
    on(event:string, listener:(data:any)=>void): this;
  }
}
