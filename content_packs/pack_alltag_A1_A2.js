// content_packs/pack_alltag_A1_A2.js

const pack = {
  name: "alltag_a1_a2",
  title: "Alltag A1–A2",
  description: "Grundlegender Alltag, Smalltalk, Essen, Wetter, Einkaufen, Verkehr",
  cefrRange: ["A1", "A2"],
  topics: ["smalltalk", "wetter", "essen", "einkaufen", "verkehr"],

  bank: {
    starters: ["Oi", "E aí", "Tudo bem?", "Então", "Olha"],
    weather: ["tá quente", "tá frio", "tá chovendo", "tá ensolarado"],
    food: ["um café", "um pão de queijo", "uma água", "uma coxinha"],
    places: ["no supermercado", "na padaria", "na rua", "em casa"],
    // ...
  },

  templates: [
    {
      topic: "smalltalk", cefr: "A1", skill: "greeting",
      pt: () => `${pick(BANK.starters)}, tudo bem?`,
      de: "Begrüßung locker",
      forms: ["E aí, tranquilo?", "Oi, beleza?"]
    },
    {
      topic: "wetter", cefr: "A1", skill: "describing",
      pt: () => `Hoje tá ${pick(BANK.weather)}.`,
      de: "Wetter heute",
      forms: ["Tá muito calor hoje.", "Está chovendo bastante."]
    },
    {
      topic: "essen", cefr: "A2", skill: "asking",
      pt: () => `Você quer ${pick(BANK.food)}?`,
      de: "Essen anbieten/fragen",
    },
    // 30–50 weitere Templates pro Pack
  ]
};

window.ContentModule?.registerContentPack?.(pack);
