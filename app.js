const content = document.getElementById("content");

function showPlan() {
  content.innerHTML = `
    <h2>🎯 Lernplan</h2>
    <p>Dein Ziel:</p>
    <input placeholder="z.B. fließend Portugiesisch">
  `;
}

function showVocabulary() {
  content.innerHTML = `
    <h2>🧠 Wortschatz</h2>
    <p>Restaurant, Familie, Reisen …</p>
  `;
}

function showSpeaking() {
  content.innerHTML = `
    <h2>🗣 Sprechen</h2>
    <p>Como você está?</p>
    <input placeholder="Antwort hier">
  `;
}

function showGrammar() {
  content.innerHTML = `
    <h2>📘 Grammatik</h2>
    <input placeholder="Portugiesischen Satz eingeben">
  `;
}

function showTest() {
  content.innerHTML = `
    <h2>🔁 Wochen-Test</h2>
    <p>Test kommt hier rein</p>
  `;
}

showPlan();
