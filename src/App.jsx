import { useState, useEffect, useRef } from "react";
import "./App.css";

const HABITS = [
  { id: "gym",      label: "gym",        color: "#6B7FA3", bg: "#E8EDF5" },
  { id: "quran",    label: "quran",      color: "#8B7EC8", bg: "#EEEDFB" },
  { id: "reading",  label: "reading",    color: "#5B9FB5", bg: "#E0F0F5" },
  { id: "tv",       label: "tv ig&tt",   color: "#9B7EC0", bg: "#EDE8F7" },
  { id: "tj",       label: "tj tt",      color: "#5BA898", bg: "#E0F2EE" },
  { id: "ai",       label: "AI",         color: "#5A7FB8", bg: "#E3EBF7" },
  { id: "linkedin", label: "linkedin",   color: "#7BA8C8", bg: "#E5EFF7" },
  { id: "substack", label: "substack",   color: "#B87A6B", bg: "#F5E8E5" },
  { id: "econ",     label: "econ paper", color: "#6BA888", bg: "#E3F2EC" },
];
const WEEKLY_IDS = ["linkedin", "substack", "econ"];
const DAILY = HABITS.filter(h => !WEEKLY_IDS.includes(h.id));
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const pad = n => String(n).padStart(2, "0");
const dateKey = (y, m, d) => `${y}-${pad(m+1)}-${pad(d)}`;
const todayStr = () => { const t = new Date(); return dateKey(t.getFullYear(), t.getMonth(), t.getDate()); };
const getMondayKey = (y, m, d) => {
  const dt = new Date(y, m, d), day = dt.getDay();
  dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
  return dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
};
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const firstDayOffset = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };
const getKey = (hid, y, m, d) => WEEKLY_IDS.includes(hid) ? `w_${hid}_${getMondayKey(y, m, d)}` : `d_${hid}_${dateKey(y, m, d)}`;

function computeStreak(hid, checked) {
  let s = 0, d = new Date();
  while (true) {
    const k = WEEKLY_IDS.includes(hid)
      ? `w_${hid}_${getMondayKey(d.getFullYear(), d.getMonth(), d.getDate())}`
      : `d_${hid}_${dateKey(d.getFullYear(), d.getMonth(), d.getDate())}`;
    if (checked[k]) { s++; WEEKLY_IDS.includes(hid) ? d.setDate(d.getDate() - 7) : d.setDate(d.getDate() - 1); }
    else break;
  }
  return s;
}

function getMonthStats(y, m, checked) {
  const days = daysInMonth(y, m);
  return HABITS.map(h => {
    if (WEEKLY_IDS.includes(h.id)) {
      const wks = []; const d = new Date(y, m, 1);
      while (d.getMonth() === m) { const wk = getMondayKey(d.getFullYear(), d.getMonth(), d.getDate()); if (!wks.includes(wk)) wks.push(wk); d.setDate(d.getDate() + 7); }
      const done = wks.filter(wk => !!checked[`w_${h.id}_${wk}`]).length;
      return { ...h, done, possible: wks.length, pct: Math.round((done / wks.length) * 100) };
    }
    let done = 0;
    for (let dd = 1; dd <= days; dd++) if (!!checked[`d_${h.id}_${dateKey(y, m, dd)}`]) done++;
    return { ...h, done, possible: days, pct: Math.round((done / days) * 100) };
  });
}

function Confetti({ run }) {
  const ref = useRef();
  useEffect(() => {
    if (!run) return;
    const cv = ref.current; if (!cv) return;
    cv.width = cv.offsetWidth; cv.height = cv.offsetHeight;
    const ctx = cv.getContext("2d");
    const cols = ["#8B7EC8","#7BAFC4","#7AB5A0","#6B7FA3","#B87A6B"];
    let pts = Array.from({ length: 100 }, () => ({ x: Math.random() * cv.width, y: -10, vx: (Math.random() - .5) * 3, vy: Math.random() * 3 + 1.5, c: cols[Math.floor(Math.random() * cols.length)], s: Math.random() * 7 + 3, r: Math.random() * 360, vr: (Math.random() - .5) * 7, life: 1 }));
    let raf;
    const draw = () => { ctx.clearRect(0, 0, cv.width, cv.height); pts = pts.filter(p => p.life > 0); pts.forEach(p => { ctx.save(); ctx.globalAlpha = p.life; ctx.translate(p.x, p.y); ctx.rotate(p.r * Math.PI / 180); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore(); p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.r += p.vr; if (p.y > cv.height) p.life -= 0.06; }); if (pts.length) raf = requestAnimationFrame(draw); };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [run]);
  return <canvas ref={ref} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 999 }} />;
}

export default function App() {
  const now = new Date();
  const [view, setView] = useState("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [checked, setChecked] = useState(() => { try { return JSON.parse(localStorage.getItem("ht_checked") || "{}"); } catch { return {}; } });
  const [confetti, setConfetti] = useState(false);
  const [reflection, setReflection] = useState("");
  const [savedRefl, setSavedRefl] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const prevAllDone = useRef(false);
  const tk = todayStr();

  useEffect(() => {
    try {
      setReflection(localStorage.getItem(`ht_refl_${year}_${month}`) || "");
      setSavedRefl(localStorage.getItem(`ht_refl_${year}_${month}`) || "");
      setAnalysis(localStorage.getItem(`ht_analysis_${year}_${month}`) || "");
    } catch {}
  }, [year, month]);

  const persist = next => { try { localStorage.setItem("ht_checked", JSON.stringify(next)); } catch {} };
  const isDone = (hid, y, m, d) => !!checked[getKey(hid, y, m, d)];

  const toggle = (hid, y, m, d) => {
    const k = getKey(hid, y, m, d);
    const next = { ...checked, [k]: !checked[k] };
    setChecked(next); persist(next);
    const allDone = DAILY.every(h => next[`d_${h.id}_${tk}`]);
    if (allDone && !prevAllDone.current) { setConfetti(true); setTimeout(() => setConfetti(false), 4500); }
    prevAllDone.current = allDone;
  };

  const saveRefl = () => {
    try { localStorage.setItem(`ht_refl_${year}_${month}`, reflection); setSavedRefl(reflection); } catch {}
  };

  const generateAnalysis = async () => {
    setAnalysisLoading(true);
    const prevM = month === 0 ? 11 : month - 1, prevY = month === 0 ? year - 1 : year;
    const stats = getMonthStats(year, month, checked);
    const prevStats = getMonthStats(prevY, prevM, checked);
    const statsText = stats.map(h => `${h.label}: ${h.done}/${h.possible} (${h.pct}%)`).join(", ");
    const prevText = prevStats.map(h => `${h.label}: ${h.pct}%`).join(", ");
    const reflText = savedRefl || "(no reflection written)";

    const prompt = `You are a rigorous, honest habit coach — not a cheerleader. Your job is to tell this person what they NEED to hear, not what feels good. They have serious goals: building a content brand (Transcend Vintage on TikTok/Instagram, Transcend Journal on TikTok), growing their economics public intellectual presence (LinkedIn, Substack, nouronomics), deepening their AI knowledge, staying on top of academic economics, and maintaining their personal foundations (gym, Quran, reading). These habits are not optional — they are the direct inputs to the life and career they are building.

Your analysis must:
- Call out underperformance directly. If a habit is below 70%, say it plainly and explain the real-world cost of that gap.
- Identify blind spots — things they are probably rationalising or not seeing clearly.
- Point out if they are consistent in "easy" habits but avoiding harder ones.
- If last month was worse, say so and ask why. If it was better, ask what changed.
- Give 2-3 specific, actionable steps — not vague advice like "try harder". Concrete changes.
- Name the one habit whose neglect is most costly to their goals right now.
- Do not soften the truth with excessive praise. Acknowledge genuine wins briefly, then move on.

Structure (~280 words):
1. **Honest overview** — one blunt sentence about the month
2. **What actually went well** — only if genuinely earned, with numbers
3. **Where you're falling short** — specific habits, specific consequences for their goals
4. **Blind spot** — something they may not be seeing
5. **vs Last month** — better or worse, and what that trend means
6. **Your 3 actions for next month** — concrete, specific, non-negotiable

Data for ${MONTHS[month]} ${year}: ${statsText}
Last month (${MONTHS[prevM]} ${prevY}): ${prevText}
Their reflection: "${reflText}"

Be direct. Be specific. Reference actual numbers. Do not be cruel, but do not be soft.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "Unable to generate analysis.";
      setAnalysis(text);
      localStorage.setItem(`ht_analysis_${year}_${month}`, text);
    } catch { setAnalysis("Something went wrong. Check your API key in the .env file."); }
    setAnalysisLoading(false);
  };

  const navPrev = () => { if (view === "quarter") { setYear(y => y - 1); } else if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const navNext = () => { if (view === "quarter") { setYear(y => y + 1); } else if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  function getWeekLabel() {
    const today = new Date(), mon = new Date(today), day = mon.getDay();
    mon.setDate(today.getDate() + (day === 0 ? -6 : 1 - day));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return `${mon.getDate()} ${MONTHS[mon.getMonth()].slice(0, 3)} – ${sun.getDate()} ${MONTHS[sun.getMonth()].slice(0, 3)}`;
  }

  const navLabel = view === "quarter" ? `${year}` : view === "week" ? getWeekLabel() : `${MONTHS[month]} ${year}`;
  const btnStyle = v => ({ padding: "5px 14px", borderRadius: 8, fontSize: 13, fontWeight: view === v ? 500 : 400, cursor: "pointer", border: "none", background: view === v ? "white" : "transparent", color: view === v ? "#1a1a1a" : "#888", boxShadow: view === v ? "0 0 0 0.5px #ddd" : "none" });

  const todayDone = DAILY.filter(h => isDone(h.id, now.getFullYear(), now.getMonth(), now.getDate())).length;
  const days = daysInMonth(year, month);
  const monthStats = getMonthStats(year, month, checked);
  const dailyStats = monthStats.filter(h => !WEEKLY_IDS.includes(h.id));
  const monthDone = dailyStats.reduce((a, h) => a + h.done, 0);
  const monthPct = Math.round((monthDone / (DAILY.length * days)) * 100);
  const topStreak = Math.max(...HABITS.map(h => computeStreak(h.id, checked)), 0);

  function formatAnalysis(text) {
    return text.split("\n").map((line, i) => {
      if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
      const html = line.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
      return <div key={i} style={{ fontSize: 14, color: "#1a1a1a", lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: html }} />;
    });
  }

  return (
    <div className="app">
      <Confetti run={confetti} />

      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: "#1a1a1a" }}>Habit tracker</div>
        <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </div>

      <div className="stats-grid">
        <div style={{ background: "#E8EDF5", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#4A5B7A", marginBottom: 3 }}>today</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: todayDone === DAILY.length ? "#3B6D8A" : "#2C3E5A" }}>{todayDone}/{DAILY.length}</div>
          <div style={{ fontSize: 11, color: "#6B7FA3", marginTop: 2 }}>{todayDone === DAILY.length ? "all done!" : "habits done"}</div>
        </div>
        <div style={{ background: "#EEEDFB", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#5A4A8A", marginBottom: 3 }}>this month</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: monthPct >= 80 ? "#534AB7" : "#3C3489" }}>{monthPct}%</div>
          <div style={{ height: 4, borderRadius: 2, background: "#CCC9F0", marginTop: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${monthPct}%`, background: "#8B7EC8", borderRadius: 2, transition: "width 0.4s" }} />
          </div>
        </div>
        <div style={{ background: "#E0F2EE", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#3A7A68", marginBottom: 3 }}>best streak</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: "#5BA898" }}>{topStreak}d</div>
          <div style={{ fontSize: 11, color: "#5BA898", marginTop: 2 }}>keep going</div>
        </div>
      </div>

      <div className="nav-row">
        <div style={{ display: "flex", gap: 2, background: "#f0f0f0", padding: 3, borderRadius: 10 }}>
          <button style={btnStyle("month")} onClick={() => setView("month")}>Month</button>
          <button style={btnStyle("week")} onClick={() => setView("week")}>Week</button>
          <button style={btnStyle("quarter")} onClick={() => setView("quarter")}>Quarter</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="nav-btn" onClick={navPrev}>←</button>
          <span style={{ fontSize: 14, fontWeight: 500, minWidth: 120, textAlign: "center" }}>{navLabel}</span>
          <button className="nav-btn" onClick={navNext}>→</button>
        </div>
      </div>

      {view === "month" && <MonthView year={year} month={month} checked={checked} toggle={toggle} isDone={isDone} tk={tk} />}
      {view === "week" && <WeekView checked={checked} toggle={toggle} isDone={isDone} tk={tk} computeStreak={computeStreak} />}
      {view === "quarter" && <QuarterView year={year} checked={checked} isDone={isDone} tk={tk} />}

      {view === "month" && (
        <div style={{ marginTop: "1.5rem" }}>
          <div className="section-label">Month roundup</div>
          <div className="card" style={{ marginBottom: "1rem" }}>
            {monthStats.map((h, i) => (
              <div key={h.id} style={{ marginBottom: i < monthStats.length - 1 ? 12 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: "#1a1a1a" }}>{h.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: h.pct >= 80 ? h.color : "#888" }}>{h.done}/{h.possible} — {h.pct}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: "#f0f0f0", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${h.pct}%`, background: h.color, borderRadius: 3, transition: "width 0.4s" }} />
                </div>
              </div>
            ))}
          </div>

          <div className="section-label">AI analysis</div>
          {analysis ? (
            <div style={{ background: "#FFFBEA", border: "0.5px solid #E8D44D", borderRadius: 12, padding: 16, marginBottom: "1rem" }}>
              {formatAnalysis(analysis)}
              <button onClick={generateAnalysis} disabled={analysisLoading} className="ghost-btn" style={{ marginTop: 14, fontSize: 12, color: "#888" }}>
                {analysisLoading ? "Analysing..." : "Regenerate"}
              </button>
            </div>
          ) : (
            <div style={{ background: "#FFFBEA", border: "0.5px solid #E8D44D", borderRadius: 12, padding: 16, marginBottom: "1rem" }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#7A6000", marginBottom: 6 }}>Get your {MONTHS[month]} breakdown</div>
              <div style={{ fontSize: 13, color: "#A07800", lineHeight: 1.6, marginBottom: 12 }}>Honest stats roundup, comparison to last month, blind spot analysis, and 3 non-negotiable actions for next month.</div>
              <button onClick={generateAnalysis} disabled={analysisLoading}
                style={{ padding: "8px 18px", borderRadius: 8, background: "#E8C200", border: "none", color: "#3A3000", fontSize: 13, fontWeight: 500, cursor: analysisLoading ? "default" : "pointer", opacity: analysisLoading ? 0.7 : 1 }}>
                {analysisLoading ? "Analysing your month..." : "Generate analysis"}
              </button>
            </div>
          )}

          <div className="section-label">Monthly reflection</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1rem" }}>
            {[
              { q: "What did I do well this month?", sub: "Reinforce your identity — 'I am someone who...'", col: "#8B7EC8", bg: "#EEEDFB" },
              { q: "Where did I slip, and what got in the way?", sub: "Look for patterns, not blame.", col: "#5B9FB5", bg: "#E0F0F5" },
              { q: "What was my biggest obstacle?", sub: "External circumstance or internal resistance?", col: "#6BA888", bg: "#E3F2EC" },
              { q: "Which habit do I want to double down on next month?", sub: "Pick one. Specificity beats ambition.", col: "#9B7EC0", bg: "#EDE8F7" },
              { q: "What's one achievement this month I'm proud of?", sub: "Big or small — claim it.", col: "#B87A6B", bg: "#F5E8E5" },
            ].map((p, i) => (
              <div key={i} style={{ background: p.bg, borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${p.col}` }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: p.col, marginBottom: 2 }}>{p.q}</div>
                <div style={{ fontSize: 11, color: p.col, opacity: 0.75 }}>{p.sub}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <textarea value={reflection} onChange={e => setReflection(e.target.value)} placeholder={`Reflect on ${MONTHS[month]}...`}
              style={{ width: "100%", minHeight: 120, border: "none", outline: "none", resize: "vertical", fontSize: 14, lineHeight: 1.6, boxSizing: "border-box", fontFamily: "inherit", background: "transparent", color: "#1a1a1a" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "0.5px solid #eee", paddingTop: 10, marginTop: 6, alignItems: "center" }}>
              {savedRefl === reflection && savedRefl && <span style={{ fontSize: 12, color: "#888" }}>Saved</span>}
              <button onClick={saveRefl} className="ghost-btn">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthView({ year, month, checked, toggle, isDone, tk }) {
  const days = daysInMonth(year, month), offset = firstDayOffset(year, month);
  const cells = Array.from({ length: offset + days }, (_, i) => i < offset ? null : i - offset + 1);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  return (
    <div className="cal-grid">
      <div className="cal-header">
        {DAYS_SHORT.map((d, i) => <div key={i} className="cal-day-head" style={{ borderRight: i < 6 ? "0.5px solid #eee" : "none" }}>{d}</div>)}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="cal-week" style={{ borderBottom: wi < weeks.length - 1 ? "0.5px solid #eee" : "none" }}>
          {week.map((day, di) => {
            const dk = day ? dateKey(year, month, day) : null, isToday = dk === tk, isFuture = dk && dk > tk;
            return (
              <div key={di} className="cal-cell" style={{ borderRight: di < 6 ? "0.5px solid #eee" : "none", background: isToday ? "#EEF2FA" : "transparent" }}>
                {day && (<>
                  <div className="cal-date" style={{ fontWeight: isToday ? 500 : 400, color: isToday ? "#3A5080" : "#aaa" }}>{day}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {HABITS.map(h => {
                      const done = isDone(h.id, year, month, day);
                      return (
                        <button key={h.id} onClick={() => !isFuture && toggle(h.id, year, month, day)}
                          style={{ display: "flex", alignItems: "center", gap: 4, background: done ? h.bg : "transparent", border: `0.5px solid ${done ? h.color : "transparent"}`, borderRadius: 4, cursor: isFuture ? "default" : "pointer", padding: "1px 3px", opacity: isFuture ? 0.3 : 1, textAlign: "left", width: "100%", transition: "all 0.12s", boxSizing: "border-box" }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, border: `1.5px solid ${h.color}`, background: done ? h.color : "transparent", flexShrink: 0, transition: "all 0.12s" }} />
                          <span style={{ fontSize: 12, color: done ? h.color : "#999", textDecoration: done ? "line-through" : "none", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: done ? 500 : 400 }}>{h.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function WeekView({ checked, toggle, isDone, tk, computeStreak }) {
  const today = new Date(), mon = new Date(today), day = mon.getDay();
  mon.setDate(today.getDate() + (day === 0 ? -6 : 1 - day));
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
  const dayCounts = weekDates.map(d => DAILY.filter(h => !!checked[`d_${h.id}_${dateKey(d.getFullYear(), d.getMonth(), d.getDate())}`]).length);
  const bestDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
  return (
    <div>
      <div className="week-grid">
        <div style={{ borderRight: "0.5px solid #eee", borderBottom: "0.5px solid #eee", padding: "8px 12px", fontSize: 11, color: "#888", fontWeight: 500 }}>habit</div>
        {weekDates.map((d, i) => {
          const isToday = dateKey(d.getFullYear(), d.getMonth(), d.getDate()) === tk, isBest = i === bestDayIdx && dayCounts[i] > 0;
          return (
            <div key={i} style={{ borderRight: i < 6 ? "0.5px solid #eee" : "none", borderBottom: "0.5px solid #eee", padding: "8px 4px", textAlign: "center", background: isToday ? "#EEF2FA" : "transparent" }}>
              <div style={{ fontSize: 11, fontWeight: isToday ? 500 : 400, color: isToday ? "#3A5080" : "#888" }}>{DAYS_SHORT[i]}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: isToday ? "#3A5080" : "#1a1a1a" }}>{d.getDate()}</div>
              {isBest && <div style={{ fontSize: 9, color: "#8B7EC8", fontWeight: 500, marginTop: 1 }}>best</div>}
            </div>
          );
        })}
        {HABITS.map((h, hi) => (
          <>
            <div key={`l${h.id}`} style={{ borderRight: "0.5px solid #eee", borderBottom: hi < HABITS.length - 1 ? "0.5px solid #eee" : "none", padding: "9px 12px", display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, border: `1.5px solid ${h.color}`, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#1a1a1a" }}>{h.label}</span>
              {computeStreak(h.id, checked) > 0 && <span style={{ fontSize: 10, fontWeight: 500, color: h.color, marginLeft: "auto" }}>{computeStreak(h.id, checked)}{WEEKLY_IDS.includes(h.id) ? "w" : "d"}</span>}
            </div>
            {weekDates.map((d, di) => {
              const dk = dateKey(d.getFullYear(), d.getMonth(), d.getDate()), done = isDone(h.id, d.getFullYear(), d.getMonth(), d.getDate()), isFuture = dk > tk, isToday = dk === tk;
              return (
                <div key={`${h.id}_${di}`} style={{ borderRight: di < 6 ? "0.5px solid #eee" : "none", borderBottom: hi < HABITS.length - 1 ? "0.5px solid #eee" : "none", background: done ? h.bg : isToday ? "#EEF2FA" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.12s" }}>
                  <button onClick={() => !isFuture && toggle(h.id, d.getFullYear(), d.getMonth(), d.getDate())}
                    style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${h.color}`, background: done ? h.color : "transparent", cursor: isFuture ? "default" : "pointer", opacity: isFuture ? 0.3 : 1, transition: "all 0.12s", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                </div>
              );
            })}
          </>
        ))}
      </div>
      <div className="week-completion">
        <div style={{ fontSize: 11, color: "#888", padding: "4px 12px", alignSelf: "center" }}>completion</div>
        {weekDates.map((d, i) => {
          const dk = dateKey(d.getFullYear(), d.getMonth(), d.getDate()), cnt = DAILY.filter(h => !!checked[`d_${h.id}_${dk}`]).length, pct = Math.round((cnt / DAILY.length) * 100);
          return (
            <div key={i} style={{ padding: "4px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: pct === 100 ? "#5BA898" : "#888", marginBottom: 3 }}>{pct}%</div>
              <div style={{ height: 3, borderRadius: 2, background: "#f0f0f0" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: i === bestDayIdx && cnt > 0 ? "#8B7EC8" : "#7BA8C8", borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuarterView({ year, checked, isDone, tk }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: "1rem" }}>Daily habit completion heatmap — {year}</div>
      {[0, 1, 2, 3].map(q => (
        <div key={q} style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", marginBottom: 8 }}>Q{q + 1} — {MONTHS[q * 3]}–{MONTHS[q * 3 + 2]}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {DAILY.map(h => {
              const months = [q * 3, q * 3 + 1, q * 3 + 2];
              const total = months.reduce((a, m) => a + Array.from({ length: daysInMonth(year, m) }, (_, di) => isDone(h.id, year, m, di + 1) ? 1 : 0).reduce((x, y) => x + y, 0), 0);
              const possible = months.reduce((a, m) => a + daysInMonth(year, m), 0);
              const pct = Math.round((total / possible) * 100);
              return (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "#888", width: 72, flexShrink: 0, textAlign: "right" }}>{h.label}</div>
                  <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    {months.map(m => Array.from({ length: daysInMonth(year, m) }, (_, di) => {
                      const dk = dateKey(year, m, di + 1), done = isDone(h.id, year, m, di + 1), isFuture = dk > tk;
                      return <div key={`${m}_${di}`} title={`${MONTHS[m]} ${di + 1}`} style={{ width: 9, height: 9, borderRadius: 2, background: done ? h.color : isFuture ? "transparent" : "#f0f0f0", border: `0.5px solid ${done ? h.color : "#eee"}`, flexShrink: 0 }} />;
                    }))}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: h.color, flexShrink: 0 }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}