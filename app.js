document.addEventListener("DOMContentLoaded", () => {
  // ---------- Einstellungen ----------
  const STORAGE_KEY = "brapp_v1_progress";
  const SETTINGS_KEY = "brapp_v1_settings";

  const DEFAULT_SETTINGS = {
    ttsEnabled: false,
    dailyNew: 25,
    dailyReview: 40,
    activeTopics: ["smalltalk", "wetter", "essen", "urlaub", "geschehnisse"]
  };

  // ---------- Daten: Monat 1 Input (viel, alltagsnah, BR) ----------
  // Hinweis: "pron" ist eine einfache Aussprachehilfe für Deutschsprecher (nicht IPA).
  // "tags" steuern Filter.
  const CARDS = [
    // --- Smalltalk Basics ---
    c("smalltalk_001", "Oi! Tudo bem?", "oi – TU-du béĩ", "Hi! Alles gut?", ["smalltalk","basis"]),
    c("smalltalk_002", "Tudo certo.", "TU-du SÉR-tu", "Alles in Ordnung.", ["smalltalk","basis"]),
    c("smalltalk_003", "E você?", "i vo-SÉ", "Und du?", ["smalltalk","basis"]),
    c("smalltalk_004", "Como você tá?", "KO-mu vo-SÉ tá", "Wie geht’s dir? (locker)", ["smalltalk","basis"]),
    c("smalltalk_005", "Tô bem, e você?", "to béĩ, i vo-SÉ", "Mir geht’s gut, und dir?", ["smalltalk","basis"]),
    c("smalltalk_006", "Mais ou menos.", "mais u MÉ-nus", "So mittel.", ["smalltalk","basis"]),
    c("smalltalk_007", "Tô cansado(a).", "to kan-SA-du/da", "Ich bin müde.", ["smalltalk","basis"]),
    c("smalltalk_008", "Que legal!", "ki le-GAU", "Wie cool!", ["smalltalk","basis"]),
    c("smalltalk_009", "Sério?", "SÉ-ri-u", "Echt?", ["smalltalk","basis"]),
    c("smalltalk_010", "Pois é…", "pois é", "Tja… / Genau…", ["smalltalk","basis"]),
    c("smalltalk_011", "Entendi.", "en-dji-DI", "Verstehe.", ["smalltalk","basis"]),
    c("smalltalk_012", "Faz sentido.", "fas sin-TI-du", "Macht Sinn.", ["smalltalk","basis"]),
    c("smalltalk_013", "Sem problema.", "sẽ pro-BLE-ma", "Kein Problem.", ["smalltalk","basis"]),
    c("smalltalk_014", "Tranquilo(a).", "tran-KWI-lu/la", "Alles entspannt.", ["smalltalk","basis"]),
    c("smalltalk_015", "Bora!", "BO-ra", "Los geht’s!", ["smalltalk","basis"]),
    c("smalltalk_016", "Vamos nessa!", "VA-mus NÉ-sa", "Auf geht’s!", ["smalltalk","basis"]),
    c("smalltalk_017", "Você é de onde?", "vo-SÉ é dji Õ-dji", "Woher kommst du?", ["smalltalk","basis"]),
    c("smalltalk_018", "Sou da Alemanha.", "sou da a-le-MÃ-nha", "Ich bin aus Deutschland.", ["smalltalk","basis"]),
    c("smalltalk_019", "Moro em [cidade].", "MO-ru ẽ [si-DA-dji]", "Ich wohne in [Stadt].", ["smalltalk","basis"]),
    c("smalltalk_020", "Você trabalha com o quê?", "vo-SÉ tra-BA-lha kõ u kê", "Womit arbeitest du?", ["smalltalk","basis"]),
    c("smalltalk_021", "Eu trabalho com [área].", "eu tra-BA-lhu kõ [A-re-a]", "Ich arbeite in [Bereich].", ["smalltalk","basis"]),
    c("smalltalk_022", "Tô aprendendo português.", "to a-pren-DEN-du por-tu-GÊS", "Ich lerne Portugiesisch.", ["smalltalk","basis"]),
    c("smalltalk_023", "Meu português ainda é básico.", "mêu por-tu-GÊS a-ĩn-da é BA-zi-ku", "Mein Portugiesisch ist noch basic.", ["smalltalk","basis"]),
    c("smalltalk_024", "Pode falar mais devagar?", "PO-dji fa-LAR mais dji-va-GAR", "Kannst du langsamer sprechen?", ["smalltalk","basis"]),
    c("smalltalk_025", "Pode repetir, por favor?", "PO-dji re-pe-TIR por fa-VOR", "Kannst du wiederholen?", ["smalltalk","basis"]),
    c("smalltalk_026", "Como se diz isso em português?", "KO-mu si DIZ i-su ẽ por-tu-GÊS", "Wie sagt man das auf Portugiesisch?", ["smalltalk","basis"]),
    c("smalltalk_027", "Qual é a melhor coisa aqui?", "kwau é a me-LHOR KÔi-za a-KI", "Was ist hier das Beste?", ["smalltalk","basis"]),
    c("smalltalk_028", "Tô chegando agora.", "to ʃe-GÃ-du a-GO-ra", "Ich bin gerade erst angekommen.", ["smalltalk","basis"]),
    c("smalltalk_029", "Faz tempo!", "fas TẼm-pu", "Lange nicht gesehen!", ["smalltalk","basis"]),
    c("smalltalk_030", "Que saudade!", "ki sau-DA-dji", "Ich hab dich vermisst!", ["smalltalk","basis"]),

    // --- Wetter ---
    c("wetter_001", "Hoje tá calor.", "HO-dji tá ka-LOR", "Heute ist es heiß.", ["wetter","basis"]),
    c("wetter_002", "Hoje tá frio.", "HO-dji tá FRI-u", "Heute ist es kalt.", ["wetter","basis"]),
    c("wetter_003", "Tá abafado.", "tá a-fa-BA-du", "Schwül.", ["wetter","basis"]),
    c("wetter_004", "Tá ventando.", "tá ven-TÃ-du", "Es ist windig.", ["wetter","basis"]),
    c("wetter_005", "Tá chovendo.", "tá ʃo-VEN-du", "Es regnet.", ["wetter","basis"]),
    c("wetter_006", "Vai chover mais tarde.", "vai ʃo-VER mais TAR-dji", "Später wird’s regnen.", ["wetter","basis"]),
    c("wetter_007", "O tempo tá mudando.", "u TẼm-pu tá mu-DÃ-du", "Das Wetter ändert sich.", ["wetter","basis"]),
    c("wetter_008", "Tá nublado.", "tá nu-BLA-du", "Bewölkt.", ["wetter","basis"]),
    c("wetter_009", "Tá ensolarado.", "tá en-so-la-RA-du", "Sonnig.", ["wetter","basis"]),
    c("wetter_010", "A previsão é de chuva.", "a pre-vi-ZÃ-u é dji ʃu-va", "Vorhersage: Regen.", ["wetter","basis"]),
    c("wetter_011", "Qual a previsão pra amanhã?", "kwau a pre-vi-ZÃ-u pra a-mã-NHÃ", "Wie ist die Vorhersage für morgen?", ["wetter","basis"]),
    c("wetter_012", "Tá fazendo uns 25 graus.", "tá fa-ZEN-du ũs vin-ti-SIĨn-ku graus", "So um die 25 Grad.", ["wetter","basis"]),
    c("wetter_013", "De noite esfria.", "dji NOi-tchi es-FRI-a", "Abends kühlt es ab.", ["wetter","basis"]),
    c("wetter_014", "Chuva do nada.", "ʃu-va du NA-da", "Plötzlicher Regen.", ["wetter","basis"]),
    c("wetter_015", "Leva um casaco.", "LE-va ũ ka-SA-ku", "Nimm eine Jacke mit.", ["wetter","basis"]),
    c("wetter_016", "Tá um clima gostoso.", "tá ũ KLI-ma gos-TO-zu", "Angenehmes Klima.", ["wetter","basis"]),
    c("wetter_017", "Tá um calorão!", "tá ũ ka-lo-RÃ-u", "Riesige Hitze!", ["wetter","basis"]),
    c("wetter_018", "Tá garoando.", "tá ga-ro-Ã-du", "Es nieselt.", ["wetter","basis"]),
    c("wetter_019", "A chuva tá forte.", "a ʃu-va tá FOR-tchi", "Starker Regen.", ["wetter","basis"]),
    c("wetter_020", "Tá dando trovão.", "tá DÃ-du tro-VÃ-u", "Es donnert.", ["wetter","basis"]),

    // --- Essen/Trinken ---
    c("essen_001", "Tô com fome.", "to kõ FO-mi", "Ich habe Hunger.", ["essen","basis"]),
    c("essen_002", "Tô com sede.", "to kõ SE-dji", "Ich habe Durst.", ["essen","basis"]),
    c("essen_003", "Vamos comer alguma coisa?", "VA-mus ko-MER au-GU-ma KÔi-za", "Wollen wir was essen?", ["essen","basis"]),
    c("essen_004", "O que você recomenda?", "u kê vo-SÉ re-ko-MEN-da", "Was empfiehlst du?", ["essen","basis"]),
    c("essen_005", "Eu queria um café, por favor.", "eu ki-RI-a ũ ka-FÉ por fa-VOR", "Ich hätte gern einen Kaffee.", ["essen","basis"]),
    c("essen_006", "Sem açúcar, por favor.", "sẽ a-SU-kar", "Ohne Zucker.", ["essen","basis"]),
    c("essen_007", "Com gelo / sem gelo.", "kõ DZE-lu / sẽ DZE-lu", "Mit Eis / ohne Eis.", ["essen","basis"]),
    c("essen_008", "Bem passado / ao ponto.", "bẽ pa-SA-du / au PÕn-tu", "Durch / medium.", ["essen","basis"]),
    c("essen_009", "Pode ser.", "PO-dji SER", "Kann so sein / passt.", ["essen","basis"]),
    c("essen_010", "Capricha!", "ka-PRI-ʃa", "Mach ordentlich! (umgangssprachlich)", ["essen","basis"]),
    c("essen_011", "Tá uma delícia.", "tá u-ma dji-LI-si-a", "Es ist mega lecker.", ["essen","basis"]),
    c("essen_012", "Tá bom demais!", "tá bõ dji-MAIS", "Viel zu gut!", ["essen","basis"]),
    c("essen_013", "Eu sou alérgico(a) a [X].", "eu sou a-LÉR-dji-ku/ka a", "Ich bin allergisch gegen [X].", ["essen","basis"]),
    c("essen_014", "Sem pimenta, por favor.", "sẽ pi-MEN-ta", "Ohne Chili.", ["essen","basis"]),
    c("essen_015", "Só um pouquinho.", "só ũ pou-KI-nhu", "Nur ein bisschen.", ["essen","basis"]),
    c("essen_016", "Mais um, por favor.", "mais ũ", "Noch eins, bitte.", ["essen","basis"]),
    c("essen_017", "A conta, por favor.", "a KÕn-ta", "Die Rechnung, bitte.", ["essen","basis"]),
    c("essen_018", "Pode dividir a conta?", "PO-dji dji-vi-DIR a KÕn-ta", "Können wir getrennt zahlen?", ["essen","basis"]),
    c("essen_019", "Cartão ou dinheiro?", "kar-TÃ-u ou dji-NHEi-ru", "Karte oder bar?", ["essen","basis"]),
    c("essen_020", "É pra viagem.", "é pra vi-A-GẼĩ", "Zum Mitnehmen.", ["essen","basis"]),
    c("essen_021", "É pra comer aqui.", "é pra ko-MER a-KI", "Hier essen.", ["essen","basis"]),
    c("essen_022", "Tem opção vegetariana?", "tẽ o-psi-Ã-u ve-dje-ta-ri-A-na", "Gibt’s vegetarisch?", ["essen","basis"]),
    c("essen_023", "Qual é o prato do dia?", "kwau é u PRA-tu du Dji-a", "Was ist das Tagesgericht?", ["essen","basis"]),
    c("essen_024", "Pode tirar a cebola?", "PO-dji ti-RAR a se-BO-la", "Kannst du die Zwiebel weglassen?", ["essen","basis"]),
    c("essen_025", "Eu quero água com gás.", "eu KÉ-ru A-gwa kõ GAS", "Sprudelwasser.", ["essen","basis"]),
    c("essen_026", "Eu quero água sem gás.", "… sẽ GAS", "Stilles Wasser.", ["essen","basis"]),
    c("essen_027", "Um suco de laranja.", "ũ SU-ku dji la-RÃn-ja", "Orangensaft.", ["essen","basis"]),
    c("essen_028", "Uma cerveja, por favor.", "u-ma ser-VE-ja", "Ein Bier, bitte.", ["essen","basis"]),
    c("essen_029", "Sem álcool.", "sẽ AL-ku-ol", "Ohne Alkohol.", ["essen","basis"]),
    c("essen_030", "Tá muito salgado/doce.", "tá MUI-tu sal-GA-du/DO-si", "Zu salzig/süß.", ["essen","basis"]),

    // --- Urlaub/Reisen ---
    c("urlaub_001", "Tô de férias.", "to dji FÉ-ri-as", "Ich habe Urlaub.", ["urlaub","basis"]),
    c("urlaub_002", "Cheguei ontem.", "ʃe-GUEi Õn-tẽ", "Ich bin gestern angekommen.", ["urlaub","basis"]),
    c("urlaub_003", "Vou ficar uma semana.", "vou fi-KAR u-ma se-MA-na", "Ich bleibe eine Woche.", ["urlaub","basis"]),
    c("urlaub_004", "Qual é a melhor praia?", "kwau é a me-LHOR PRA-ia", "Was ist der beste Strand?", ["urlaub","basis"]),
    c("urlaub_005", "Como eu chego lá?", "KO-mu eu ʃe-gu LA", "Wie komme ich dahin?", ["urlaub","basis"]),
    c("urlaub_006", "É longe daqui?", "é LÕn-dji da-KI", "Ist es weit von hier?", ["urlaub","basis"]),
    c("urlaub_007", "Dá pra ir a pé?", "da pra ir a PÉ", "Kann man zu Fuß gehen?", ["urlaub","basis"]),
    c("urlaub_008", "Onde fica o banheiro?", "Õn-dji FI-ka u ba-NHEi-ru", "Wo ist die Toilette?", ["urlaub","basis"]),
    c("urlaub_009", "Você pode me ajudar?", "vo-SÉ PO-dji mi a-ju-DAR", "Kannst du mir helfen?", ["urlaub","basis"]),
    c("urlaub_010", "Tô procurando um hotel.", "to pro-ku-RÃn-du ũ o-TÉL", "Ich suche ein Hotel.", ["urlaub","basis"]),
    c("urlaub_011", "Tem vaga?", "tẽ VA-ga", "Haben Sie frei?", ["urlaub","basis"]),
    c("urlaub_012", "Eu fiz uma reserva.", "eu FIZ u-ma re-ZER-va", "Ich habe reserviert.", ["urlaub","basis"]),
    c("urlaub_013", "Qual é a senha do Wi-Fi?", "kwau é a SẼ-nha du uai-FAI", "Wi-Fi Passwort?", ["urlaub","basis"]),
    c("urlaub_014", "Que horas abre/fecha?", "ki O-ras A-bri/FE-ʃa", "Wann öffnet/schließt es?", ["urlaub","basis"]),
    c("urlaub_015", "Quanto custa?", "KWÃn-tu KUS-ta", "Wie viel kostet es?", ["urlaub","basis"]),
    c("urlaub_016", "Tá caro.", "tá KA-ru", "Das ist teuer.", ["urlaub","basis"]),
    c("urlaub_017", "Tem desconto?", "tẽ djiʃ-KÕn-tu", "Gibt’s Rabatt?", ["urlaub","basis"]),
    c("urlaub_018", "Só tô olhando.", "só to o-LHÃn-du", "Ich schaue nur.", ["urlaub","basis"]),
    c("urlaub_019", "Pode tirar uma foto pra mim?", "PO-dji ti-RAR u-ma FO-tu", "Kannst du ein Foto machen?", ["urlaub","basis"]),
    c("urlaub_020", "Ficou ótimo!", "fi-KOU O-ti-mu", "Ist super geworden!", ["urlaub","basis"]),

    // --- Geschehnisse / Alltag / Pläne ---
    c("ges_001", "E aí, o que rolou?", "i a-I, u kê ho-LOU", "Was ist passiert? (locker)", ["geschehnisse","basis"]),
    c("ges_002", "Nada demais.", "NA-da dji-MAIS", "Nichts Besonderes.", ["geschehnisse","basis"]),
    c("ges_003", "Aconteceu uma coisa engraçada.", "a-kon-te-SEU u-ma KÔi-za en-gra-SA-da", "Etwas Lustiges ist passiert.", ["geschehnisse","basis"]),
    c("ges_004", "Foi corrido hoje.", "foi ko-RI-du HO-dji", "Heute war’s stressig.", ["geschehnisse","basis"]),
    c("ges_005", "Tô sem tempo.", "to sẽ TẼm-pu", "Ich hab keine Zeit.", ["geschehnisse","basis"]),
    c("ges_006", "Vamos marcar alguma coisa.", "VA-mus mar-KAR au-GU-ma KÔi-za", "Lass uns was ausmachen.", ["geschehnisse","basis"]),
    c("ges_007", "Você topa amanhã?", "vo-SÉ TO-pa a-mã-NHÃ", "Hast du morgen Lust?", ["geschehnisse","basis"]),
    c("ges_008", "Pra mim tá ótimo.", "pra mĩ tá O-ti-mu", "Für mich passt’s super.", ["geschehnisse","basis"]),
    c("ges_009", "Que horas?", "ki O-ras", "Um wie viel Uhr?", ["geschehnisse","basis"]),
    c("ges_010", "Umas oito.", "u-mas Oi-tu", "So gegen acht.", ["geschehnisse","basis"]),
    c("ges_011", "Tô a caminho.", "to a ka-MI-nhu", "Ich bin unterwegs.", ["geschehnisse","basis"]),
    c("ges_012", "Já tô chegando.", "ja to ʃe-GÃn-du", "Bin gleich da.", ["geschehnisse","basis"]),
    c("ges_013", "Deu tudo certo.", "dêu TU-du SÉR-tu", "Hat alles geklappt.", ["geschehnisse","basis"]),
    c("ges_014", "Deu ruim.", "dêu RUĩ", "Lief schief. (sehr umgangssprachlich)", ["geschehnisse","basis"]),
    c("ges_015", "Que pena.", "ki PÊ-na", "Schade.", ["geschehnisse","basis"]),
    c("ges_016", "Que bom!", "ki bõ", "Wie schön!", ["geschehnisse","basis"]),
    c("ges_017", "Tô animado(a).", "to a-ni-MA-du/da", "Ich bin motiviert/gehyped.", ["geschehnisse","basis"]),
    c("ges_018", "Tô de boa.", "to dji BO-a", "Mir geht’s entspannt.", ["geschehnisse","basis"]),
    c("ges_019", "Bateu um cansaço.", "ba-TEU ũ kan-SA-su", "Plötzlich müde geworden.", ["geschehnisse","basis"]),
    c("ges_020", "Vamos ver.", "VA-mus VER", "Mal sehen.", ["geschehnisse","basis"]),

    // --- Mehr „sprechfertige“ Muster/Varianten (Input-Boost) ---
    c("boost_001", "Na real, eu acho que…", "na he-AL eu A-ʃu ki", "Ehrlich: ich denke, dass…", ["smalltalk","boost"]),
    c("boost_002", "Tipo assim…", "TI-pu a-Sĩ", "So ungefähr…", ["smalltalk","boost"]),
    c("boost_003", "Então…", "en-TÃ-u", "Also…", ["smalltalk","boost"]),
    c("boost_004", "Aliás…", "a-li-ÁS", "Übrigens…", ["smalltalk","boost"]),
    c("boost_005", "Deixa eu ver…", "DEi-ʃa eu VER", "Lass mich kurz überlegen…", ["smalltalk","boost"]),
    c("boost_006", "Eu curto [X].", "eu KUR-tu", "Ich mag [X]. (locker)", ["smalltalk","boost"]),
    c("boost_007", "Eu não curto muito [X].", "eu nõ KUR-tu MUI-tu", "Ich mag [X] nicht so.", ["smalltalk","boost"]),
    c("boost_008", "Qual foi a melhor parte?", "kwau foi a me-LHOR PAR-tchi", "Was war der beste Teil?", ["geschehnisse","boost"]),
    c("boost_009", "No fim das contas…", "nu fĩ das KÕn-tas", "Am Ende des Tages…", ["geschehnisse","boost"]),
    c("boost_010", "Tava pensando em…", "TA-va pen-SÃn-du ẽ", "Ich hab überlegt…", ["geschehnisse","boost"]),

    // --- Mini-Dialog Startkarten (für Rollenspiel) ---
    c("dialog_001", "— Tudo bem? — Tudo, e você?", "TU-du béĩ / TU-du", "— Alles gut? — Ja, und bei dir?", ["smalltalk","dialog"]),
    c("dialog_002", "— Bora tomar um café? — Bora!", "BO-ra to-MAR ũ ka-FÉ", "— Kaffee? — Los!", ["essen","dialog"]),
    c("dialog_003", "— Vai chover? — Acho que sim.", "vai ʃo-VER / A-ʃu ki sĩ", "— Regnet’s? — Ich glaube ja.", ["wetter","dialog"]),
    c("dialog_004", "— O que você recomenda? — O prato do dia.", "re-ko-MEN-da / PRA-tu", "— Empfehlung? — Tagesgericht.", ["essen","dialog"]),
    c("dialog_005", "— Como chega na praia? — Vai reto e vira à direita.", "vai HE-tu / VI-ra a dji-REi-ta", "— Wie zum Strand? — Geradeaus, rechts.", ["urlaub","dialog"]),
  ];

  // ---------- Plan Monat 1 (viel Input, klare Wochenfokusse) ----------
  const MONTH1 = [
    {
      week: 1,
      title: "Smalltalk-Basis + Wetter + Essen (Start-Flüssigkeit)",
      focus: ["smalltalk","wetter","essen"],
      goals: [
        "20–30 Standard-Sätze automatisch können (ohne nachdenken)",
        "Wetter & Gefühle in 2–3 Sätzen beschreiben",
        "Bestellen/bitten/danken ohne Stocken"
      ],
      drills: [
        "3× pro Tag: 60 Sekunden „Tudo bem?“-Mini-Dialog (du antwortest, Variante wählen)",
        "Wetter-Update: 3 Sätze (hoje/amanhã/noite)",
        "Im Kopf: 10× „Eu queria… / Tem…? / A conta…“"
      ]
    },
    {
      week: 2,
      title: "Urlaub/Bewegen + Essen vertiefen (Unterwegs reden)",
      focus: ["urlaub","essen"],
      goals: ["Fragen stellen: wo/wie/was kostet/wann",
        "„Dá pra…?“ & „Como eu chego…?“ sicher",
        "Mini-Smalltalk in Situationen (Hotel, Café, Strand)"
      ],
      drills: [
        "Roleplay: Hotel-Check-in (5 Runden)",
        "Route erklären: reto/direita/esquerda (kurz & klar)",
        "Bestellen + Sonderwünsche (sem…/com…/pouquinho)"
      ]
    },
    {
      week: 3,
      title: "Geschehnisse + Pläne + Verabreden (Alltag echt)",
      focus: ["geschehnisse","smalltalk"],
      goals: [
        "Kurz erzählen: was war heute los (2–4 Sätze)",
        "Verabreden: morgen/um acht/ich bin gleich da",
        "Reaktionen: sério?/que legal!/pois é…"
      ],
      drills: [
        "„E aí, o que rolou?“ → 3 Antworten (kurz/mittel/lang)",
        "Plan machen: „Vamos marcar…“ mit Uhrzeit & Ort",
        "„Deu certo / deu ruim“ im Kontext"
      ]
    },
    {
      week: 4,
      title: "Varianten, Natürlichkeit & freies Erzählen",
  focus: ["smalltalk","boost","dialog","wetter","essen","urlaub","geschehnisse"],
  goals: [
    "Nicht mehr nur Standardsätze, sondern Varianten bilden",
    "Klingt natürlicher (brasilianischer)",
    "Kurz erzählen: gestern / heute / gleich",
    "Mini-Gespräche ohne Stocken führen"
  ],
  drills: [
    "Jeden Tag 3 Dialogkarten laut sprechen",
    "Aus einem Satz 2 Varianten bauen",
    "Täglicher Mini-Bericht: Was habe ich heute gemacht?",
    "Smalltalk-Ketten: Frage → Antwort → Rückfrage"
  ]
}
