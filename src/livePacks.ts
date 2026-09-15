export type LivePackSceneId='intro'|'versus'|'background'|'score'|'mvp'|'victory'|'defeat'|'outro';
export type LivePack={id:string;name:string;description:string;free:boolean;accent:string;secondary:string;scenes:{id:LivePackSceneId;name:string;description:string}[]};

const matchScenes=(names:Partial<Record<LivePackSceneId,string>>={}):LivePack['scenes']=>[
  {id:'intro',name:names.intro||'Intro Match',description:'Entrée animée avant le match'},
  {id:'versus',name:names.versus||'Écran VS',description:'Affiche les deux joueurs/équipes'},
  {id:'background',name:names.background||'Fond animé',description:'Fond dynamique pour le live'},
  {id:'score',name:names.score||'Score',description:'HUD score en direct'},
  {id:'mvp',name:names.mvp||'MVP',description:'Écran meilleur joueur/supporter'},
  {id:'victory',name:names.victory||'Victoire',description:'Animation de victoire'},
  {id:'defeat',name:names.defeat||'Défaite',description:'Animation de défaite'},
  {id:'outro',name:names.outro||'Outro',description:'Fin de match / remerciements'}
];

export const freeLivePacks:LivePack[]=[
  {
    id:'nexora-arena',
    name:'Nexora Arena',
    description:'Pack match complet gratuit avec intro, VS, fond animé, score, MVP, victoire, défaite et outro.',
    free:true,
    accent:'#8b7cff',
    secondary:'#ff5f8f',
    scenes:matchScenes()
  },
  {
    id:'neon-rivals',
    name:'Neon Rivals',
    description:'Ambiance cyber néon pour duels rapides, battles et défis en direct.',
    free:true,
    accent:'#00e5ff',
    secondary:'#ff3df2',
    scenes:matchScenes({intro:'Neon Intro',versus:'Neon VS',background:'Cyber Grid',score:'Neon Score',victory:'Neon Victory',defeat:'Neon Defeat'})
  },
  {
    id:'royal-clash',
    name:'Royal Clash',
    description:'Style premium doré et sombre pour matchs, classements et finales.',
    free:true,
    accent:'#f2c14e',
    secondary:'#8b5cf6',
    scenes:matchScenes({intro:'Royal Opening',versus:'Royal Duel',background:'Royal Stage',score:'Crown Score',mvp:'Royal MVP',victory:'Champion',defeat:'Defeat'})
  },
  {
    id:'pulse-storm',
    name:'Pulse Storm',
    description:'Pack énergique inspiré des compétitions e-sport avec effets électriques.',
    free:true,
    accent:'#39ff88',
    secondary:'#4d6bff',
    scenes:matchScenes({intro:'Storm Intro',versus:'Battle Charge',background:'Pulse Field',score:'Pulse Score',mvp:'Top Player',victory:'Storm Win',defeat:'Reset'})
  }
];
