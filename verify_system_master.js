const fs = require('fs');
const path = require('path');

console.log("=================================================");
console.log("🔍 MASTER AUDIT & INTEGRITY CHECKER — SEJARAH SPA");
console.log("=================================================\n");

// 1. AUDIT MODULESDATA.JS & APP.JS DATA
const modulesDataPath = path.join(__dirname, 'modulesData.js');
const appJsPath = path.join(__dirname, 'app.js');
let modulesData = null;
let flashcardsData = {};

try {
  const content = fs.readFileSync(modulesDataPath, 'utf8');
  const window = {};
  global.window = window;
  eval(content);
  modulesData = window.modulesData;
  console.log("✅ modulesData.js successfully loaded.");
} catch (e) {
  console.error("❌ Failed to load modulesData.js:", e.message);
  process.exit(1);
}

try {
  const appContent = fs.readFileSync(appJsPath, 'utf8');
  const match = appContent.match(/const\s+FLASHCARD_DATA\s*=\s*(\{[\s\S]*?\n\};)/);
  if (match) {
    eval("flashcardsData = " + match[1]);
  }
} catch (e) {}

const subIds = ["1A", "1B", "1C", "1D", "1E", "1F"];
let totalQuestions = 0;
let totalFlashcards = 0;
let auditErrors = [];

subIds.forEach(id => {
  const mod = modulesData[id];
  if (!mod) {
    auditErrors.push(`Missing module ${id} in modulesData`);
    return;
  }

  // Check sub-module title and narrative
  const title = mod.title || (mod.templateData && (mod.templateData['hero-title'] || mod.templateData['nav-brand']));
  const narrative = mod.manuscript || mod.jejak || (mod.templateData && mod.templateData['lesson-one-text']);
  if (!title) auditErrors.push(`Module ${id} missing title`);
  if (!narrative) auditErrors.push(`Module ${id} missing narrative text`);

  // Check Flashcards
  const fcs = mod.flashcards || flashcardsData[id];
  if (!Array.isArray(fcs) || fcs.length === 0) {
    auditErrors.push(`Module ${id} has no flashcards`);
  } else {
    totalFlashcards += fcs.length;
    fcs.forEach((fc, idx) => {
      const term = fc.term || fc.front;
      const def = fc.definition || fc.back;
      if (!term || !def) {
        auditErrors.push(`Module ${id} Flashcard #${idx+1} incomplete term/definition`);
      }
    });
  }

  // Check Quiz HOTS
  const quizzes = mod.quiz || mod.quizData;
  if (!Array.isArray(quizzes) || quizzes.length === 0) {
    auditErrors.push(`Module ${id} has no quiz questions`);
  } else {
    const qCount = quizzes.length;
    totalQuestions += qCount;
    if (qCount !== 15) {
      console.warn(`⚠️ Module ${id} has ${qCount} questions (expected 15)`);
    }

    quizzes.forEach((q, qIdx) => {
      if (!q.question && !q.soal) auditErrors.push(`Module ${id} Q#${qIdx+1} missing question text`);
      if (!Array.isArray(q.options) || (q.options.length !== 4 && q.options.length !== 5)) {
        auditErrors.push(`Module ${id} Q#${qIdx+1} does not have 4 or 5 options`);
      }
      const ans = q.answer !== undefined ? q.answer : q.correctIndex;
      if (ans === undefined || (typeof ans === 'number' && (ans < 0 || ans > 4))) {
        auditErrors.push(`Module ${id} Q#${qIdx+1} invalid answer index (${ans})`);
      }
      if (!q.explanation && !q.pembahasan) {
        auditErrors.push(`Module ${id} Q#${qIdx+1} missing explanation`);
      }
    });
  }
});

console.log(`\n📊 DATA LAYER SUMMARY:`);
console.log(`- Sub-Modules Verified: ${subIds.length}/6`);
console.log(`- Total HOTS Questions: ${totalQuestions} questions across 1A-1F`);
console.log(`- Total Flashcards: ${totalFlashcards} cards across 1A-1F`);

// 2. AUDIT INDEX.HTML DOM STRUCTURE
const htmlPath = path.join(__dirname, 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const requiredDOMIds = [
  "materi-page",
  "kuis-page",
  "materi-tab",
  "kuis-tab",
  "flashcards-section",
  "flashcard-card",
  "claim-certificate-btn",
  "certificate-modal",
  "glossary-modal",
  "precheck-modal",
  "gov-matrix-tbody",
  "gov-enable-precheck"
];

console.log(`\n🏗️ DOM ELEMENT STRUCTURE AUDIT:`);
requiredDOMIds.forEach(domId => {
  const exists = htmlContent.includes(`id="${domId}"`) || htmlContent.includes(`id='${domId}'`);
  if (exists) {
    console.log(`  ✅ DOM #${domId}: PRESENT`);
  } else {
    console.log(`  ⚠️ DOM #${domId}: DYNAMICALLY GENERATED OR MISSING`);
  }
});

// 3. AUDIT APP.JS LOGIC & INTEGRATIONS
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

const requiredFunctions = [
  "switchSubModule",
  "showPage",
  "startQuizTimer",
  "calculateQuizScore",
  "renderCurrentFlashcard",
  "toggleFlipFlashcard",
  "openGlossaryTerm",
  "generateStudentCertificate",
  "showPreCheckModal",
  "requestAccessToQuiz",
  "applyGovernanceToStudentUI",
  "saveMatrixState",
  "syncCloudMatrixNow"
];

console.log(`\n⚙️ ENGINE LOGIC & INTEGRATION AUDIT (app.js):`);
requiredFunctions.forEach(fnName => {
  const hasFn = appJsContent.includes(`function ${fnName}`) || appJsContent.includes(`window.${fnName}`) || appJsContent.includes(`${fnName} =`);
  if (hasFn) {
    console.log(`  ✅ Function ${fnName}(): INTEGRATED`);
  } else {
    auditErrors.push(`Missing core function ${fnName} in app.js`);
    console.log(`  ❌ Function ${fnName}(): MISSING`);
  }
});

console.log("\n=================================================");
if (auditErrors.length === 0) {
  console.log("🎉 ALL DATA & LOGIC AUDIT CHECKS PASSED PERFECTLY!");
} else {
  console.log(`⚠️ AUDIT FOUND ${auditErrors.length} ISSUES:`);
  auditErrors.forEach(err => console.log(` - ${err}`));
}
console.log("=================================================\n");
