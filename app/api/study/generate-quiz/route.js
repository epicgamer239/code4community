import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/utils/verifyFirebaseIdToken";
import {
  checkApiRateLimit,
  rateLimitNextResponse,
} from "@/utils/rateLimit";
import {
  normalizeSkillTag,
  skillTagListForPrompt,
  weakTagsHumanReadable,
} from "@/utils/studyTags";
import {
  formatStudyTopicKeyForPrompt,
  normalizeStudyTopicKey,
  shouldSkipTopicWeaknessKey,
} from "@/utils/studyTopicKey";

/** ~10 pages of text; hard cap to protect tokens/cost */
const MAX_NOTES_LENGTH = 120_000;
const DEFAULT_QUESTIONS = 8;
const MAX_QUESTIONS = 15;
/** Allow single-question fetches for ongoing practice sessions */
const MIN_QUESTIONS = 1;

export const maxDuration = 60;

function extractJsonObject(text) {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

/**
 * Remove meta-language about "the notes" so stems/options read like real exam items.
 * Grounding stays in the model; users should not see "based on your notes" in questions.
 */
function stripNotesMetaLanguage(text) {
  if (typeof text !== "string") return text;
  let s = text.trim();
  const startPatterns = [
    /^(according to|based on|as (?:described|stated|outlined|explained|mentioned|summarized) in|from)\s+(?:the|these|your|this)\s+notes[,:]?\s*/i,
    /^(?:in|within)\s+(?:the|these|your)\s+notes[,:]?\s*/i,
    /^(?:the|these)\s+notes\s+(?:indicate|suggest|show|state|claim|argue|demonstrate)\s+(?:that\s+)?/i,
    /^as\s+(?:the|these)\s+notes\s+(?:explain|describe|present)[,:]?\s*/i,
    /^as\s+outlined\s+above[,:]?\s*/i,
    /^as\s+described\s+in\s+the\s+(?:text|passage|materials)[,:]?\s*/i,
  ];
  let prev;
  let guard = 0;
  do {
    prev = s;
    for (const p of startPatterns) {
      s = s.replace(p, "").trim();
    }
    guard += 1;
  } while (s !== prev && guard < 10);

  const inline = [
    /\s*,\s*according to (?:the|these|your)\s+notes\.?/gi,
    /\s*,\s*based on (?:the|these|your)\s+notes\.?/gi,
    /\s*according to (?:the|these|your)\s+notes\.?/gi,
    /\s*based on (?:the|these|your)\s+notes\.?/gi,
    /\s*as (?:stated|described|explained) in (?:the|these|your)\s+notes\.?/gi,
    /\s*in (?:the|these|your)\s+notes\.?/gi,
  ];
  for (const p of inline) {
    s = s.replace(p, "");
  }
  s = s.replace(/\s+,/g, ",").replace(/\(\s+/g, "(").trim();
  return s.replace(/\s{2,}/g, " ");
}

function normalizeItemDifficulty(raw) {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s === "easy" || s === "hard") return s;
  return "medium";
}

function normalizeCognitiveLevel(raw) {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s === "recall" || s === "analysis") return s;
  return "application";
}

function normalizePerformanceTier(raw) {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s === "strong" || s === "struggling") return s;
  return "steady";
}

function sanitizeQuizSurface(quiz, subject) {
  if (!quiz || typeof quiz !== "object") return quiz;
  const out = { ...quiz };
  if (typeof out.title === "string") {
    out.title = stripNotesMetaLanguage(out.title);
  }
  if (!Array.isArray(out.questions)) return out;
  out.questions = out.questions.map((q) => {
    const nq = { ...q };
    if (typeof nq.question === "string") {
      nq.question = stripNotesMetaLanguage(nq.question);
    }
    if (Array.isArray(nq.options)) {
      nq.options = nq.options.map((o) =>
        typeof o === "string" ? stripNotesMetaLanguage(o) : o
      );
    }
    if (typeof nq.explanation === "string") {
      nq.explanation = stripNotesMetaLanguage(nq.explanation);
    }
    const sq =
      typeof nq.stimulusQuote === "string"
        ? stripNotesMetaLanguage(nq.stimulusQuote).trim()
        : "";
    const sc =
      typeof nq.stimulusCitation === "string"
        ? stripNotesMetaLanguage(nq.stimulusCitation).trim()
        : "";
    if (sq.length > 0) {
      nq.stimulusQuote = sq.slice(0, 12_000);
      nq.stimulusCitation = sc.slice(0, 800);
    } else {
      delete nq.stimulusQuote;
      delete nq.stimulusCitation;
    }
    nq.skillTag = normalizeSkillTag(subject, nq.skillTag);
    nq.topicLabel = normalizeTopicLabel(nq.topicLabel);
    nq.difficulty = normalizeItemDifficulty(nq.difficulty);
    nq.cognitiveLevel = normalizeCognitiveLevel(nq.cognitiveLevel);
    return nq;
  });
  return out;
}

const REFINE_NOTES_MAX = 14_000;

/**
 * Cheap heuristic: flag questions where one option is far shorter than others (often = throwaway distractor).
 * @param {object} quiz
 * @returns {number[]} 0-based question indices
 */
function findQuestionsWithWeakOptionBalance(quiz) {
  if (!quiz?.questions?.length) return [];
  const out = [];
  quiz.questions.forEach((q, i) => {
    if (!Array.isArray(q.options) || q.options.length !== 4) return;
    const lens = q.options.map((o) =>
      typeof o === "string" ? o.trim().length : 0
    );
    if (lens.some((l) => l < 8)) {
      out.push(i);
      return;
    }
    const maxL = Math.max(...lens);
    const minL = Math.min(...lens);
    if (maxL < 45) return;
    if (maxL >= 70 && minL < 32) out.push(i);
    else if (maxL >= 55 && minL / maxL < 0.28) out.push(i);
  });
  return out;
}

/**
 * Second pass: tighten stems, **rewrite weak distractors**, explanations; SOURCE MATERIAL helps plausibility.
 * @param {object} quiz
 * @param {"history" | "science"} subject
 * @param {string} notesForPrompt trimmed notes (may be truncated here)
 * @param {string} [extraUserBlock] extra instructions (e.g. targeted retry)
 */
async function refineQuizWithGemini(
  quiz,
  subject,
  model,
  apiKey,
  notesForPrompt = "",
  extraUserBlock = ""
) {
  const compact = {
    title: quiz.title,
    questions: quiz.questions.map((q) => ({
      question: q.question,
      stimulusQuote: q.stimulusQuote,
      stimulusCitation: q.stimulusCitation,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      skillTag: q.skillTag,
      topicLabel: q.topicLabel,
      difficulty: q.difficulty,
      cognitiveLevel: q.cognitiveLevel,
    })),
  };

  const role =
    subject === "science"
      ? "AP Science"
      : "AP History / social studies";

  const historyStimuliRule =
    subject === "history"
      ? `
(History) Preserve stimulus fields: if stimulusQuote and stimulusCitation are present, keep the passage in stimulusQuote, attribution in stimulusCitation, and only the MCQ stem in question—do not merge into one blob.`
      : "";

  const distractorBlock =
    subject === "history"
      ? `
(8) **DISTRACTORS — PRIMARY JOB OF THIS PASS:** Many first drafts have three "throwaway" wrong answers and one obvious winner. FIX THAT.
    - For EACH question, replace any wrong option that is absurd, joke-like, unrelated to the era/topic, or instantly dismissible with **no reading**.
    - Each rewritten wrong option must be something a **prepared student could seriously consider**—often partly true, wrong emphasis, wrong causal step, or right theme but wrong scale/timeframe.
    - Wrong options must sit in the **same conceptual neighborhood** as the key (same conflict, treaty, period, causal vocabulary)—not random filler.
    - After edits, a student should need to **compare** options to the stem (and stimulus if any), not win by elimination alone.
    - Keep four options parallel in tone; substantive clauses/sentences (~12–40 words each when the item is not definition-tiny).
(9) Use SOURCE MATERIAL below (plus each item's stimulus text) only to make distractors **topic-fair**; do not introduce unrelated narrow facts.`
      : `
(8) **DISTRACTORS — PRIMARY JOB OF THIS PASS:** Replace throwaway wrong answers with plausible misconceptions, boundary confusions, or "almost right" mechanisms grounded in the same models as the stem.
(9) Use SOURCE MATERIAL to keep distractors consistent with the unit—no cartoon-wrong science.`;

  const system = `You are an expert ${role} item editor. You will receive quiz JSON and SOURCE MATERIAL (student notes). Return ONLY valid JSON with the exact same shape: {"title":"string","questions":[...]}.
Each question must have: question, options (4 strings), correctIndex (0-3), explanation, skillTag, topicLabel, difficulty, cognitiveLevel; optional stimulusQuote and stimulusCitation when the item uses a stimulus.
RULES:
(1) Remove ambiguity in stems; keep third-person exam voice.
(2) Ensure exactly one best answer given the stem and options; change correctIndex only if the item is logically broken—if you rewrite options heavily, re-verify the index.
(3) Improve explanations: why the best answer wins vs at least one **plausible** wrong option (name the nuance).
(4) difficulty must be "easy", "medium", or "hard" matching the item (if distractors are now harder, you may raise difficulty).
(5) cognitiveLevel must be "recall", "application", or "analysis".
(6) Do not pivot the item to a different narrow topic than before.
(7) Preserve the number and order of questions.
${distractorBlock}${historyStimuliRule}`;

  const notesChunk =
    typeof notesForPrompt === "string" && notesForPrompt.length > 0
      ? notesForPrompt.slice(0, REFINE_NOTES_MAX)
      : "";
  const extra =
    typeof extraUserBlock === "string" && extraUserBlock.trim()
      ? `\n=== EXTRA INSTRUCTIONS ===\n${extraUserBlock.trim()}\n`
      : "";
  const userPayload = `${JSON.stringify(compact)}${extra}
=== SOURCE MATERIAL (for distractor plausibility and topic alignment — do not echo in JSON) ===
${notesChunk || "(not provided — improve distractors using only each question's stem, stimulus, and options.)"}
`;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const geminiRes = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: userPayload }] }],
      generationConfig: {
        temperature: 0.32,
        responseMimeType: "application/json",
      },
    }),
  });

  const geminiData = await geminiRes.json().catch(() => ({}));
  if (!geminiRes.ok) return null;
  const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") return null;
  try {
    return extractJsonObject(text);
  } catch {
    return null;
  }
}

function normalizeTopicLabel(raw) {
  if (typeof raw !== "string") return "General topic";
  const s = raw.replace(/\s+/g, " ").trim();
  if (!s) return "General topic";
  return s.slice(0, 80);
}

const SUBJECT_IDS = new Set(["history", "science"]);

function normalizeSubject(raw) {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (SUBJECT_IDS.has(s)) return s;
  return "history";
}

/**
 * @param {"history" | "science"} subject
 * @param {number} n
 * @param {string[]} [weakTagKeys] top tags from client (normalized keys)
 * @param {{ focusTopics?: string[], avoidTopics?: string[] }} [topicCoverage]
 * @param {string[]} [weakTopicKeys] normalized topic keys (cross-session misses)
 * @param {"steady" | "strong" | "struggling"} [performanceTier] recent batch performance hint from client
 */
function buildSystemPrompt(
  subject,
  n,
  weakTagKeys = [],
  topicCoverage = {},
  weakTopicKeys = [],
  performanceTier = "steady"
) {
  const isScience = subject === "science";

  const role = isScience
    ? `You are an expert AP Science assessment writer (draw from Biology, Chemistry, Environmental Science, and Physics as fits the SOURCE MATERIAL). Your job is to generate ONE multiple-choice section in the style of AP Science exams: conceptual rigor, model-based reasoning, and defensible "best answer" choices.`
    : `You are an expert AP History / AP Social Studies item writer for HIGH-STAKES exams. Your job is to generate ONE multiple-choice section at a CHALLENGING difficulty: items that separate students who can interpret evidence and weigh competing claims from those who only remember slogans. Conceptual rigor, interpretive thinking, and genuinely hard "best answer" choices—not obvious recall.`;

  const examVoice = isScience
    ? `- The "question" string, every "options" string, and "title" must read like REAL AP Science exams: direct, neutral, third-person scientific voice (not conversational).`
    : `- The "question" string, every "options" string, and "title" must read like a REAL AP History / Social Studies exam: direct, neutral, third-person historical voice (not conversational).`;

  /** Full history block—kept explicit so quality does not regress vs the pre–subject-split prompt. */
  const questionStyle = isScience
    ? `=== QUESTION STYLE — SCIENCE (REQUIRED) ===
Write questions that reward DEEP understanding of models, evidence, and mechanisms—not flashcard trivia.
- PRIORITIZE: cause/effect in physical/biological systems; how/why something happens; limitations of a model or method; prediction from evidence; variable relationships; energy/matter flow where relevant; comparing processes; "most consistent with" / "best explains" reasoning; experimental logic (controls, confounding) when the material supports it.
- STEM EXAMPLES (no meta-references): "Which of the following best explains…", "The observation most consistent with… is…", "If [change] occurs, the most likely result is…", "A limitation of this model is…"
- AVOID: questions whose only point is an isolated numeric constant, label, or definition with no reasoning—unless the source makes that fact central to a conceptual argument.
- AVOID: pure vocabulary matching with no reasoning.
- Optional: for a **data excerpt, quoted lab line, or described figure**, you may use **stimulusQuote** + **stimulusCitation** + **question** (stem only) so the UI matches AP-style layout; otherwise put everything in "question" only.

=== MINI PATTERN (SCIENCE — DO NOT COPY) ===
- BAD: one correct line + three absurd or unrelated wrong answers (instant elimination).
- GOOD: four mechanistically serious lines; wrong answers fail on nuance (wrong step, wrong scale, common mix-up).

=== DISTRACTOR QUALITY GATE (SCIENCE — CHECK EVERY ITEM BEFORE OUTPUT) ===
- Wrong answers must be **plausible to a student who studied**: common misconceptions, reversed cause/effect, right idea wrong scale or unit, confuses similar processes—not joke options.
- At least **two** wrong options should tempt someone who partially understands; avoid "three absurd + one correct."
- Do not write filler distractors unrelated to the mechanism or context of the stem.`
    : `=== QUESTION STYLE — HISTORY / SOCIAL STUDIES (REQUIRED) ===

=== STIMULI (REQUIRED — AP-STYLE JSON FIELDS) ===
- Real AP exams show a **passage**, a **source line** (citation), then the **question stem** below—like "Questions 1–3 refer to the passage below." You must mirror that structure in JSON (the app formats it).
- For **at least half of the questions, rounded up** (minimum 1), use **three fields** (do NOT put the excerpt and stem in one run-on string):
  - **"stimulusQuote"** (string): the passage only—quoted excerpt, paraphrased source lines, description of a cartoon/map/data, etc. No MCQ stem here.
  - **"stimulusCitation"** (string): one attribution line (e.g. "Excerpt from a treaty between an Assyrian king and the ruler of a subject city-state in northwestern Iran, circa 670 B.C.E."). Omit only if impossible.
  - **"question"** (string): **only** the multiple-choice stem (must end with a question—e.g. "Which of the following best explains…", "The passage most strongly suggests…"). Do not repeat the block quote in "question".
- For items **without** a stimulus, omit stimulusQuote and stimulusCitation; put the full item text in "question" only.
- Stems after the stimulus must demand interpretation, comparison, causation, or significance—not glossary gloss.
- Never reference the student's "notes" or homework meta-language (see EXAM VOICE).

=== DIFFICULTY TARGET (NON-NEGOTIABLE) ===
- Target DIFFICULTY 8–10 on a 10-point scale. Items rated "easy" or "typical homework" are UNACCEPTABLE. The student should often feel unsure until they reason carefully—if every question feels quick or obvious, you have failed.
- Ban "difficulty 1–3" patterns: one-step recall, a single obvious takeaway repeated in different words, or stems where the answer is the only non-absurd option.
- Every question must require REAL THINKING: weighing interpretations, comparing plausible claims, or explaining WHY something mattered—not naming a fact everyone knows.
- If a question could be answered by someone who only skimmed for keywords, REWRITE it to demand analysis.

=== WITHIN-THIS-QUIZ VARIETY (REQUIRED — NO NEAR-DUPLICATES) ===
- No two questions may reduce to the SAME thesis or the SAME "right idea" with different wording. Example of FAILURE: Q1 asks why appeasement failed relative to German ambitions; Q2 asks what appeasement's failure "most strongly suggests" about the same dynamic—that is one theme twice. FORBIDDEN.
- If the source centers on one episode (e.g. appeasement), each further question must change the LENS: different subtopic, different actor or time slice, comparison (before vs after), significance vs cause, continuity vs change, or a different HTS skill—NOT a restatement of the previous question's point.
- Give each question a distinct "topicLabel" when the source allows so items are clearly about different angles. If you must stay on one theme, the second question must still force a NEW judgment (e.g. compare to another case in the source, or a different level of analysis).

=== BANNED (DO NOT WRITE THESE) ===
- Trivial recall: "What was a common outcome of [event]?" where the correct answer is the only serious option and distractors are absurd or insultingly wrong (e.g. cartoon villains, nonsense factions, "everyone was happy" as wrong answers).
- Single-step name-the-fact items where no judgment is required.
- Stems where the answer is obvious because three options are jokes and one is real.
- **"Process of elimination by absurdity":** three options that are nonsense, wildly anachronistic, or unrelated to the stem so the fourth wins without thinking—this makes practice useless for hard exams. Treat this as a hard failure; rewrite the whole item.
- Overly generic stems that could apply to any unit without using the specific intellectual tension in the SOURCE MATERIAL.

=== DISTRACTOR QUALITY GATE (HISTORY — CHECK EVERY ITEM BEFORE OUTPUT) ===
For EACH multiple-choice item, silently verify (then fix before output):
- **Neighborhood:** Wrong answers must come from the **same topic neighborhood** as the key (same war, treaty, crisis, causal story)—plausible historical claims, not random filler from other centuries.
- **Two-way hesitation:** A strong student should feel real doubt between **at least two** options until they match phrasing to the stem/stimulus. If only one option "kind of fits," rewrite distractors.
- **Why each wrong answer is wrong:** Each distractor should fail for a **specific** reason (wrong cause, wrong timeframe, overstatement, true-but-not-what-the-stem-asks, right actor wrong effect)—not because it is silly.
- **No decoys:** Do not use "decoy" options whose only purpose is to be obviously wrong. Every line should read like something a harsh teacher could put on a real exam.

=== REQUIRED COGNITIVE DEMAND ===
- Prefer stems that force a TWO-STEP (or more) judgment: interpret a pattern, motive, or claim in the material, then pick the option that BEST fits (not merely "true").
- Example stem families (not a script—vary wording and invent your own): "Which of the following best explains…", "The most likely reason…", "Which interpretation is best supported…", "Which claim most accurately reflects the significance of…"

=== EXAMPLES OF HARD TECHNIQUES (INSPIRATION ONLY—DO NOT OVERUSE ANY ONE) ===
- The following are ILLUSTRATIVE patterns that real exams use. Use them when the SOURCE MATERIAL fits, and invent ANALOGOUS hard questions—different angles, different traps—so the batch is not repetitive.
- Example A (representation / motive): A ruler's portrait or public image—wrong answers might be plausible motives (e.g. military might) while the best answer in the source is something subtler (e.g. legitimacy, succession, religious sanction). Only when the material supports that kind of analysis.
- Example B (dimension / category): The stem narrows the task to ONE kind of outcome (e.g. economic); distractors can be TRUE political or social developments from the same source that fail because they are the wrong KIND of answer for what was asked. Only when the source actually spans multiple dimensions; do not force this into every question.
- Example C (runner-up): Two options sound almost right; the best answer wins on a fine nuance (timeframe, primary vs secondary cause, emphasis).
- VARY question types across the batch: do NOT lean on Example B (or any single pattern) for most items. Mix techniques; skip a technique entirely when the source does not support it.

=== HTS (AP HISTORICAL THINKING SKILLS) ===
Prioritize: causation; continuity and change; comparison; contextualization; periodization; argumentation and use of evidence; significance and consequence; synthesis across political, social, economic, and cultural dimensions.

=== STEMS & LENGTH ===
- Never "according to the notes" / "based on the passage."
- Stems may be long when needed to set up a real interpretive problem; options may be long when the distinction is between two sophisticated claims.

=== AVOID ===
- Isolated fact-recall, vocabulary matching, and any item with no interpretive payoff.`;

  const answerCorrect = isScience
    ? `- The CORRECT option should reflect sound scientific reasoning when the material allows—e.g. correct mechanism, appropriate scale, proper use of evidence—not only extreme or vague claims unless the material supports that.`
    : `- The CORRECT option should be the single best claim supported by the source: nuanced when the material is nuanced (e.g. limited change, partial success, mixed or unintended outcomes). Prefer the option that matches the weight of evidence in the source (primary vs secondary cause; main effect vs side effect; emphasis the source actually gives—not the most dramatic-sounding claim).
- The correct answer must NOT be discoverable by "pick the only sensible line" if the other three are nonsense—on hard items, THREE options should look defensible until compared carefully to the source.`;

  const wrongMix = isScience
    ? `(1) One or two clearly wrong scientifically: violates conservation, wrong causal direction, scale error, or contradicts the source.
  (2) One or two PLAUSIBLE distractors: common misconceptions, right vocabulary wrong context, confuses correlation with causation, or a process that sounds related but is not the best explanation.`
    : `(1) Across the batch, include several "runner-up" style distractors when appropriate: plausible—often partly true—but not best because of a small nuance (e.g. primary vs secondary cause; wrong emphasis or timeframe; scale; competing mechanisms). Not every question needs the same structure.
  (2) One technique among many (see EXAMPLES in the system prompt): sometimes wrong answers are TRUE in the source but answer a different dimension than the stem asked (e.g. economic vs political vs social). Use sparingly and only when fair—do not repeat this template on most questions.
  (3) Wrong options should tempt a prepared student: not obviously silly. Avoid filler distractors.
  (4) You may include one weaker option (e.g. too absolute) when the other three carry the difficulty.`;

  const historyDoLine = !isScience
    ? `
- DO write stems as if the facts are simply true for the course—e.g. "A significant outcome of the revolutions of 1848 was…", "Which of the following best describes the significance of…" — never meta-references to "notes" or "the passage."`
    : "";

  const focusTopics = Array.isArray(topicCoverage.focusTopics)
    ? topicCoverage.focusTopics.slice(0, 8).map(normalizeTopicLabel)
    : [];
  const avoidTopics = Array.isArray(topicCoverage.avoidTopics)
    ? topicCoverage.avoidTopics.slice(0, 8).map(normalizeTopicLabel)
    : [];

  const tier = normalizePerformanceTier(performanceTier);
  const tierBlock =
    tier === "struggling"
      ? `=== SESSION DIFFICULTY CALIBRATION (STUDENT NEEDS SUPPORT) ===
Recent accuracy is low. Target a MIXED batch: include some items that build a fair reasoning path from the source (not pure trivia), alongside standard exam-style items.
- Avoid stems that hinge on a single ambiguous word with no recourse in the source.
- For HISTORY: average item difficulty around the 5–7 / 10 band for this batch (not uniformly maximum), while still enforcing non-redundant questions and substantive options.
- For SCIENCE: favor clear causal/application items; still include rigorous "best explains" items where the source supports them.`
      : tier === "strong"
        ? `=== SESSION DIFFICULTY CALIBRATION (STUDENT IS READY FOR MORE) ===
Recent accuracy is high. Lean into harder distinctions and more demanding synthesis—stay within the GROUNDING rules (topic alignment; no wild tangents); no trivia for trivia's sake.
- For HISTORY: keep the high bar (interpretive, multi-step judgment) with varied techniques across the batch.
- For SCIENCE: emphasize model limits, mechanism, and inference where the material allows.`
        : "";

  return `${role}

=== GROUNDING (INTERNAL ONLY — TOPIC-TRUE, NOT VERBATIM) ===
- Stay **closely aligned** with the SOURCE MATERIAL: same course topic, same debates, actors, causes, and timeframe the notes imply. Questions do **not** need to reproduce the notes verbatim or test only sentences that appear word-for-word.
- **Dense notes:** Prefer claims and specifics that are clearly supported by what is written.
- **Thin notes:** You may **modestly extrapolate** within the same topic: well-attested AP-course generalizations, typical cause-effect or significance patterns, and plausible illustrative detail that fits the era and themes already named—so the set still feels like practice for **this** unit, not random trivia.
- **Hard limits on extrapolation:** Do **not** pivot to a **different** narrow event, region, or thesis the notes never suggest. Do **not** add hyper-specific names, dates, statistics, or documents that read as coming from a **different** topic to impress. When unsure, stay more general within the same theme rather than inventing precision.
- **Science vs History:** For science, keep mechanisms and claims consistent with the notes' level of specificity; the same thin-note rules apply (same topic, bounded inference, no unrelated deep cuts).
- NEVER tell the student you are using "notes" or assignment meta-language in the quiz text itself. See EXAM VOICE.

=== EXAM VOICE (CRITICAL — MUST FOLLOW) ===
${examVoice}${historyDoLine}
- FORBIDDEN anywhere in question, options, or title (including at the start or middle): "notes", "your notes", "the notes", "these notes", "based on the notes", "according to the notes", "as stated in the notes", "as described in the material", "given what you read", "the text above", assignment-style "read the passage" (do use natural evidence framing—see HISTORY STIMULI).
${isScience ? "- DO write as if the facts are standard course content—no meta framing." : "- DO write as if the facts are standard course content for history/social studies—no meta framing; stimuli should read like exam evidence, not homework instructions."}
- Explanations ("explanation" field): justify the answer like a teacher would—still avoid "the notes say"; use neutral phrasing ("The best choice is… because…", "This overstates…", "This confuses…").

${questionStyle}

${
  isScience
    ? `=== ANSWER CHOICES (REQUIRED) — SCIENCE ===
Exactly 4 options (A–D). One index is the SINGLE best answer supported by the source (correctIndex 0–3).
${answerCorrect}
- WRONG options must be a deliberate mix:
${wrongMix}
- Do NOT make wrong answers silly or joke answers. Every distractor should read like something a prepared student might consider.
- Keep options roughly parallel in length and tone when practical. No "all of the above."`
    : `=== ANSWER CHOICES (REQUIRED) — HISTORY ===
Exactly 4 options (A–D). One index is the SINGLE best answer supported by the source (correctIndex 0–3).
${answerCorrect}
- WRONG options must follow this mix:
${wrongMix}
- HARD-EXAM BAR: All four options should read like answers a strong student might seriously consider on a difficult test. Do not include "throwaway" distractors whose only job is to be wrong. Often, two or three wrong options should stay attractive until compared carefully to the source.
- Variety: Do not reuse the same trick for every question (e.g. not every item should be "economic vs political" distractors). Pull different hard moves from the EXAMPLES section as the material allows.
- Distractor bar: Wrong answers must not be extremely obvious. When it fits the source, include credible alternatives that fail on fine distinction (e.g. competing motives or interpretations)—not the same flavor every time.
- OPTION LENGTH (HISTORY — STRICT): Each of the four options must be a substantive clause or full sentence that can carry nuance. As a rule, aim for roughly 12–35 words per option when the source supports it. It is unacceptable for all four options to be ultra-short (e.g. every option under ~8 words)—that reads as elementary, not AP-level. If you write one short option for contrast, the others must still be long enough to state a serious historical claim.
- Do not shorten options to make them "match" each other; strong, longer distractors are required for difficulty 8–10.
- No "all of the above" or "none of the above."

=== MINI PATTERN (HISTORY — DO NOT COPY WORDING) ===
- BAD: one substantive correct option + three silly or obviously anachronistic distractors so the student wins by elimination.
- GOOD: four substantive claims in the same historical neighborhood; the best answer wins on a fine distinction (e.g. primary vs contributing cause, scope, timeframe, or what the stem actually asked).`
}

=== EXPLANATIONS ===
For each question, "explanation" must:
- Justify why the correct option is the best answer relative to the source (no reference to "notes" or "passage").
${
  isScience
    ? `- Name why at least one tempting wrong option is weaker (e.g. wrong mechanism, wrong scale).`
    : `- Explain why at least one plausible wrong option is weaker: name the nuance (causal weight, timeframe, emphasis, motive, category mismatch, etc.)—not just "incorrect."
- When relevant, note category mismatch: e.g. a choice is true as a political development but the stem asked for an economic effect—only when that was actually the trap for that question.
- Explanations may be brief or longer when needed to separate the best answer from a close second.`
}

=== SKILL TAGS (REQUIRED) ===
For EACH question, include "skillTag" with EXACTLY ONE of these keys (use the key string, not a sentence):
${skillTagListForPrompt(subject).join(", ")}, "general"
Pick the key that best matches which skill the question primarily assesses. Use "general" only when none of the specific keys fit.

${weakTagKeys.length > 0 ? `=== ADAPTIVE SKILL FOCUS (PRIORITIZE) ===
This student recently missed questions tagged with these skill areas — prioritize roughly half of your questions in these directions (follow GROUNDING: topic alignment and bounded extrapolation when notes are thin; avoid unrelated specifics):
${weakTagsHumanReadable(subject, weakTagKeys)
  .map((label) => `- ${label}`)
  .join("\n")}
Vary subtopics and stems so practice is not repetitive.` : ""}

${weakTopicKeys.length > 0 ? `=== ADAPTIVE TOPIC FOCUS (PRIORITIZE — CROSS-SESSION) ===
The student has missed questions on these content themes (regions, eras, units, or concepts — labels are normalized). When SOURCE MATERIAL supports it (including thin-note extrapolation within GROUNDING rules), aim roughly half of your questions at material that relates to these areas. If the notes barely mention a theme, touch it lightly with conservative wording or skip—do not jump to an unrelated narrow case.
${weakTopicKeys.map((k) => `- ${formatStudyTopicKeyForPrompt(k)}`).join("\n")}
- For those questions, set "topicLabel" to a short, natural name (often aligning with one of the above when relevant).
- Still include variety across the rest of the source when possible.` : ""}

${focusTopics.length > 0 || avoidTopics.length > 0 ? `=== TOPIC COVERAGE BALANCING (THIS SESSION) ===
- Each question must include a short "topicLabel" naming its primary topic (example: "Sino-Japanese War", "WWI causes", "Progressive Era reforms").
- Prefer under-covered topics first.
${focusTopics.length > 0 ? `- PRIORITIZE these under-covered topics:\n${focusTopics.map((t) => `  - ${t}`).join("\n")}` : ""}
${avoidTopics.length > 0 ? `- AVOID or de-prioritize these over-represented/recent topics unless unavoidable:\n${avoidTopics.map((t) => `  - ${t}`).join("\n")}` : ""}
- Do not let one repeated topic dominate when multiple topics exist in the source.` : ""}

${tierBlock}

=== OUTPUT FORMAT ===
Return ONLY valid JSON (no markdown fences, no commentary). Shape:
{"title":"string","questions":[{"question":"string","options":["string","string","string","string"],"correctIndex":0,"explanation":"string","skillTag":"cause_effect","topicLabel":"Sino-Japanese War","difficulty":"medium","cognitiveLevel":"application","stimulusQuote":"optional passage only","stimulusCitation":"optional one-line source"}]}
- "skillTag" must be one of the keys listed under SKILL TAGS (or "general").
- "topicLabel": short primary topic name for that question—use DISTINCT labels across questions when the source has multiple angles (helps avoid duplicate items).
- "difficulty": "easy" | "medium" | "hard" for this item relative to typical AP work on comparable content.
- "cognitiveLevel": "recall" | "application" | "analysis" — primary cognitive demand (Bloom-style).
- "title": short topic title drawn from the subject matter (history example: "Revolutions of 1848") — NOT "Quiz from notes".
${
  isScience
    ? `- Optional **stimulusQuote** / **stimulusCitation**: use when an excerpt or figure description should appear above the stem; then "question" is stem only. Otherwise omit those keys.
`
    : `- **History — stimuli:** For items with a stimulus, set **stimulusQuote**, **stimulusCitation**, and **question** (stem only). At least **half the items, rounded up** must include stimuli; never fewer than one if ${n} >= 1.
`
}- Generate exactly ${n} questions. Questions must be mutually non-redundant (see WITHIN-THIS-QUIZ VARIETY).`;
}

export async function POST(request) {
  try {
    const ipLimit = checkApiRateLimit(request, "aiQuizIp");
    if (!ipLimit.allowed) {
      return rateLimitNextResponse(ipLimit, NextResponse);
    }

    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const body = await request.json().catch(() => ({}));
    const idToken = bearer || body.idToken;

    const auth = await verifyFirebaseIdToken(idToken);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const userLimit = checkApiRateLimit(request, "aiQuizUser", auth.uid);
    if (!userLimit.allowed) {
      return rateLimitNextResponse(userLimit, NextResponse);
    }

    let {
      notes,
      numQuestions,
      subject: subjectRaw,
      weakTags: weakTagsRaw,
      weakTopics: weakTopicsRaw,
      topicCoverage: topicCoverageRaw,
      performanceTier: performanceTierRaw,
    } = body;

    const performanceTier = normalizePerformanceTier(performanceTierRaw);

    if (
      typeof subjectRaw === "string" &&
      subjectRaw.trim().toLowerCase() === "math"
    ) {
      return NextResponse.json(
        {
          error:
            "Math practice is built into the Study page (programmatic), not this API.",
        },
        { status: 400 }
      );
    }

    const subject = normalizeSubject(subjectRaw);

    /** @type {string[]} */
    let weakTagKeys = [];
    if (Array.isArray(weakTagsRaw)) {
      weakTagKeys = [
        ...new Set(
          weakTagsRaw
            .filter((t) => typeof t === "string")
            .map((t) => normalizeSkillTag(subject, t))
            .filter((k) => k !== "general")
        ),
      ].slice(0, 5);
    }

    /** @type {string[]} */
    let weakTopicKeys = [];
    if (Array.isArray(weakTopicsRaw)) {
      weakTopicKeys = [
        ...new Set(
          weakTopicsRaw
            .filter((t) => typeof t === "string")
            .map((t) => normalizeStudyTopicKey(t))
            .filter((k) => !shouldSkipTopicWeaknessKey(k))
        ),
      ].slice(0, 5);
    }

    let notesTrimmed = typeof notes === "string" ? notes.trim() : "";

    if (!notesTrimmed) {
      return NextResponse.json(
        { error: "Add some notes (paste or upload a .txt file)." },
        { status: 400 }
      );
    }

    let notesForPrompt = notesTrimmed;
    if (notesForPrompt.length > MAX_NOTES_LENGTH) {
      return NextResponse.json(
        { error: `Notes are too long (max ${MAX_NOTES_LENGTH.toLocaleString()} characters).` },
        { status: 400 }
      );
    }

    let n = Number(numQuestions);
    if (!Number.isFinite(n)) n = DEFAULT_QUESTIONS;
    n = Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, Math.floor(n)));

    const apiKey = (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      ""
    ).trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "AI Study is not configured yet (missing GEMINI_API_KEY on the server). Ask an admin to add it.",
        },
        { status: 503 }
      );
    }

    // gemini-2.0-flash is deprecated; free tier often shows quota 0. Use 2.5+ for AI Studio free/paid.
    const model =
      process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

    const topicCoverage = {
      focusTopics: Array.isArray(topicCoverageRaw?.focusTopics)
        ? topicCoverageRaw.focusTopics
            .filter((t) => typeof t === "string")
            .map(normalizeTopicLabel)
            .slice(0, 8)
        : [],
      avoidTopics: Array.isArray(topicCoverageRaw?.avoidTopics)
        ? topicCoverageRaw.avoidTopics
            .filter((t) => typeof t === "string")
            .map(normalizeTopicLabel)
            .slice(0, 8)
        : [],
    };

    // Never send the same topic in both lists (confuses the model); prefer keeping focus, drop from avoid
    const focusKeySet = new Set(
      topicCoverage.focusTopics.map((t) => t.trim().toLowerCase())
    );
    topicCoverage.avoidTopics = topicCoverage.avoidTopics.filter(
      (t) => !focusKeySet.has(t.trim().toLowerCase())
    );

    const system = buildSystemPrompt(
      subject,
      n,
      weakTagKeys,
      topicCoverage,
      weakTopicKeys,
      performanceTier
    );

    const adaptiveHint =
      weakTagKeys.length > 0
        ? `\nADAPTIVE SKILLS: Prioritize practice in these skill areas when possible: ${weakTagsHumanReadable(subject, weakTagKeys).join("; ")}.\n`
        : "";

    const topicWeakHint =
      weakTopicKeys.length > 0
        ? `\nADAPTIVE TOPICS: Prioritize content related to: ${weakTopicKeys.map(formatStudyTopicKeyForPrompt).join("; ")}.\n`
        : "";

    const topicHint =
      topicCoverage.focusTopics.length > 0 || topicCoverage.avoidTopics.length > 0
        ? `\nSESSION TOPIC COVERAGE: balance under-covered vs over-repeated topics within this session.\n`
        : "";

    const historyDifficultyReminder =
      subject === "history"
        ? `\nREMINDER: Target difficulty 8–10/10. No two questions may repeat the same core thesis (e.g. two appeasement items with the same answer logic). Each option should usually be a full substantive sentence or clause (~12+ words) unless the stem alone carries all difficulty. No trivial recall. CRITICAL: All four options must be serious, topic-plausible, and close enough that elimination-by-absurdity is impossible—rewrite any item that fails this before output.\n`
        : "";

    const scienceDifficultyReminder =
      subject === "science"
        ? `\nREMINDER: Wrong options must be plausible misconceptions or boundary confusions—not filler. A student preparing for a hard exam should not be able to win by crossing out three absurd answers.\n`
        : "";

    const userMsg = `SUBJECT MODE: ${subject === "science" ? "Science" : "History / social studies"}.
${historyDifficultyReminder}${scienceDifficultyReminder}${adaptiveHint}${topicWeakHint}
${topicHint}
SOURCE MATERIAL (for your eyes only—do not refer to this as "notes" in the JSON output):

---
${notesForPrompt}
---
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: system }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userMsg }],
          },
        ],
        generationConfig: {
          temperature: subject === "history" ? 0.58 : 0.45,
          responseMimeType: "application/json",
        },
      }),
    });

    const geminiData = await geminiRes.json().catch(() => ({}));
    if (!geminiRes.ok) {
      const msg =
        geminiData?.error?.message ||
        geminiData?.error?.status ||
        `Gemini request failed (${geminiRes.status})`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const blockReason = geminiData?.promptFeedback?.blockReason;
    if (blockReason) {
      return NextResponse.json(
        { error: "Content could not be processed. Try shorter notes or different wording." },
        { status: 502 }
      );
    }

    const content =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content || typeof content !== "string") {
      const finish = geminiData?.candidates?.[0]?.finishReason;
      return NextResponse.json(
        {
          error:
            finish === "SAFETY"
              ? "Response was blocked by safety filters. Try editing your notes."
              : "Empty response from model. Try again.",
        },
        { status: 502 }
      );
    }

    let quiz;
    try {
      quiz = extractJsonObject(content);
    } catch (e) {
      return NextResponse.json(
        { error: "Could not parse quiz. Try again with shorter notes." },
        { status: 502 }
      );
    }

    if (!quiz.title || !Array.isArray(quiz.questions)) {
      return NextResponse.json({ error: "Invalid quiz structure from model." }, { status: 502 });
    }

    quiz = sanitizeQuizSurface(quiz, subject);

    const skipRefine =
      process.env.SKIP_QUIZ_REFINE === "1" ||
      process.env.SKIP_QUIZ_REFINE === "true";
    if (
      !skipRefine &&
      Array.isArray(quiz.questions) &&
      quiz.questions.length > 0
    ) {
      try {
        const refined = await refineQuizWithGemini(
          quiz,
          subject,
          model,
          apiKey,
          notesForPrompt
        );
        if (
          refined &&
          typeof refined.title === "string" &&
          Array.isArray(refined.questions) &&
          refined.questions.length === quiz.questions.length
        ) {
          quiz = refined;
          quiz = sanitizeQuizSurface(quiz, subject);
        }

        const retryWeak =
          process.env.QUIZ_DISTRACTOR_REFINE_RETRY === "1" ||
          process.env.QUIZ_DISTRACTOR_REFINE_RETRY === "true";
        if (retryWeak && Array.isArray(quiz.questions) && quiz.questions.length > 0) {
          const weakIdx = findQuestionsWithWeakOptionBalance(quiz);
          if (weakIdx.length > 0) {
            try {
              const focused = await refineQuizWithGemini(
                quiz,
                subject,
                model,
                apiKey,
                notesForPrompt,
                `Targeted fix: questions at 0-based indices [${weakIdx.join(", ")}] still look like they have one or more "throwaway" options (e.g. much shorter than siblings) or unbalanced lengths. For ONLY those questions, rewrite all four options so each is a substantive, exam-style claim; wrong options stay plausible and topic-fair. Re-verify correctIndex. Leave other questions unchanged.`
              );
              if (
                focused &&
                typeof focused.title === "string" &&
                Array.isArray(focused.questions) &&
                focused.questions.length === quiz.questions.length
              ) {
                quiz = focused;
                quiz = sanitizeQuizSurface(quiz, subject);
              }
            } catch (e2) {
            }
          }
        }
      } catch (e) {
      }
    }

    for (const q of quiz.questions) {
      if (
        typeof q.question !== "string" ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        typeof q.correctIndex !== "number" ||
        q.correctIndex < 0 ||
        q.correctIndex > 3 ||
        typeof q.skillTag !== "string" ||
        typeof q.topicLabel !== "string" ||
        typeof q.difficulty !== "string" ||
        typeof q.cognitiveLevel !== "string"
      ) {
        return NextResponse.json({ error: "Invalid question in generated quiz." }, { status: 502 });
      }
    }

    return NextResponse.json({ quiz });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
