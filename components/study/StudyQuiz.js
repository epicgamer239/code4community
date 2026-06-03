"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { AP_PRECALC_UNIT1_TOPICS } from "@/data/apPrecalcUnit1Topics";
import { buildApPrecalc11Session, AP_PRECALC_11_TITLE } from "@/data/apPrecalc11Session";
import ExponentialGraphSvg from "@/components/study/ExponentialGraphSvg";
import SixPointsCurveSvg from "@/components/study/apPrecalc11/SixPointsCurveSvg";
import ParabolaVertexGraphSvg from "@/components/study/apPrecalc11/ParabolaVertexGraphSvg";
import {
  replaceInfWithInfinitySymbol,
  validateIntervalSpec,
} from "@/utils/mathIntervalAnswer";
import MathText from "@/components/MathText";
import MixedMathLine from "@/components/study/MixedMathLine";
import {
  loadStudyWeakness,
  recordStudyMiss,
  recordStudyTopicMiss,
  getTopWeakTagKeys,
  getTopWeakTopicKeys,
  emptyStudyWeakness,
} from "@/utils/studyWeakness";
import {
  loadStudyMastery,
  recordStudySkillOutcome,
  getDueReviewTagKeys,
  getHighMasteryTagKeys,
  getLowMasteryTagKeys,
  emptyStudyMastery,
  computePerformanceTier,
} from "@/utils/studyMastery";
import {
  normalizeStudyTopicKey,
  shouldSkipTopicWeaknessKey,
} from "@/utils/studyTopicKey";
import { normalizeSkillTag, skillTagLabel } from "@/utils/studyTags";
import { recordStudyQuestionResult, mergeStudyStatsTime } from "@/utils/studyStatsFirestore";
import { StudyCache } from "@/utils/cache";
import {
  loadStudyNoteSets,
  createStudyNoteSet,
  updateStudyNoteSet,
  deriveNoteSetName,
  saveNoteSetSessionResume,
  clearNoteSetSessionResume,
  deleteStudyNoteSet,
} from "@/utils/studyNoteSets";
import { auth } from "@/firebase";
import { DEMO_STUDY_QUIZ } from "@/data/studyDemoQuiz";
import { DEMO_NOTE_SETS } from "@/data/studyDemoNoteSets";
import StudySessionProgressHeader from "@/components/study/StudySessionProgressHeader";

const MAX_CHARS = 120_000;

/** Firestore `sessionResume.v` — bump if snapshot shape changes */
const SESSION_RESUME_VERSION = 1;

const STUDY_NOTE_SETS_DEMO =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_STUDY_DEMO === "1";

/**
 * Questions per AI request (session continues until user ends it).
 * Pricing tradeoff (Gemini 2.5 Flash, paid): output ~$2.50/M tokens vs input ~$0.30/M
 * (see https://ai.google.dev/gemini-api/docs/pricing). We resend notes every call, so
 * longer notes → larger batches amortize expensive repeated input; short notes → output
 * dominates → smaller batches limit first-load latency without much extra cost.
 */
function getSessionBatchSize(notesCharLength) {
  const n = Math.max(0, Number(notesCharLength) || 0);
  if (n < 4_000) return 4;
  if (n < 18_000) return 5;
  if (n < 45_000) return 7;
  if (n < 85_000) return 9;
  return 10;
}

function optionLetter(index) {
  return String.fromCharCode(65 + index);
}

/** Avoid "2. 2. ..." when the model also prefixes the question with a number */
function stripLeadingQuestionNumber(text) {
  if (typeof text !== "string") return text;
  return text.replace(/^\s*\d+[\.\)]\s*/, "").trim();
}

function difficultyPillLabel(d) {
  const x = typeof d === "string" ? d.toLowerCase() : "";
  if (x === "easy") return "Easy";
  if (x === "hard") return "Hard";
  return "Medium";
}

function cognitivePillLabel(c) {
  const x = typeof c === "string" ? c.toLowerCase() : "";
  if (x === "recall") return "Recall";
  if (x === "analysis") return "Analysis";
  return "Application";
}

function hasStructuredStimulus(q) {
  return typeof q?.stimulusQuote === "string" && q.stimulusQuote.trim().length > 0;
}

/**
 * AP-style layout: intro line → blockquote passage → right-aligned citation → stem below.
 * Falls back to a single block when `question` carries the full text (legacy / no stimulus fields).
 */
function QuestionPromptBlock({ q, questionIndex, variant = "playing" }) {
  const stem = typeof q.question === "string" ? stripLeadingQuestionNumber(q.question) : "";
  if (hasStructuredStimulus(q)) {
    const cite =
      typeof q.stimulusCitation === "string" && q.stimulusCitation.trim()
        ? q.stimulusCitation.trim()
        : null;
    return (
      <div className="space-y-3">
        <p className="font-semibold text-sm text-foreground font-serif">
          Refer to the passage below.
        </p>
        <blockquote className="font-serif text-sm leading-relaxed border-l-[3px] border-foreground/20 pl-4 py-3 bg-muted/40 rounded-r-md text-foreground">
          {q.stimulusQuote.trim()}
        </blockquote>
        {cite && (
          <p className="text-xs sm:text-sm text-muted-foreground text-right leading-snug">{cite}</p>
        )}
        <p
          className={
            variant === "playing"
              ? "text-foreground font-medium leading-relaxed pt-3 border-t border-border/80"
              : "text-sm font-medium text-foreground leading-relaxed pt-3 border-t border-border/80"
          }
        >
          {stem}
        </p>
      </div>
    );
  }
  return (
    <p
      className={
        variant === "playing"
          ? "text-foreground font-medium mb-4"
          : "text-sm font-medium text-foreground leading-relaxed"
      }
    >
      {variant === "playing" && (
        <span className="text-muted-foreground mr-2 tabular-nums">{questionIndex + 1}.</span>
      )}
      {stem}
    </p>
  );
}

/**
 * Build coverage hints for next generation batch:
 * - focusTopics: least-covered topics so far (prefer topics less repeated in the recent tail)
 * - avoidTopics: over-covered vs min + recent tail — never overlaps focus (same key in both confuses the model)
 */
function buildTopicCoverageHints(topicCounts, recentTopics) {
  const entries = Object.entries(topicCounts || {}).filter(([, c]) => Number.isFinite(c) && c > 0);
  if (entries.length === 0) {
    return { focusTopics: [], avoidTopics: [] };
  }
  const min = Math.min(...entries.map(([, c]) => c));
  const max = Math.max(...entries.map(([, c]) => c));
  const atMin = entries.filter(([, c]) => c === min).map(([k]) => k);
  const overRep = max > min ? entries.filter(([, c]) => c === max).map(([k]) => k) : [];

  const recent = Array.isArray(recentTopics) ? recentTopics.slice(-6) : [];
  const recentUnique = [...new Set(recent)];

  // Order focus: among min-count topics, prefer those appearing less in the recent tail (rotation)
  const recentTail = recent.slice(-4);
  const recentTailHits = (k) => recentTail.filter((t) => t === k).length;
  const focusTopics = [...atMin]
    .sort((a, b) => recentTailHits(a) - recentTailHits(b))
    .slice(0, 8);

  // Avoid: truly over-represented (only when max > min) + recent variety
  let avoidTopics = [...new Set([...overRep, ...recentUnique])].slice(0, 8);

  // Same topic must not appear in PRIORITIZE and AVOID (e.g. when all counts are tied, "recent" used to duplicate all min topics)
  const focusSet = new Set(focusTopics);
  avoidTopics = avoidTopics.filter((k) => !focusSet.has(k));

  return { focusTopics, avoidTopics };
}

export default function StudyQuiz({ user }) {
  const [notes, setNotes] = useState("");
  /** @type {"history" | "science" | "math"} */
  const [subject, setSubject] = useState("history");
  /** AP Precalc Unit 1 section id, e.g. "1.3" */
  const [mathTopicId, setMathTopicId] = useState("1.1");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(null);
  /** Programmatic math: topic id when practice is active (no AI) */
  const [pmTopic, setPmTopic] = useState(null);
  const [pmPhase, setPmPhase] = useState("playing");
  /** Programmatic 1.1 question list (MCQ + interval) */
  const [pmSession, setPmSession] = useState(null);
  const [pmIndex, setPmIndex] = useState(0);
  /** @type {Record<number, number | null>} */
  const [pmMcqSelections, setPmMcqSelections] = useState({});
  /** @type {Record<number, boolean>} */
  const [pmChecked, setPmChecked] = useState({});
  /** @type {Record<number, boolean>} */
  const [pmWasCorrect, setPmWasCorrect] = useState({});
  /** User tapped "I'm stuck" (math) — reveal answer, count as skipped */
  const [pmStuckSteps, setPmStuckSteps] = useState({});
  const [pmIntervalAnswer, setPmIntervalAnswer] = useState("");

  /** Local-only preview: no Gemini, no Firestore stats */
  const [isDemoSession, setIsDemoSession] = useState(false);
  const isDemoSessionRef = useRef(false);
  /** Firestore note sets + optional demo cards */
  const [noteSets, setNoteSets] = useState([]);
  const [noteSetsLoading, setNoteSetsLoading] = useState(false);
  /** When set, the next successful generate updates this doc; cleared when user edits notes / resets */
  const [activeNoteSetId, setActiveNoteSetId] = useState(null);
  /** Modal: inspect prompt + weakness / strengths for a note set */
  const [inspectNoteSet, setInspectNoteSet] = useState(null);
  const [deletingNoteSet, setDeletingNoteSet] = useState(false);
  /** @type {Record<number, number | null>} questionIndex -> selected option index */
  const [selections, setSelections] = useState({});
  /** Whether user pressed "Check" or "I'm stuck" on that question (shows explanation) */
  const [checkedSteps, setCheckedSteps] = useState({});
  /** AI quiz: revealed via I'm stuck (counts as skipped in stats) */
  const [stuckSteps, setStuckSteps] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  /** 'playing' = one question at a time; 'results' = final score */
  const [quizPhase, setQuizPhase] = useState("playing");
  /** Miss counts per skill tag (Firestore + local); drives adaptive generation */
  const [studyWeakness, setStudyWeakness] = useState(emptyStudyWeakness);
  /** Per-skill mastery + spaced-repetition due times */
  const [studyMastery, setStudyMastery] = useState(emptyStudyMastery);
  /** Topic coverage balancing for this session (AI-only) */
  const [topicCounts, setTopicCounts] = useState({});
  const [recentTopics, setRecentTopics] = useState([]);
  /** Wall-clock start for current study session (AI or math) — flushed to Firestore on exit */
  const studySessionStartRef = useRef(null);
  /** Latest quiz for goNext after async prefetch (state may not have committed yet) */
  const quizRef = useRef(null);
  /** In-flight background fetch for the next batch (continuous practice) */
  const prefetchPromiseRef = useRef(null);
  const prefetchInFlightRef = useRef(false);
  /**
   * Only one automatic prefetch per study session. Without this, each time the buffer grows
   * the user can hit "≤2 questions left" again (e.g. index 7 of 9) and trigger another
   * generate+refine while still on an early question — 3+ POSTs for one notes upload.
   * More questions after that load via goNext → fetchMoreQuestions on the last buffer item.
   */
  const sessionAutoPrefetchUsedRef = useRef(false);
  /** Last ~14 AI MCQ outcomes (true = correct) — drives adaptive difficulty hint */
  const recentAiOutcomesRef = useRef([]);
  /**
   * Adaptive fields for /api/study/generate-quiz — kept in refs so `fetchQuestionBatch` identity
   * does not change every answer. Otherwise the prefetch effect re-runs on each miss and can
   * schedule redundant requests (each route call = 2 Gemini: generate + refine).
   */
  const studyWeaknessRef = useRef(studyWeakness);
  const topicCountsRef = useRef(topicCounts);
  const recentTopicsRef = useRef(recentTopics);
  studyWeaknessRef.current = studyWeakness;
  topicCountsRef.current = topicCounts;
  recentTopicsRef.current = recentTopics;

  /** Larger notes → larger batches (fewer API calls; same notes re-sent each call). See getSessionBatchSize. */
  const sessionBatchSize = useMemo(
    () => getSessionBatchSize(notes.length),
    [notes.length]
  );

  const displayNoteSets = useMemo(() => {
    const demo = STUDY_NOTE_SETS_DEMO ? DEMO_NOTE_SETS : [];
    return [...demo, ...noteSets];
  }, [noteSets]);

  useEffect(() => {
    quizRef.current = quiz;
  }, [quiz]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [w, m] = await Promise.all([loadStudyWeakness(user), loadStudyMastery(user)]);
      if (!cancelled) {
        setStudyWeakness(w);
        setStudyMastery(m);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const cached = StudyCache.getNoteSets(user.uid);
    if (Array.isArray(cached) && cached.length > 0) {
      setNoteSets(cached);
      setNoteSetsLoading(false);
    } else {
      setNoteSetsLoading(true);
    }
    (async () => {
      try {
        const list = await loadStudyNoteSets(user, {
          onFresh: (fresh) => {
            if (!cancelled) setNoteSets(fresh);
          },
        });
        if (!cancelled) setNoteSets(list);
      } catch (e) {
      } finally {
        if (!cancelled) setNoteSetsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const flushSessionTime = useCallback(() => {
    if (isDemoSession) {
      studySessionStartRef.current = null;
      return;
    }
    if (!user || !studySessionStartRef.current) return;
    const seconds = Math.floor((Date.now() - studySessionStartRef.current) / 1000);
    if (seconds > 0) void mergeStudyStatsTime(user, seconds);
    studySessionStartRef.current = null;
  }, [user, isDemoSession]);

  useEffect(() => {
    isDemoSessionRef.current = isDemoSession;
  }, [isDemoSession]);

  /** Start timer when a study session becomes active */
  useEffect(() => {
    const active = Boolean(quiz) || Boolean(pmTopic);
    if (active && !studySessionStartRef.current) {
      studySessionStartRef.current = Date.now();
    }
  }, [quiz, pmTopic]);

  /** Save time when leaving the page mid-session (use auth.currentUser so logout still flushes) */
  useEffect(() => {
    return () => {
      if (!studySessionStartRef.current) return;
      const seconds = Math.floor((Date.now() - studySessionStartRef.current) / 1000);
      const u = auth?.currentUser;
      if (seconds > 0 && u && !isDemoSessionRef.current) void mergeStudyStatsTime(u, seconds);
      studySessionStartRef.current = null;
    };
  }, []);

  const resetQuiz = useCallback(() => {
    const noteSetIdToClear = activeNoteSetId;
    flushSessionTime();
    setQuiz(null);
    setSelections({});
    setCheckedSteps({});
    setStuckSteps({});
    setTopicCounts({});
    setRecentTopics([]);
    setCurrentIndex(0);
    setQuizPhase("playing");
    setPmTopic(null);
    setPmPhase("playing");
    setPmSession(null);
    setPmIndex(0);
    setPmMcqSelections({});
    setPmChecked({});
    setPmWasCorrect({});
    setPmStuckSteps({});
    setPmIntervalAnswer("");
    setError(null);
    setLoadingMore(false);
    setIsDemoSession(false);
    setActiveNoteSetId(null);
    setInspectNoteSet(null);
    recentAiOutcomesRef.current = [];
    sessionAutoPrefetchUsedRef.current = false;
    prefetchInFlightRef.current = false;
    prefetchPromiseRef.current = null;
    if (noteSetIdToClear && user) {
      void clearNoteSetSessionResume(user, noteSetIdToClear);
    }
  }, [flushSessionTime, user, activeNoteSetId]);

  useEffect(() => {
    setPmIntervalAnswer("");
  }, [pmIndex, pmTopic]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt") && file.type && !file.type.includes("text")) {
      setError("Please upload a .txt file (or paste notes below).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setNotes(text.slice(0, MAX_CHARS));
      setActiveNoteSetId(null);
      setError(null);
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
    e.target.value = "";
  };

  /** Programmatic math — topic 1.1 only for now */
  const startMathPractice = () => {
    setError(null);
    if (mathTopicId === "1.1") {
      setPmTopic("1.1");
      setPmPhase("playing");
      setPmSession(buildApPrecalc11Session());
      setPmIndex(0);
      setPmMcqSelections({});
      setPmChecked({});
      setPmWasCorrect({});
      setPmStuckSteps({});
      setPmIntervalAnswer("");
      return;
    }
    setError("Practice for this topic is coming soon. Try 1.1: Change in Tandem for now.");
  };

  const checkPrecalc11Current = () => {
    if (!pmSession?.length) return;
    const q = pmSession[pmIndex];
    if (q.type === "mcq") {
      const sel = pmMcqSelections[pmIndex];
      if (sel === undefined || sel === null) return;
      const ok = sel === q.correctIndex;
      setPmWasCorrect((prev) => ({ ...prev, [pmIndex]: ok }));
      setPmChecked((prev) => ({ ...prev, [pmIndex]: true }));
      void recordStudyQuestionResult(user, ok ? "correct" : "wrong");
      return;
    }
    const raw = pmIntervalAnswer.trim();
    if (!raw) return;
    const ok = validateIntervalSpec(raw, q.intervalSpec);
    setPmWasCorrect((prev) => ({ ...prev, [pmIndex]: ok }));
    setPmChecked((prev) => ({ ...prev, [pmIndex]: true }));
    void recordStudyQuestionResult(user, ok ? "correct" : "wrong");
  };

  const imStuckPrecalc = () => {
    if (!pmSession?.length || pmChecked[pmIndex]) return;
    setPmStuckSteps((prev) => ({ ...prev, [pmIndex]: true }));
    setPmChecked((prev) => ({ ...prev, [pmIndex]: true }));
    void recordStudyQuestionResult(user, "skipped");
  };

  const goPrecalc11Next = () => {
    if (!pmSession?.length) return;
    if (pmIndex < pmSession.length - 1) {
      setPmIndex((i) => i + 1);
      return;
    }
    setPmPhase("results");
  };

  const selectPrecalc11Mcq = (optionIndex) => {
    if (pmChecked[pmIndex]) return;
    setPmMcqSelections((prev) => ({ ...prev, [pmIndex]: optionIndex }));
  };

  const fetchQuestionBatch = useCallback(
    async (overrides = {}) => {
      const noteText = String(overrides.notes ?? notes).trim();
      const subj = overrides.subject ?? subject;
      const batchSize = getSessionBatchSize(noteText.length);
      if (!noteText || subj === "math") return null;
      const idToken = await user.getIdToken();
      const res = await fetch("/api/study/generate-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          notes: noteText,
          numQuestions: batchSize,
          subject: subj,
          weakTags: getTopWeakTagKeys(studyWeaknessRef.current, subj),
          weakTopics: getTopWeakTopicKeys(studyWeaknessRef.current, subj),
          topicCoverage: buildTopicCoverageHints(
            topicCountsRef.current,
            recentTopicsRef.current
          ),
          performanceTier: computePerformanceTier(recentAiOutcomesRef.current),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      if (!data.quiz?.questions?.length) {
        throw new Error("No questions returned. Try again.");
      }
      return data.quiz;
    },
    [user, notes, subject]
  );

  const persistNoteSetAfterGenerate = useCallback(
    /** @returns {Promise<string | null>} Firestore note set id */
    async (noteText, subj, persistSetId) => {
      if (!user || isDemoSession) return null;
      try {
        if (persistSetId) {
          await updateStudyNoteSet(user, persistSetId, {
            notes: noteText,
            subject: subj,
            name: deriveNoteSetName(noteText),
          });
          setActiveNoteSetId(persistSetId);
          const list = await loadStudyNoteSets(user);
          setNoteSets(list);
          return persistSetId;
        }
        const id = await createStudyNoteSet(user, {
          name: deriveNoteSetName(noteText),
          notes: noteText,
          subject: subj,
        });
        setActiveNoteSetId(id);
        const list = await loadStudyNoteSets(user);
        setNoteSets(list);
        return id;
      } catch (e) {
        return null;
      }
    },
    [user, isDemoSession]
  );

  /**
   * Prefetch the next batch in the background before the current buffer runs out.
   * Each POST runs 2 Gemini calls (generate + refine on the server). We only prefetch when
   * at most 2 questions are left in the buffer — enough lead time without firing as early
   * as "half the batch remaining" (which caused extra API usage on short sessions).
   * At most once per session (see sessionAutoPrefetchUsedRef) so we never chain prefetches
   * as the user moves through an expanded buffer.
   */
  useEffect(() => {
    if (!quiz?.questions?.length || quizPhase !== "playing") return;
    if (isDemoSession) return;
    if (subject === "math") return;
    if (!notes.trim()) return;
    if (sessionAutoPrefetchUsedRef.current) return;
    const remaining = quiz.questions.length - currentIndex;
    const prefetchThreshold = 2;
    if (remaining > prefetchThreshold) return;
    if (prefetchInFlightRef.current) return;

    prefetchInFlightRef.current = true;
    const run = (async () => {
      try {
        const batch = await fetchQuestionBatch();
        if (batch?.questions?.length) {
          setQuiz((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              questions: [...prev.questions, ...batch.questions],
            };
          });
        }
      } catch (e) {
      } finally {
        prefetchInFlightRef.current = false;
        prefetchPromiseRef.current = null;
        sessionAutoPrefetchUsedRef.current = true;
      }
    })();
    prefetchPromiseRef.current = run;
  }, [quiz, currentIndex, quizPhase, subject, notes, fetchQuestionBatch, sessionBatchSize, isDemoSession]);

  const generate = async (opts = {}) => {
    const noteText = String(opts.notesOverride ?? notes).trim();
    const subj = opts.subjectOverride ?? subject;
    const persistSetId = Object.prototype.hasOwnProperty.call(opts, "setIdOverride")
      ? opts.setIdOverride
      : activeNoteSetId;
    if (subj === "math") return;
    if (!noteText) {
      setError("Paste your notes or upload a .txt file first.");
      return;
    }
    setError(null);
    setLoading(true);
    setQuiz(null);
    setSelections({});
    setCheckedSteps({});
    setStuckSteps({});
    setTopicCounts({});
    setRecentTopics([]);
    setCurrentIndex(0);
    setQuizPhase("playing");
    recentAiOutcomesRef.current = [];
    sessionAutoPrefetchUsedRef.current = false;
    prefetchInFlightRef.current = false;
    prefetchPromiseRef.current = null;
    try {
      const batch = await fetchQuestionBatch({ notes: noteText, subject: subj });
      if (batch) {
        setQuiz(batch);
        if (!opts.skipNoteSetPersist) {
          const noteSetId = await persistNoteSetAfterGenerate(
            noteText,
            subj,
            persistSetId
          );
          if (noteSetId) {
            await clearNoteSetSessionResume(user, noteSetId);
          }
        }
      }
    } catch (err) {
      setError(err?.message || "Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInspectNoteSet = useCallback(async () => {
    const n = inspectNoteSet;
    if (!n || n.isDemo || !user) return;
    if (
      !window.confirm(
        `Delete "${n.name}"? This removes the saved note set and any saved progress. This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingNoteSet(true);
    setError(null);
    try {
      await deleteStudyNoteSet(user, n.id);
      if (activeNoteSetId === n.id) setActiveNoteSetId(null);
      const list = await loadStudyNoteSets(user);
      setNoteSets(list);
      setInspectNoteSet(null);
    } catch (e) {
      setError("Could not delete note set. Try again.");
    } finally {
      setDeletingNoteSet(false);
    }
  }, [inspectNoteSet, user, activeNoteSetId]);

  const continueNoteSet = async (set) => {
    setError(null);
    const sub = set.subject === "science" ? "science" : "history";
    const noteText = set.notes || "";
    setNotes(noteText);
    setSubject(sub);

    if (set.isDemo) {
      void generate({
        notesOverride: noteText,
        subjectOverride: sub,
        setIdOverride: null,
        skipNoteSetPersist: true,
      });
      return;
    }

    const resume = set.sessionResume;
    const notesPrefix = noteText.trim().slice(0, 120);
    const structOk =
      resume &&
      resume.v === SESSION_RESUME_VERSION &&
      resume.quiz?.questions?.length > 0 &&
      typeof resume.currentIndex === "number" &&
      resume.currentIndex >= 0 &&
      resume.currentIndex < resume.quiz.questions.length;
    const notesMatch =
      structOk &&
      (!resume.notesPrefix || resume.notesPrefix === notesPrefix);

    if (structOk && notesMatch) {
      setLoading(true);
      setError(null);
      try {
        setQuiz(resume.quiz);
        setCurrentIndex(resume.currentIndex);
        setSelections(resume.selections && typeof resume.selections === "object" ? resume.selections : {});
        setCheckedSteps(
          resume.checkedSteps && typeof resume.checkedSteps === "object"
            ? resume.checkedSteps
            : {}
        );
        setStuckSteps(
          resume.stuckSteps && typeof resume.stuckSteps === "object" ? resume.stuckSteps : {}
        );
        setTopicCounts(
          resume.topicCounts && typeof resume.topicCounts === "object" ? resume.topicCounts : {}
        );
        setRecentTopics(Array.isArray(resume.recentTopics) ? resume.recentTopics : []);
        recentAiOutcomesRef.current = Array.isArray(resume.recentAiOutcomes)
          ? resume.recentAiOutcomes.filter((x) => typeof x === "boolean")
          : [];
        sessionAutoPrefetchUsedRef.current = Boolean(resume.sessionAutoPrefetchUsed);
        prefetchInFlightRef.current = false;
        prefetchPromiseRef.current = null;
        setQuizPhase("playing");
        setActiveNoteSetId(set.id);
        setIsDemoSession(false);
      } catch (e) {
        setError("Could not restore session. Starting a new session…");
        void generate({
          notesOverride: noteText,
          subjectOverride: sub,
          setIdOverride: set.id,
          skipNoteSetPersist: false,
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    void generate({
      notesOverride: noteText,
      subjectOverride: sub,
      setIdOverride: set.id,
      skipNoteSetPersist: false,
    });
  };

  const fetchMoreQuestions = async () => {
    if (!notes.trim() || subject === "math") return false;
    setLoadingMore(true);
    setError(null);
    try {
      const batch = await fetchQuestionBatch();
      if (!batch) return false;
      setQuiz((prev) => {
        if (!prev) return batch;
        return {
          ...prev,
          questions: [...prev.questions, ...batch.questions],
        };
      });
      return true;
    } catch (err) {
      setError(err?.message || "Network error. Try again.");
      return false;
    } finally {
      setLoadingMore(false);
    }
  };

  const endSession = () => {
    if (activeNoteSetId && !isDemoSession && quiz && user) {
      void (async () => {
        try {
          const snapshot = {
            v: SESSION_RESUME_VERSION,
            quiz,
            currentIndex,
            selections,
            checkedSteps,
            stuckSteps,
            topicCounts,
            recentTopics,
            recentAiOutcomes: [...recentAiOutcomesRef.current],
            sessionAutoPrefetchUsed: sessionAutoPrefetchUsedRef.current,
            notesPrefix: notes.trim().slice(0, 120),
          };
          await saveNoteSetSessionResume(user, activeNoteSetId, snapshot);
          const list = await loadStudyNoteSets(user);
          setNoteSets(list);
        } catch (e) {
        }
      })();
    }
    setQuizPhase("results");
  };

  const startDemoSession = () => {
    setError(null);
    setSubject("science");
    setIsDemoSession(true);
    setQuiz({
      title: DEMO_STUDY_QUIZ.title,
      questions: DEMO_STUDY_QUIZ.questions.map((q) => ({ ...q })),
    });
    setSelections({});
    setCheckedSteps({});
    setStuckSteps({});
    setTopicCounts({});
    setRecentTopics([]);
    setCurrentIndex(0);
    setQuizPhase("playing");
    sessionAutoPrefetchUsedRef.current = false;
  };

  const goNext = async () => {
    if (!quiz?.questions?.length) return;
    const qi = currentIndex;
    const n = quiz.questions.length;
    if (qi < n - 1) {
      setCurrentIndex((i) => i + 1);
      return;
    }
    if (isDemoSession) {
      setQuizPhase("results");
      return;
    }
    // At end of buffer: next batch is usually already prefetched
    setLoadingMore(true);
    try {
      const pending = prefetchPromiseRef.current;
      if (pending) {
        await pending;
      }
      await new Promise((r) => setTimeout(r, 0));
      if (quizRef.current && quizRef.current.questions.length > qi + 1) {
        setCurrentIndex(qi + 1);
        return;
      }
      const ok = await fetchMoreQuestions();
      if (ok) setCurrentIndex(qi + 1);
    } finally {
      setLoadingMore(false);
    }
  };

  const selectOption = (qIndex, optionIndex) => {
    if (checkedSteps[qIndex]) return;
    setSelections((prev) => ({ ...prev, [qIndex]: optionIndex }));
  };

  const imStuckAI = () => {
    if (!quiz?.questions?.length) return;
    if (checkedSteps[currentIndex]) return;
    const q = quiz.questions[currentIndex];
    if (!isDemoSession) {
      const topic = normalizeStudyTopicKey(q.topicLabel);
      setTopicCounts((prev) => ({ ...prev, [topic]: (prev[topic] || 0) + 1 }));
      setRecentTopics((prev) => [...prev.slice(-5), topic]);
    }
    setStuckSteps((prev) => ({ ...prev, [currentIndex]: true }));
    setCheckedSteps((prev) => ({ ...prev, [currentIndex]: true }));
    if (!isDemoSession) void recordStudyQuestionResult(user, "skipped");
  };

  const checkCurrent = () => {
    if (!quiz?.questions?.length) return;
    if (selections[currentIndex] === undefined || selections[currentIndex] === null) return;
    const q = quiz.questions[currentIndex];
    if (!isDemoSession) {
      const topic = normalizeStudyTopicKey(q.topicLabel);
      setTopicCounts((prev) => ({ ...prev, [topic]: (prev[topic] || 0) + 1 }));
      setRecentTopics((prev) => [...prev.slice(-5), topic]);
    }
    const wrong = selections[currentIndex] !== q.correctIndex;
    setCheckedSteps((prev) => ({ ...prev, [currentIndex]: true }));
    if (!isDemoSession) {
      void recordStudyQuestionResult(user, wrong ? "wrong" : "correct");
      if (subject === "history" || subject === "science") {
        recentAiOutcomesRef.current.push(!wrong);
        if (recentAiOutcomesRef.current.length > 14) {
          recentAiOutcomesRef.current.shift();
        }
        const tag = normalizeSkillTag(subject, q.skillTag);
        void recordStudySkillOutcome(user, subject, tag, !wrong);
        void (async () => {
          const m = await loadStudyMastery(user);
          setStudyMastery(m);
        })();
        if (wrong) {
          const topicKey = normalizeStudyTopicKey(q.topicLabel);
          setStudyWeakness((prev) => {
            const sub = subject === "science" ? "science" : "history";
            const tags = { ...(prev[sub]?.tags || {}) };
            tags[tag] = (tags[tag] || 0) + 1;
            const topics = { ...(prev[sub]?.topics || {}) };
            if (!shouldSkipTopicWeaknessKey(topicKey)) {
              topics[topicKey] = (topics[topicKey] || 0) + 1;
            }
            return { ...prev, [sub]: { ...prev[sub], tags, topics } };
          });
          void recordStudyMiss(user, subject, tag);
          void recordStudyTopicMiss(user, subject, q.topicLabel);
        }
      }
    }
  };

  /** AI quiz: indices where user checked an answer or used I'm stuck (counts toward results + stats; untouched buffer questions excluded) */
  const aiAttemptedIndices =
    quiz && quizPhase === "results"
      ? quiz.questions.map((_, i) => i).filter((i) => checkedSteps[i])
      : [];
  const aiAttemptedCount = aiAttemptedIndices.length;

  const score =
    quiz && quizPhase === "results"
      ? quiz.questions.reduce((acc, q, i) => {
          if (!checkedSteps[i]) return acc;
          if (stuckSteps[i]) return acc;
          const sel = selections[i];
          return acc + (sel === q.correctIndex ? 1 : 0);
        }, 0)
      : 0;

  const skippedInSession =
    quiz && quizPhase === "results"
      ? quiz.questions.reduce((acc, _, i) => acc + (stuckSteps[i] ? 1 : 0), 0)
      : 0;

  const pmScore =
    pmTopic === "1.1" && pmPhase === "results" && pmSession?.length
      ? pmSession.reduce(
          (acc, _q, i) => acc + (!pmStuckSteps[i] && pmWasCorrect[i] === true ? 1 : 0),
          0
        )
      : 0;
  const pmSkipped =
    pmTopic === "1.1" && pmPhase === "results" && pmSession?.length
      ? pmSession.reduce((acc, _q, i) => acc + (pmStuckSteps[i] ? 1 : 0), 0)
      : 0;
  const pmMax = pmSession?.length ?? 0;

  /** @param {{ type: string, visual?: { kind: string } }} q */
  const renderPrecalc11Figure = (q) => {
    if (!q?.visual) return null;
    const v = q.visual;
    if (v.kind === "piecewise" && v.points) {
      return <SixPointsCurveSvg points={v.points} className="w-full" />;
    }
    if (v.kind === "exp") {
      return (
        <ExponentialGraphSvg base={v.base} equationLatex={v.equationLatex} className="w-full" />
      );
    }
    if (v.kind === "parabola") {
      return (
        <ParabolaVertexGraphSvg
          className="w-full"
          h={v.h}
          k={v.a}
          k0={v.k0 ?? 0}
          opensUp={Boolean(v.opensUp)}
        />
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 w-full min-w-0 max-w-full">
      {loading && !quiz && !pmTopic && (
        <div
          className="rounded-xl border border-border bg-background shadow-sm min-h-[min(70vh,520px)] flex flex-col items-center justify-center px-6 py-16"
          aria-busy="true"
          aria-live="polite"
        >
          <div
            className="h-12 w-12 rounded-full border-4 border-muted border-t-primary animate-spin"
            aria-hidden
          />
          <p className="mt-6 text-sm font-medium text-foreground">Building your quiz…</p>
          <p className="mt-1.5 text-xs text-muted-foreground text-center max-w-xs">
            Hang tight. This usually takes a few seconds.
          </p>
        </div>
      )}
      {!quiz && !pmTopic && !loading && (
        <div className="rounded-xl border border-border bg-background shadow-sm p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-8 lg:gap-0">
            <div className="flex-1 min-w-0 space-y-6 lg:pr-10">
              <div>
                <p className="text-sm font-medium text-foreground mb-3">Choose a subject</p>
                <div className="grid grid-cols-2 gap-3 max-w-lg">
                  {(
                    [
                      { id: "math", label: "Math", hint: "AP Precalc, built in" },
                      { id: "science", label: "Science", hint: "AI from your notes" },
                      { id: "history", label: "History", hint: "Social studies" },
                      { id: "soon", label: "Coming soon", hint: "More subjects", disabled: true },
                    ]
                  ).map((tile) => {
                    const isSelected = !tile.disabled && subject === tile.id;
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        disabled={tile.disabled}
                        onClick={() => {
                          if (tile.disabled) return;
                          if (tile.id === "science") setSubject("science");
                          else if (tile.id === "math") setSubject("math");
                          else setSubject("history");
                          setError(null);
                        }}
                        className={[
                          "rounded-xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                          tile.disabled
                            ? "border-border bg-muted/20 text-muted-foreground cursor-not-allowed opacity-80"
                            : isSelected
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border bg-background hover:bg-muted/40 hover:border-muted-foreground/30",
                        ].join(" ")}
                      >
                        <span
                          className={`block font-semibold ${tile.disabled ? "text-muted-foreground" : "text-foreground"}`}
                        >
                          {tile.label}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground leading-snug">{tile.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Try the flow without AI</p>
                  <p className="text-xs text-muted-foreground">
                    Three static questions, no Gemini, and nothing saved to your stats.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startDemoSession}
                  className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-border bg-background font-medium rounded-lg hover:bg-muted/60 transition-colors text-sm"
                >
                  Start demo
                </button>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-end gap-4 flex-wrap">
                {subject === "math" && (
                  <div className="flex-1 min-w-[min(100%,18rem)]">
                    <label htmlFor="study-math-topic" className="block text-sm font-medium text-foreground mb-1.5">
                      Topic (Unit 1)
                    </label>
                    <select
                      id="study-math-topic"
                      value={mathTopicId}
                      onChange={(e) => {
                        setMathTopicId(e.target.value);
                        setError(null);
                      }}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      {AP_PRECALC_UNIT1_TOPICS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.id} {t.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Built-in practice (no AI). More topics coming soon.
                    </p>
                  </div>
                )}

                {subject === "math" ? (
                  <button
                    type="button"
                    onClick={startMathPractice}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Start practice
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={generate}
                    disabled={loading || !notes.trim()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Starting session…" : "Start practice session"}
                  </button>
                )}
              </div>

              {subject !== "math" && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">Your notes</h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    Paste text or upload a <strong>.txt</strong> file (up to ~10 pages). Notes are sent only to
                    generate questions during your session.
                  </p>
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value.slice(0, MAX_CHARS));
                      setActiveNoteSetId(null);
                      setError(null);
                    }}
                    rows={12}
                    placeholder="Paste your class notes, outline, or study sheet here…"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y font-mono text-sm"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-muted-foreground">
                    <span>
                      {notes.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
                    </span>
                    <label className="cursor-pointer text-primary hover:underline font-medium">
                      Upload .txt
                      <input type="file" accept=".txt,text/plain" className="hidden" onChange={handleFile} />
                    </label>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm">
                  {error}
                </div>
              )}
            </div>

            {(noteSetsLoading || displayNoteSets.length > 0) && (
              <>
                <div
                  className="hidden lg:block w-px shrink-0 bg-black dark:bg-neutral-500"
                  aria-hidden
                />
                <aside className="w-full lg:w-[min(100%,18.5rem)] xl:w-80 shrink-0 lg:sticky lg:top-4 lg:pl-10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">Saved note sets</p>
                  {noteSetsLoading && (
                    <span className="text-xs text-muted-foreground">Loading…</span>
                  )}
                </div>
                {STUDY_NOTE_SETS_DEMO && (
                  <p className="text-xs text-muted-foreground">
                    Demo cards are shown because{" "}
                    <code className="font-mono">NEXT_PUBLIC_STUDY_DEMO=1</code>.
                  </p>
                )}
                <div className="flex flex-col gap-3">
                  {displayNoteSets.map((ns) => (
                    <div
                      key={ns.id}
                      className="relative rounded-xl border border-border bg-muted/20 px-4 py-4 pr-12 shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => setInspectNoteSet(ns)}
                        className="absolute right-3 top-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                        aria-label="View prompt and topic insights"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <p className="font-semibold text-foreground pr-2 leading-snug">{ns.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        {ns.subject === "science" ? "Science" : "History"}
                        {ns.isDemo ? " · demo" : ""}
                      </p>
                      {ns.sessionResume && !ns.isDemo && (
                        <p className="text-xs text-primary mt-1.5 leading-snug">
                          Saved progress, picks up the same questions (no new AI call).
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => void continueNoteSet(ns)}
                        disabled={loading}
                        className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-50"
                      >
                        Continue studying
                      </button>
                    </div>
                  ))}
                </div>
              </aside>
              </>
            )}
          </div>
        </div>
      )}

      {/* Programmatic math — AP Precalc 1.1 (Change in Tandem) */}
      {pmTopic === "1.1" && pmPhase === "playing" && pmSession?.length > 0 && (() => {
        const qi = pmIndex;
        const q = pmSession[qi];
        const total = pmSession.length;
        const revealed = !!pmChecked[qi];
        const selected = pmMcqSelections[qi];
        const figure = renderPrecalc11Figure(q);

        return (
          <div className="space-y-6 w-full min-w-0 max-w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-foreground">{AP_PRECALC_11_TITLE}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Question {qi + 1} of {total}: procedural math (new numbers each run). Intervals plus piecewise slopes.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-muted-foreground tabular-nums px-3 py-1.5 rounded-full bg-muted/60 border border-border">
                  {qi + 1} / {total}
                </span>
                <button
                  type="button"
                  onClick={resetQuiz}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50"
                >
                  Exit
                </button>
              </div>
            </div>

            {figure && (
              <div className="rounded-xl border border-border bg-white dark:bg-background p-4 overflow-x-auto">
                {figure}
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/10 p-5 md:p-6 space-y-4 min-w-0 max-w-full">
              <div className="flex gap-2 sm:gap-3 min-w-0 text-foreground font-medium leading-relaxed">
                <span className="text-muted-foreground shrink-0 tabular-nums pt-0.5">{qi + 1}.</span>
                <div className="min-w-0 flex-1">
                  {q.type === "mcq" ? (
                    q.questionParts ? (
                      <MixedMathLine parts={q.questionParts} />
                    ) : q.questionLatex ? (
                      <MathText latex={q.questionLatex} />
                    ) : (
                      <span className="break-words">{q.question}</span>
                    )
                  ) : q.promptParts ? (
                    <MixedMathLine parts={q.promptParts} />
                  ) : q.promptLatex ? (
                    <MathText latex={q.promptLatex} />
                  ) : (
                    <span className="break-words">{q.prompt}</span>
                  )}
                </div>
              </div>

              {q.type === "mcq" && (
                <ul className="space-y-2 pl-0 md:pl-2">
                  {q.options.map((opt, oi) => {
                    const isSelected = selected === oi;
                    const isCorrectOption = oi === q.correctIndex;
                    let ring = "border-border";
                    if (revealed) {
                      if (isCorrectOption) ring = "border-green-500 bg-green-50 dark:bg-green-950/20";
                      else if (isSelected && !isCorrectOption)
                        ring = "border-red-400 bg-red-50 dark:bg-red-950/20";
                    } else if (isSelected) {
                      ring = "border-primary ring-1 ring-primary";
                    }
                    return (
                      <li key={oi}>
                        <button
                          type="button"
                          onClick={() => selectPrecalc11Mcq(oi)}
                          disabled={revealed}
                          className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${ring} ${
                            revealed ? "cursor-default" : "hover:bg-muted/40 cursor-pointer"
                          }`}
                        >
                          <span className="font-medium text-muted-foreground mr-2">
                            {String.fromCharCode(65 + oi)}.
                          </span>
                          {opt}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {q.type === "interval" && (
                <>
                  <label htmlFor={`math-interval-${qi}`} className="sr-only">
                    Interval answer
                  </label>
                  <input
                    id={`math-interval-${qi}`}
                    type="text"
                    value={pmIntervalAnswer}
                    onChange={(e) => {
                      const v = replaceInfWithInfinitySymbol(e.target.value);
                      setPmIntervalAnswer(v);
                    }}
                    disabled={revealed}
                    placeholder="e.g. (-infinity, infinity) or (-inf, 2)"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70"
                    autoComplete="off"
                  />
                </>
              )}

              {revealed && pmStuckSteps[qi] && (
                <p className="text-sm text-muted-foreground">
                  Answer shown. This counts as <strong>skipped</strong> in your stats.
                </p>
              )}
              {revealed && !pmStuckSteps[qi] && (
                <div
                  className={`text-sm min-w-0 max-w-full ${
                    pmWasCorrect[qi]
                      ? "text-green-700 dark:text-green-400"
                      : "text-amber-800 dark:text-amber-200"
                  }`}
                >
                  <span className="font-medium">{pmWasCorrect[qi] ? "Correct." : "Not quite."}</span>{" "}
                  {q.explanationParts ? (
                    <span className="text-muted-foreground">
                      <MixedMathLine parts={q.explanationParts} />
                    </span>
                  ) : q.explanationLatex ? (
                    <span className="text-muted-foreground">
                      <MathText latex={q.explanationLatex} />
                    </span>
                  ) : (
                    q.explanation && (
                      <span className="text-muted-foreground break-words">{q.explanation}</span>
                    )
                  )}
                </div>
              )}
              {revealed && pmStuckSteps[qi] && (
                <div className="text-sm text-muted-foreground min-w-0 max-w-full border-t border-border pt-3 mt-2">
                  {q.explanationParts ? (
                    <MixedMathLine parts={q.explanationParts} />
                  ) : q.explanationLatex ? (
                    <MathText latex={q.explanationLatex} />
                  ) : (
                    q.explanation && <span className="break-words">{q.explanation}</span>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mt-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (!revealed) checkPrecalc11Current();
                      else goPrecalc11Next();
                    }}
                    disabled={
                      !revealed &&
                      ((q.type === "mcq" && (selected === undefined || selected === null)) ||
                        (q.type === "interval" && !pmIntervalAnswer.trim()))
                    }
                    className="px-5 py-2.5 bg-foreground text-background font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!revealed ? "Check" : qi >= total - 1 ? "See results" : "Next"}
                  </button>
                  <button
                    type="button"
                    onClick={imStuckPrecalc}
                    disabled={revealed}
                    className="px-5 py-2.5 border border-border font-medium rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    I&apos;m stuck
                  </button>
                </div>
                {!revealed && q.type === "interval" && !pmIntervalAnswer.trim() && (
                  <p className="text-xs text-muted-foreground">Enter an interval to enable Check.</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {pmTopic === "1.1" && pmPhase === "results" && (
        <div className="rounded-xl border border-border bg-muted/10 p-8 md:p-10 text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Practice complete</h2>
          <p className="text-3xl font-semibold text-foreground tabular-nums">
            {pmScore} / {pmMax} correct
          </p>
          {pmSkipped > 0 && (
            <p className="text-sm text-muted-foreground">{pmSkipped} skipped (I&apos;m stuck)</p>
          )}
          <p className="text-muted-foreground text-sm">
            AP Precalc 1.1: Change in Tandem (programmatic, no AI).
          </p>
          <button
            type="button"
            onClick={resetQuiz}
            className="mt-2 px-6 py-3 bg-foreground text-background font-medium rounded-lg hover:opacity-90"
          >
            Back to topics
          </button>
        </div>
      )}

      {quiz && quizPhase === "results" && (
        <div className="rounded-xl border border-border bg-muted/10 p-6 md:p-8 space-y-8 w-full min-w-0 max-w-full">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Session complete</h2>
            <p className="text-lg font-medium text-foreground">Show results</p>
            {aiAttemptedCount > 0 ? (
              <p className="text-3xl font-semibold text-foreground tabular-nums">
                {score} / {aiAttemptedCount} correct
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">No questions were completed in this session.</p>
            )}
            {skippedInSession > 0 && (
              <p className="text-sm text-muted-foreground">{skippedInSession} skipped (I&apos;m stuck)</p>
            )}
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {aiAttemptedCount > 0
                ? "Each completed question is listed below with your answer and the correct answer."
                : "Start a new session to practice again."}
            </p>
          </div>

          <div className="space-y-6 max-h-[min(70vh,800px)] overflow-y-auto pr-1">
            {aiAttemptedIndices.map((i) => {
              const q = quiz.questions[i];
              const sel = selections[i];
              const hasAnswer = sel !== undefined && sel !== null;
              const correct = hasAnswer && sel === q.correctIndex;
              const yourOpt = hasAnswer ? q.options[sel] : null;
              const correctOpt = q.options[q.correctIndex];
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-background p-4 md:p-5 text-left space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground tabular-nums">Q{i + 1}</span>
                    {stuckSteps[i] ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                        Skipped
                      </span>
                    ) : hasAnswer ? (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          correct
                            ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                            : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                        }`}
                      >
                        {correct ? "Correct" : "Incorrect"}
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        No answer
                      </span>
                    )}
                  </div>
                  <QuestionPromptBlock q={q} questionIndex={i} variant="results" />
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="font-medium text-foreground">Your answer: </span>
                      {stuckSteps[i] ? (
                        <span className="text-muted-foreground">Skipped (answer shown during session)</span>
                      ) : hasAnswer ? (
                        <span className="text-foreground">
                          <span className="font-mono font-medium">{optionLetter(sel)}.</span> {yourOpt}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No answer</span>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Correct answer: </span>
                      <span className="text-foreground">
                        <span className="font-mono font-medium">{optionLetter(q.correctIndex)}.</span>{" "}
                        {correctOpt}
                      </span>
                    </div>
                  </div>
                  {q.explanation && (
                    <p className="text-xs text-muted-foreground border-t border-border pt-3">
                      <span className="font-medium text-foreground">Why: </span>
                      {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={resetQuiz}
              className="px-6 py-3 bg-foreground text-background font-medium rounded-lg hover:opacity-90"
            >
              New session
            </button>
          </div>
        </div>
      )}

      {quiz && quizPhase === "playing" && (() => {
        const qi = currentIndex;
        const q = quiz.questions[qi];
        const selected = selections[qi];
        const revealed = !!checkedSteps[qi];
        const questionsAnswered = quiz.questions.reduce(
          (acc, _, i) => acc + (checkedSteps[i] ? 1 : 0),
          0
        );
        const questionsCorrect = quiz.questions.reduce((acc, _, i) => {
          if (!checkedSteps[i] || stuckSteps[i]) return acc;
          return acc + (selections[i] === quiz.questions[i].correctIndex ? 1 : 0);
        }, 0);
        return (
          <div className="space-y-3">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm">
                {error}
              </div>
            )}
            <StudySessionProgressHeader
              topicTitle={
                isDemoSession ? `${quiz.title} (demo)` : quiz.title
              }
              questionsAnswered={questionsAnswered}
              questionsCorrect={questionsCorrect}
              totalQuestions={quiz.questions.length}
              onEndSession={endSession}
            />
            {!isDemoSession &&
              (subject === "history" || subject === "science") &&
              getDueReviewTagKeys(studyMastery, subject).length > 0 && (
                <div className="rounded-lg border border-amber-200/80 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/25 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                  <span className="font-medium">Skills due for review: </span>
                  {getDueReviewTagKeys(studyMastery, subject)
                    .map((k) => skillTagLabel(subject, k))
                    .join(" · ")}
                </div>
              )}

            <div className="rounded-xl border border-border bg-muted/10 p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs font-medium text-muted-foreground tabular-nums px-2 py-0.5 rounded-full bg-muted/60 border border-border">
                  Question {qi + 1} of {quiz.questions.length}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                  {difficultyPillLabel(q.difficulty)}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                  {cognitivePillLabel(q.cognitiveLevel)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {skillTagLabel(subject, normalizeSkillTag(subject, q.skillTag))}
                </span>
              </div>
              <QuestionPromptBlock q={q} questionIndex={qi} variant="playing" />
              <ul className="space-y-2 pl-0 md:pl-2 mt-4">
                {q.options.map((opt, oi) => {
                  const isSelected = selected === oi;
                  const isCorrectOption = oi === q.correctIndex;
                  let ring = "border-border";
                  if (revealed) {
                    if (isCorrectOption) ring = "border-green-500 bg-green-50 dark:bg-green-950/20";
                    else if (isSelected && !isCorrectOption)
                      ring = "border-red-400 bg-red-50 dark:bg-red-950/20";
                  } else if (isSelected) {
                    ring = "border-primary ring-1 ring-primary";
                  }
                  return (
                    <li key={oi}>
                      <button
                        type="button"
                        onClick={() => selectOption(qi, oi)}
                        disabled={revealed}
                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${ring} ${
                          revealed ? "cursor-default" : "hover:bg-muted/40 cursor-pointer"
                        }`}
                      >
                        <span className="font-medium text-muted-foreground mr-2">
                          {optionLetter(oi)}.
                        </span>
                        {opt}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {revealed && q.explanation && (
                <p className="mt-4 text-sm text-muted-foreground border-t border-border pt-4">
                  <span className="font-medium text-foreground">Why: </span>
                  {q.explanation}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!revealed) checkCurrent();
                    else void goNext();
                  }}
                  disabled={
                    (!revealed && (selected === undefined || selected === null)) ||
                    (revealed && loadingMore)
                  }
                  className="px-5 py-2.5 bg-foreground text-background font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!revealed ? "Check" : loadingMore ? "Loading more…" : "Next question"}
                </button>
                <button
                  type="button"
                  onClick={imStuckAI}
                  disabled={revealed}
                  className="px-5 py-2.5 border border-border font-medium rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  I&apos;m stuck
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {inspectNoteSet &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex min-h-[100dvh] items-end sm:items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-set-inspect-title"
          >
            <button
              type="button"
              className="absolute inset-0 min-h-[100dvh] bg-black/50"
              onClick={() => setInspectNoteSet(null)}
              aria-label="Close"
            />
            <div className="relative z-10 w-full max-w-lg max-h-[min(90vh,640px)] overflow-hidden flex flex-col rounded-xl border border-border bg-background shadow-lg">
            <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
              <h2 id="note-set-inspect-title" className="text-lg font-semibold text-foreground pr-8">
                {inspectNoteSet.name}
              </h2>
              <button
                type="button"
                onClick={() => setInspectNoteSet(null)}
                className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Prompt (notes)
                </p>
                <pre className="whitespace-pre-wrap break-words text-foreground bg-muted/40 rounded-lg p-3 text-xs max-h-40 overflow-y-auto border border-border/80">
                  {inspectNoteSet.notes || "No notes provided"}
                </pre>
              </div>
              {inspectNoteSet.isDemo && inspectNoteSet.demoWeakness != null && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Current weakness (demo)
                  </p>
                  <p className="text-foreground leading-relaxed">{inspectNoteSet.demoWeakness}</p>
                </div>
              )}
              {inspectNoteSet.isDemo && inspectNoteSet.demoStrengths != null && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Strengths (demo)
                  </p>
                  <p className="text-foreground leading-relaxed">{inspectNoteSet.demoStrengths}</p>
                </div>
              )}
              {!inspectNoteSet.isDemo && (() => {
                const subj =
                  inspectNoteSet.subject === "science" ? "science" : "history";
                const low = getLowMasteryTagKeys(studyMastery, subj, 40);
                const strong = getHighMasteryTagKeys(studyMastery, subj, 60);
                const weakTopics = getTopWeakTopicKeys(studyWeakness, subj, 6);
                return (
                  <>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                        Current weakness
                      </p>
                      {weakTopics.length > 0 && (
                        <p className="text-foreground mb-2">
                          <span className="font-medium">Topics: </span>
                          {weakTopics.join(" · ")}
                        </p>
                      )}
                      {low.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1 text-foreground">
                          {low.map(({ tag, score }) => (
                            <li key={tag}>
                              {skillTagLabel(subj, tag)}{" "}
                              <span className="text-muted-foreground tabular-nums">
                                ({Math.round(score)}%)
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : weakTopics.length === 0 ? (
                        <p className="text-muted-foreground">No weakness data yet for this subject.</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                        Strengths
                      </p>
                      {strong.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1 text-foreground">
                          {strong.map((tag) => (
                            <li key={tag}>{skillTagLabel(subj, tag)}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No strength data yet for this subject.</p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            {!inspectNoteSet.isDemo && (
              <div className="p-4 border-t border-border flex justify-end">
                <button
                  type="button"
                  disabled={deletingNoteSet}
                  onClick={() => void handleDeleteInspectNoteSet()}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingNoteSet ? "Deleting…" : "Delete note set"}
                </button>
              </div>
            )}
          </div>
        </div>,
          document.body
        )}
    </div>
  );
}
