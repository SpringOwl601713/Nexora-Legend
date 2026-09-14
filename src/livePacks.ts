export type LivePackSceneId='intro'|'versus'|'background'|'score'|'mvp'|'victory'|'defeat'|'outro';
export type LivePack={id:string;name:string;description:string;free:boolean;accent:string;secondary:string;scenes:{id:LivePackSceneId;name:string;description:string}[]};

export const freeLivePacks:LivePack[]=[
  {
    id:'nexora-arena',
    name:'Nexora Arena',
    description:'Pack match complet gratuit avec intro, VS, fond animé, score, MVP, victoire, défaite et outro.',
    free:true,
    accent:'#8b7cff',
    secondary:'#ff5f8f',
    scenes:[
      {id:'intro',name:'Intro Match',description:'Entrée animée avant le match'},
      {id:'versus',name:'Écran VS',description:'Affiche les deux joueurs/équipes'},
      {id:'background',name:'Fond animé',description:'Fond dynamique pour le live'},
      {id:'score',name:'Score',description:'HUD score en direct'},
      {id:'mvp',name:'MVP',description:'Écran meilleur joueur/supporter'},
      {id:'victory',name:'Victoire',description:'Animation de victoire'},
      {id:'defeat',name:'Défaite',description:'Animation de défaite'},
      {id:'outro',name:'Outro',description:'Fin de match / remerciements'}
    ]
  }
];
