{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fnil\fcharset0 HelveticaNeue;}
{\colortbl;\red255\green255\blue255;\red255\green255\blue255;}
{\*\expandedcolortbl;;\cspthree\c100000\c100000\c100000;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f0\fs26 \cf2 const content = document.getElementById("content");\
\
function showPlan() \{\
  content.innerHTML = `\
    <h2>\uc0\u55356 \u57263  Lernplan</h2>\
    <p>Dein Ziel:</p>\
    <input placeholder="z.B. flie\'dfend Portugiesisch">\
  `;\
\}\
\
function showVocabulary() \{\
  content.innerHTML = `\
    <h2>\uc0\u55358 \u56800  Wortschatz</h2>\
    <p>Restaurant, Familie, Reisen \'85</p>\
  `;\
\}\
\
function showSpeaking() \{\
  content.innerHTML = `\
    <h2>\uc0\u55357 \u56803  Sprechen</h2>\
    <p>Como voc\'ea est\'e1?</p>\
    <input placeholder="Antwort hier">\
  `;\
\}\
\
function showGrammar() \{\
  content.innerHTML = `\
    <h2>\uc0\u55357 \u56536  Grammatik</h2>\
    <input placeholder="Portugiesischen Satz eingeben">\
  `;\
\}\
\
function showTest() \{\
  content.innerHTML = `\
    <h2>\uc0\u55357 \u56577  Wochen-Test</h2>\
    <p>Test kommt hier rein</p>\
  `;\
\}\
\
showPlan();}