const noop=()=>{};
const resolved=(value:any)=>Promise.resolve(value);

export function ensureAndroidNexoraBridge(){
  if(typeof window==='undefined'||(window as any).nexora)return;

  const emptyAnalytics={startedAt:Date.now(),events:0,comments:0,likes:0,gifts:0,follows:0,shares:0,viewersPeak:0,giftCoins:0};
  const defaultSettings={activeProfileId:'default',overlayPort:18181,obsWsUrl:'ws://127.0.0.1:4455',obsPassword:''};
  const defaultProfile={id:'default',name:'Profil principal',triggers:[]};
  const defaultOverlay={template:'neon',accent:'#8b7cff',textColor:'#ffffff',background:'rgba(10,13,20,.88)',fontSize:32,duration:5000,position:'center',animation:'pop',goalLabel:'Objectif',goalCurrent:35,goalTarget:100,eventRules:{gift:{enabled:true,template:'gift'},comment:{enabled:true,template:'chat'},like:{enabled:false,template:'minimal'},follow:{enabled:true,template:'neon'},share:{enabled:true,template:'glass'}}};
  const emptyGames={wheel:['Rose','GG','Merci'],giveaway:[],poll:{question:'',options:['Oui','Non'],votes:{}}};

  (window as any).nexora={
    connectTikTok:()=>resolved({ok:false,error:'Connexion TikTok disponible depuis la version PC.'}),
    disconnectTikTok:()=>resolved(true),
    getProfiles:()=>resolved({profiles:[defaultProfile],settings:defaultSettings}),
    saveProfiles:()=>resolved(true),
    getAnalytics:()=>resolved(emptyAnalytics),
    resetAnalytics:()=>resolved(emptyAnalytics),
    getOverlayUrl:()=>resolved(''),
    testOverlay:()=>resolved(true),
    getOverlayConfig:()=>resolved(defaultOverlay),
    saveOverlayConfig:(config:any)=>resolved(config),
    previewOverlay:()=>resolved(true),
    previewMatchScene:()=>resolved(true),
    exportMatchScene:()=>resolved({ok:false,error:'Export vidéo disponible depuis la version PC.'}),
    getMobileInfo:()=>resolved(null),
    getMobileQr:()=>resolved(''),
    openExternal:()=>resolved(false),
    launch:()=>resolved(false),
    hotkey:()=>resolved(false),
    mouse:()=>resolved(false),
    connectObs:()=>resolved(false),
    disconnectObs:()=>resolved(true),
    getObsScenes:()=>resolved([]),
    obsAction:()=>resolved(false),
    getMedia:()=>resolved([]),
    addMedia:()=>resolved(null),
    removeMedia:()=>resolved([]),
    getGames:()=>resolved(emptyGames),
    saveGames:()=>resolved(true),
    spinWheel:()=>resolved(null),
    pickGiveaway:()=>resolved(null),
    getGifts:()=>resolved([]),
    getAccessState:()=>resolved({allowed:false}),
    checkAccess:()=>resolved({allowed:false,error:'Vérification agence disponible depuis la version PC.'}),
    founderLogin:()=>Promise.reject(new Error('Fonctions fondateur disponibles depuis la version PC.')),
    founderChangePassword:()=>Promise.reject(new Error('Fonctions fondateur disponibles depuis la version PC.')),
    founderMembers:()=>resolved([]),
    founderEnable:()=>Promise.reject(new Error('Fonctions fondateur disponibles depuis la version PC.')),
    founderRevoke:()=>Promise.reject(new Error('Fonctions fondateur disponibles depuis la version PC.')),
    onAccessStatus:()=>noop,
    onTikTokEvent:()=>noop,
    onTikTokStatus:()=>noop,
    onTikTokStats:()=>noop,
    onTriggerAction:()=>noop,
    onAnalytics:()=>noop,
    onObsStatus:()=>noop,
    onGifts:()=>noop
  };
}
