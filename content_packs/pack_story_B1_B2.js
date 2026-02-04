import { registerPack } from "../modules/content.js";

const BANK = {
  time:["ontem","na semana passada","no fim de semana"],
  feelings:["feliz","cansado","preocupado","animado"],
  actions:["viajei","trabalhei","conheci pessoas","resolvi um problema"],
  connectors:["porque","então","por isso"]
};

const TEMPLATES = [
  {topic:"story",cefr:"B1",skill:"narrating",pt:()=>`${pick(BANK.time)} eu ${pick(BANK.actions)}.`,de:"Vergangenheit"},
  {topic:"story",cefr:"B1",skill:"describing",pt:()=>`Eu fiquei ${pick(BANK.feelings)}.`,de:"Gefühl"},
  {topic:"story",cefr:"B2",skill:"opinion",pt:()=>`${pick(BANK.connectors)} isso foi importante pra mim.`,de:"Reflexion"}
];

function pick(a){return a[Math.floor(Math.random()*a.length)];}

registerPack({
  key:"story_B1_B2",
  name:"Stories B1–B2",
  enabledByDefault:true,
  BANK,
  TEMPLATES
});