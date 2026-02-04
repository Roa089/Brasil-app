import { registerPack } from "../modules/content.js";

const BANK = {
  greet:["Oi","Olá","Bom dia","Boa tarde"],
  people:["eu","você","a gente"],
  weather:["calor","frio","chuva","sol"],
  food:["pizza","arroz","feijão","pão","café","água"],
  places:["aqui","lá","em casa","no trabalho"],
  verbs:["quero","preciso","gosto","vou"],
  times:["hoje","amanhã","agora","de manhã"]
};

const TEMPLATES = [
  {topic:"smalltalk",cefr:"A1",skill:"greeting",pt:()=>`${pick(BANK.greet)}, tudo bem?`,de:"Begrüßung"},
  {topic:"smalltalk",cefr:"A1",skill:"asking",pt:()=>`Você é daqui?`,de:"Herkunft"},
  {topic:"wetter",cefr:"A1",skill:"describing",pt:()=>`Hoje tá ${pick(BANK.weather)}.`,de:"Wetter"},
  {topic:"essen",cefr:"A1",skill:"asking",pt:()=>`${pick(BANK.verbs)} ${pick(BANK.food)}, por favor.`,de:"Bestellen"},
  {topic:"alltag",cefr:"A2",skill:"narrating",pt:()=>`${pick(BANK.times)} eu ${pick(BANK.verbs)} ficar ${pick(BANK.places)}.`,de:"Alltag erzählen"},
];

function pick(a){return a[Math.floor(Math.random()*a.length)];}

registerPack({
  key:"alltag_A1_A2",
  name:"Alltag A1–A2",
  enabledByDefault:true,
  BANK,
  TEMPLATES
});