import { registerPack } from "../modules/content.js";

const BANK = {
  formalOpen:["Prezado senhor","Prezada senhora","Gostaria de informar"],
  verbs:["solicitar","confirmar","esclarecer"],
  objects:["o agendamento","o contrato","o procedimento"],
  closes:["Atenciosamente","Agradeço desde já"]
};

const TEMPLATES = [
  {topic:"formal",cefr:"C1",skill:"formal",pt:()=>`${pick(BANK.formalOpen)}, venho ${pick(BANK.verbs)} ${pick(BANK.objects)}.`,de:"Formell schreiben"},
  {topic:"formal",cefr:"C1",skill:"formal",pt:()=>`${pick(BANK.closes)}.`,de:"Grußformel"}
];

function pick(a){return a[Math.floor(Math.random()*a.length)];}

registerPack({
  key:"formal_C1",
  name:"Formal C1",
  enabledByDefault:false,
  BANK,
  TEMPLATES
});