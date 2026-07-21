// src/components/ResumeGeneratingOverlay.jsx
/**
 * Story-mode overlay — cinematic chapters + fun facts + live counters.
 * Students won't be bored: witty captions, rotating hiring facts, and
 * live counters make the wait feel short and entertaining.
 * Pure CSS/div — no SVG anywhere.
 */
import React, { useState, useEffect, useRef } from 'react';

/* ── Scene definitions — witty captions ────────────────────────── */
const SCENES = [
  {
    id:       'scan',
    label:    'Step 1 of 4',
    title:    'Reading your profile',
    caption:  'Reading every detail — skills, experience, education, and more. Nothing gets missed.',
    duration: 3800,
  },
  {
    id:       'write',
    label:    'Step 2 of 4',
    title:    'Writing your content',
    caption:  'Translating your experience into language that resonates with recruiters.',
    duration: 4000,
  },
  {
    id:       'layout',
    label:    'Step 3 of 4',
    title:    'Designing the layout',
    caption:  'Building a clean, balanced layout that is easy to read at a glance.',
    duration: 3800,
  },
  {
    id:       'render',
    label:    'Step 4 of 4',
    title:    'Generating your PDF',
    caption:  'Almost there — your resume is moments away from being ready.',
    duration: 3800,
  },
];

/* ── Rotating hiring facts ─────────────────────────────────────── */
const FACTS = [
  { emoji: '⏱️', text: 'Recruiters spend just 7 seconds on a resume. Every word here is chosen with that in mind.' },
  { emoji: '🤖', text: '75% of resumes never reach a human — ATS filters them first. Yours is built to get through.' },
  { emoji: '📈', text: 'Resumes with numbers and results get 40% more callbacks. We have already added yours.' },
  { emoji: '🎯', text: 'Tailoring your resume to the role increases shortlisting by up to 60%. Worth every second of this wait.' },
  { emoji: '📄', text: 'The average job opening gets 250+ applications. A strong resume is your first competitive edge.' },
  { emoji: '✨', text: 'Clean formatting doubles your chance of being shortlisted — that is why layout matters here.' },
  { emoji: '🔑', text: 'The right keywords can lift your ATS score by 50%. We scan for them automatically.' },
  { emoji: '💬', text: 'Interviewers form impressions fast — a polished resume sets the tone before you even walk in.' },
  { emoji: '📝', text: 'For under 10 years of experience, one focused page outperforms two every time.' },
  { emoji: '📊', text: 'Following up after applying makes you 30% more likely to hear back. Do not skip that step.' },
];

/* ── Fact ticker component ─────────────────────────────────────── */
function FactsTicker() {
  const [idx,     setIdx]     = useState(() => Math.floor(Math.random() * FACTS.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % FACTS.length);
        setVisible(true);
      }, 420);
    }, 4200);
    return () => clearInterval(id);
  }, []);

  const fact = FACTS[idx];
  return (
    <div className="rgo-facts-wrap">
      <span className="rgo-facts-label">💡 Worth knowing</span>
      <div className={`rgo-fact ${visible ? 'rgo-fact-in' : 'rgo-fact-out'}`}>
        <span className="rgo-fact-emoji">{fact.emoji}</span>
        <span className="rgo-fact-text">{fact.text}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Scene visuals — pure CSS, no SVG
   ───────────────────────────────────────────────────────────────── */

/** Scene 1: Profile card + scan beam + live "fields found" counter */
function ScanScene() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const target = 14 + Math.floor(Math.random() * 9); // 14-22 fields
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setCount(n);
      if (n >= target) clearInterval(id);
    }, 160 + Math.random() * 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="sv sv-scan">
      <div className="sv-scan-card">
        <div className="sv-scan-top">
          <div className="sv-scan-avatar" />
          <div className="sv-scan-namelines">
            <div className="sv-scan-nameline" />
            <div className="sv-scan-nameline sv-scan-nameline--short" />
          </div>
          <div className="sv-scan-ping" />
        </div>
        <div className="sv-scan-rows">
          {[88, 74, 92, 60, 78].map((w, i) => (
            <div key={i} className="sv-scan-row"
              style={{ '--row-width': `${w}%`, '--row-delay': `${i * 0.18}s` }} />
          ))}
        </div>
        <div className="sv-scan-beam" />
      </div>
      <p className="sv-caption">
        {count > 0 ? `${count} data points captured` : 'Initialising scan…'}
      </p>
    </div>
  );
}

/** Scene 2: Typewriter lines + blinking cursor + word counter */
function WriteScene() {
  const [words, setWords] = useState(0);

  useEffect(() => {
    const target = 85 + Math.floor(Math.random() * 55); // 85-140 words
    let current = 0;
    const id = setInterval(() => {
      current += Math.floor(Math.random() * 7) + 3;
      if (current >= target) { setWords(target); clearInterval(id); }
      else setWords(current);
    }, 110);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="sv sv-write">
      <div className="sv-write-doc">
        <div className="sv-write-heading" />
        {[88, 75, 92, 68, 82, 71, 58].map((w, i) => (
          <div key={i} className="sv-write-line"
            style={{ '--lw': `${w}%`, '--ld': `${i * 0.32}s` }} />
        ))}
        <div className="sv-write-cursor" />
      </div>
      <p className="sv-caption">
        {words > 0 ? `${words} words written` : 'Opening document…'}
      </p>
    </div>
  );
}

/** Scene 3: Resume skeleton assembling + section counter */
function LayoutScene() {
  const [sections, setSections] = useState(0);
  const MAX = 4;

  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setSections(n);
      if (n >= MAX) clearInterval(id);
    }, 900);
    return () => clearInterval(id);
  }, []);

  const labels = ['Header', 'Experience', 'Skills', 'Education'];

  return (
    <div className="sv sv-layout">
      <div className="sv-layout-doc">
        <div className="sv-layout-header" />
        <div className="sv-layout-body">
          <div className="sv-layout-sidebar">
            {[62, 80, 50, 72, 44].map((w, i) => (
              <div key={i} className="sv-layout-sb-line"
                style={{ '--sw': `${w}%`, '--sd': `${i * 0.22}s` }} />
            ))}
          </div>
          <div className="sv-layout-main">
            <div className="sv-layout-sec-title" style={{ '--std': '0.1s' }} />
            {[85, 70, 90].map((w, i) => (
              <div key={i} className="sv-layout-ml"
                style={{ '--mw': `${w}%`, '--md': `${0.45 + i * 0.22}s` }} />
            ))}
            <div className="sv-layout-sec-title" style={{ '--std': '1.3s' }} />
            {[78, 64].map((w, i) => (
              <div key={i} className="sv-layout-ml"
                style={{ '--mw': `${w}%`, '--md': `${1.6 + i * 0.22}s` }} />
            ))}
          </div>
        </div>
      </div>
      <p className="sv-caption">
        {sections > 0
          ? `${labels[sections - 1]} placed — ${sections} of ${MAX} done`
          : 'Building structure…'}
      </p>
    </div>
  );
}

/** Scene 4: Page fill + shimmer + animated export bar + % counter */
function RenderScene() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p += Math.random() * 4 + 1.5;
      if (p >= 94) { setPct(94); clearInterval(id); }
      else setPct(Math.round(p));
    }, 130);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="sv sv-render">
      <div className="sv-render-page">
        <div className="sv-render-fill" />
        <div className="sv-render-shimmer" />
        <div className="sv-render-content">
          {[78, 64, 88, 54, 72].map((w, i) => (
            <div key={i} className="sv-render-line"
              style={{ '--rlw': `${w}%`, '--rld': `${0.4 + i * 0.3}s` }} />
          ))}
        </div>
      </div>
      <div className="sv-render-export">
        <div className="sv-render-track">
          <div className="sv-render-bar" style={{ width: `${pct}%`, transition: 'width 0.15s ease' }} />
        </div>
        <span className="sv-render-label">Generating PDF — {pct}% complete</span>
      </div>
    </div>
  );
}

const SCENE_COMPONENTS = {
  scan:   ScanScene,
  write:  WriteScene,
  layout: LayoutScene,
  render: RenderScene,
};

/* ─────────────────────────────────────────────────────────────────
   Main overlay
   ───────────────────────────────────────────────────────────────── */
export default function ResumeGeneratingOverlay({ visible }) {
  const [idx,      setIdx]      = useState(0);
  const [progress, setProgress] = useState(0);
  const [exiting,  setExiting]  = useState(false);
  const rafRef   = useRef(null);
  const startRef = useRef(null);

  const nextScene = () => {
    setExiting(true);
    setTimeout(() => {
      setIdx(i => (i + 1) % SCENES.length);
      setProgress(0);
      setExiting(false);
    }, 380);
  };

  useEffect(() => {
    if (!visible) {
      cancelAnimationFrame(rafRef.current);
      setIdx(0);
      setProgress(0);
      setExiting(false);
      return;
    }
    const duration = SCENES[idx].duration;
    startRef.current = performance.now();
    const tick = (now) => {
      const pct = Math.min(((now - startRef.current) / duration) * 100, 100);
      setProgress(pct);
      if (pct < 100) rafRef.current = requestAnimationFrame(tick);
      else nextScene();
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, idx]); // eslint-disable-line

  if (!visible) return null;

  const scene   = SCENES[idx];
  const SceneEl = SCENE_COMPONENTS[scene.id];

  return (
    <div className="rgo-overlay" aria-modal="true" role="dialog" aria-label="Generating resume">
      <div className="rgo-backdrop" />

      <div className="rgo-card">

        {/* ── Story progress bars ── */}
        <div className="rgo-bars" aria-hidden="true">
          {SCENES.map((_, i) => (
            <div key={i} className="rgo-bar-track">
              <div
                className="rgo-bar-fill"
                style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* ── Chapter header ── */}
        <div className={`rgo-header ${exiting ? 'rgo-out' : 'rgo-in'}`} key={`h-${idx}`}>
          <span className="rgo-chapter">{scene.label}</span>
          <h2 className="rgo-title">{scene.title}</h2>
          <p className="rgo-caption">{scene.caption}</p>
        </div>

        {/* ── Scene visual ── */}
        <div className={`rgo-scene-wrap ${exiting ? 'rgo-out' : 'rgo-in'}`} key={`s-${idx}`}>
          <SceneEl />
        </div>

        {/* ── Rotating fun facts ── */}
        <FactsTicker />

      </div>
    </div>
  );
}
