export {};

type MatchScene='intro'|'versus'|'background'|'score'|'mvp'|'victory'|'defeat'|'outro';
type LiveEvent={type:string;user:string;detail:string;raw?:unknown;timestamp:number};
type LiveStatus={connected:boolean;roomId?:string|null;reason?:string};
type LiveStats={viewerCount?:number};
type TriggerAction={action:'sound'|'overlay'|'tts'|'media';value:string;payload:LiveEvent};

declare global {
  interface Window {
    nexora: {
      connectTikTok:(username:string)=>Promise<any>;
      disconnectTikTok:()=>Promise<any>;
      getProfiles:()=>Promise<any>;
      saveProfiles:(profiles:unknown,settings:unknown)=>Promise<any>;
      getAnalytics:()=>Promise<any>;
      resetAnalytics:()=>Promise<any>;
      getOverlayUrl:()=>Promise<any>;
      testOverlay:(text:string)=>Promise<any>;
      getOverlayConfig:()=>Promise<any>;
      saveOverlayConfig:(config:unknown)=>Promise<any>;
      previewOverlay:(payload:unknown)=>Promise<any>;
      previewMatchScene:(scene:MatchScene,payload?:unknown)=>Promise<any>;
      exportMatchScene:(scene:MatchScene,payload?:unknown)=>Promise<any>;
      exportWholeMatchPack:(payload?:unknown)=>Promise<any>;
      saveMatchPresetSnapshot:(payload?:unknown)=>Promise<any>;
      stopMatchScene:()=>Promise<any>;
      getMobileInfo:()=>Promise<any>;
      getMobileQr:()=>Promise<any>;
      openExternal:(url:string)=>Promise<any>;
      launch:(command:string)=>Promise<any>;
      hotkey:(value:string)=>Promise<any>;
      mouse:(value:string)=>Promise<any>;
      connectObs:()=>Promise<any>;
      disconnectObs:()=>Promise<any>;
      getObsScenes:()=>Promise<any>;
      obsAction:(value:string)=>Promise<any>;
      getMedia:()=>Promise<any>;
      addMedia:()=>Promise<any>;
      removeMedia:(id:string)=>Promise<any>;
      getGames:()=>Promise<any>;
      saveGames:(state:unknown)=>Promise<any>;
      spinWheel:()=>Promise<any>;
      pickGiveaway:()=>Promise<any>;
      getGifts:()=>Promise<any>;
      getAccessState:()=>Promise<any>;
      checkAccess:(tiktok:string)=>Promise<any>;
      founderLogin:(password:string)=>Promise<any>;
      founderChangePassword:(token:string,currentPassword:string,newPassword:string)=>Promise<any>;
      founderMembers:(token:string)=>Promise<any>;
      founderEnable:(token:string,tiktok:string,note:string)=>Promise<any>;
      founderRevoke:(token:string,tiktok:string)=>Promise<any>;
      onAccessStatus:(callback:(data:unknown)=>void)=>()=>void;
      onTikTokEvent:(callback:(event:LiveEvent)=>void)=>()=>void;
      onTikTokStatus:(callback:(status:LiveStatus)=>void)=>()=>void;
      onTikTokStats:(callback:(stats:LiveStats)=>void)=>()=>void;
      onTriggerAction:(callback:(action:TriggerAction)=>void)=>()=>void;
      onAnalytics:(callback:(data:unknown)=>void)=>()=>void;
      onObsStatus:(callback:(data:unknown)=>void)=>()=>void;
      onGifts:(callback:(data:unknown)=>void)=>()=>void;
    };
  }
}
