import { useState, useEffect, useCallback } from "react";

// ── Firebase ──────────────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCghP_tQelW2TFDmWdEnOCY-t8ogoKvLO4",
  authDomain: "mirae-journal.firebaseapp.com",
  projectId: "mirae-journal",
  storageBucket: "mirae-journal.firebasestorage.app",
  messagingSenderId: "1062764613182",
  appId: "1:1062764613182:web:f372fc7cf16b1661ce4b6f",
  measurementId: "G-L4GV33S89B"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── 상수 ──────────────────────────────────────────────────────────────────────
const QUESTIONS = [
  { id: "gratitude",   emoji: "🌸", label: "감사",    text: "오늘 감사한 것 3가지를 적어보세요.",                       color: "#f472b6" },
  { id: "purpose",     emoji: "🧭", label: "존재이유", text: "나는 왜 살고 있나요? 왜 지금 이 일을 하고 있나요?",       color: "#a78bfa" },
  { id: "flow",        emoji: "⚡", label: "몰입",    text: "오늘 시간 가는 줄 모르고 빠져든 것이 있었나요?",           color: "#fbbf24" },
  { id: "leadership",  emoji: "💪", label: "리더십",  text: "오늘 내가 실천한 리더십이 있었나요?",                     color: "#34d399" },
  { id: "influence",   emoji: "🌟", label: "영향력",  text: "오늘 선한 영향력을 끼친 사람이 있다면 누구인가요?",        color: "#60a5fa" },
  { id: "emotion",     emoji: "🔥", label: "감정",    text: "오늘 가장 화가 났던 순간을 적어보세요.",                   color: "#fb923c" },
];

const MOODS = ["😊","😐","😔","😡","🥰","😰","✨"];

const TABS = [
  { id: "home",     label: "홈",     emoji: "🏠" },
  { id: "journal",  label: "저널",   emoji: "📓" },
  { id: "ai",       label: "AI 대화", emoji: "🤖" },
  { id: "insight",  label: "인사이트", emoji: "📊" },
];

// ── 유틸 ──────────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function FutureJournal() {
  const [tab, setTab]         = useState("home");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState("");

  // 저널 작성 상태
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({});
  const [mood, setMood]       = useState("");
  const [saving, setSaving]   = useState(false);

  // AI 대화
  const [messages, setMessages] = useState([
    { role: "ai", text: "안녕하세요 😊 오늘 어떤 마음으로 하루를 보내셨나요? 편하게 말씀해 주세요." }
  ]);
  const [aiInput, setAiInput]   = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // ── Firebase에서 불러오기 ───────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, "journals"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  // ── 저장 ───────────────────────────────────────────────────────────────────
  const saveJournal = async () => {
    if (Object.keys(answers).length < QUESTIONS.length) {
      showToast("모든 질문에 답해주세요 😊"); return;
    }
    setSaving(true);
    try {
      const doc = { date: today(), mood, answers, createdAt: serverTimestamp() };
      const ref = await addDoc(collection(db, "journals"), doc);
      setEntries(prev => [{ id: ref.id, ...doc, createdAt: new Date() }, ...prev]);
      setAnswers({}); setMood(""); setStep(0);
      showToast("저장됐어요 ✓ Firebase에 안전하게 저장됐어요!");
      setTab("home");
    } catch (e) {
      showToast("저장 실패 😢 다시 시도해주세요");
    } finally {
      setSaving(false);
    }
  };

  // ── AI 대화 ────────────────────────────────────────────────────────────────
  const sendAI = useCallback(async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setAiLoading(true);

    const recentEntries = entries.slice(0, 5).map(e =>
      `[${e.date}] 감사:${e.answers?.gratitude||""} / 감정:${e.answers?.emotion||""}`
    ).join("\n");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `당신은 미래저널의 AI 동반자입니다. 사용자의 자기성찰과 성장을 돕습니다.
9번째 지능(메타인지)과 서번트 리더십을 바탕으로 따뜻하고 깊이 있는 대화를 나눕니다.
사용자의 최근 저널 데이터: ${recentEntries || "아직 없음"}
짧고 따뜻하게 답하세요. 한국어로 답하세요.`,
          messages: [
            ...messages.filter(m => m.role !== "ai" || messages.indexOf(m) > 0)
              .map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text })),
            { role: "user", content: userMsg }
          ]
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "잠시 후 다시 시도해주세요 😊";
      setMessages(prev => [...prev, { role: "ai", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "연결이 일시적으로 끊겼어요. 잠시 후 다시 시도해주세요 😊" }]);
    } finally {
      setAiLoading(false);
    }
  }, [aiInput, aiLoading, messages, entries]);

  // ── 인사이트 ───────────────────────────────────────────────────────────────
  const moodCount = entries.reduce((acc, e) => {
    if (e.mood) acc[e.mood] = (acc[e.mood] || 0) + 1;
    return acc;
  }, {});
  const topMood = Object.entries(moodCount).sort((a,b) => b[1]-a[1])[0]?.[0] || "😊";

  const keywords = entries.flatMap(e =>
    Object.values(e.answers || {}).join(" ").split(/[\s,。，、.!?]+/)
  ).filter(w => w.length > 1);
  const kwCount = keywords.reduce((a,w) => { a[w]=(a[w]||0)+1; return a; }, {});
  const topKw = Object.entries(kwCount).sort((a,b)=>b[1]-a[1]).slice(0,12);

  // ── 렌더 ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:"100vh", background:"#0f0a1e",
      fontFamily:"'Noto Serif KR', Georgia, serif",
      color:"#e2d9f3", display:"flex", flexDirection:"column",
      maxWidth:480, margin:"0 auto", position:"relative", overflow:"hidden"
    }}>
      {/* 배경 별빛 */}
      <div style={{ position:"fixed", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
        {[...Array(30)].map((_,i) => (
          <div key={i} style={{
            position:"absolute",
            left:`${Math.random()*100}%`, top:`${Math.random()*100}%`,
            width: i%5===0?3:2, height: i%5===0?3:2,
            borderRadius:"50%", background:"#fff",
            opacity: 0.1 + Math.random()*0.4,
            animation:`twinkle ${2+Math.random()*3}s ease-in-out infinite`,
            animationDelay:`${Math.random()*3}s`
          }}/>
        ))}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;600;700&display=swap');
        @keyframes twinkle { 0%,100%{opacity:0.1} 50%{opacity:0.6} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        * { box-sizing:border-box; }
        textarea:focus, input:focus { outline:none; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#4c1d95; border-radius:2px; }
      `}</style>

      {/* 토스트 */}
      {toast && (
        <div style={{
          position:"fixed", top:20, left:"50%", transform:"translateX(-50%)",
          background:"#7c3aed", color:"#fff", padding:"10px 20px",
          borderRadius:20, fontSize:13, zIndex:1000, whiteSpace:"nowrap",
          animation:"fadeUp .3s ease", boxShadow:"0 4px 20px rgba(124,58,237,.5)"
        }}>{toast}</div>
      )}

      {/* 헤더 */}
      <div style={{
        position:"sticky", top:0, zIndex:10,
        background:"rgba(15,10,30,.9)", backdropFilter:"blur(12px)",
        borderBottom:"1px solid rgba(124,58,237,.2)",
        padding:"16px 20px 12px", textAlign:"center"
      }}>
        <div style={{ fontSize:11, color:"#a78bfa", letterSpacing:3, marginBottom:2 }}>AI시대 미래저널</div>
        <div style={{ fontSize:18, fontWeight:700, color:"#e9d5ff" }}>나를 알아야 미래가 보인다</div>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 80px", position:"relative", zIndex:1 }}>
        {loading ? (
          <div style={{ textAlign:"center", paddingTop:60, color:"#a78bfa" }}>불러오는 중...</div>
        ) : (
          <>
            {tab === "home"    && <HomeTab entries={entries} topMood={topMood} setTab={setTab} />}
            {tab === "journal" && (
              <JournalTab
                step={step} setStep={setStep}
                answers={answers} setAnswers={setAnswers}
                mood={mood} setMood={setMood}
                saving={saving} onSave={saveJournal}
              />
            )}
            {tab === "ai" && (
              <AITab messages={messages} aiInput={aiInput}
                setAiInput={setAiInput} onSend={sendAI} aiLoading={aiLoading} />
            )}
            {tab === "insight" && <InsightTab entries={entries} topKw={topKw} moodCount={moodCount} />}
          </>
        )}
      </div>

      {/* 하단 네비 */}
      <nav style={{
        position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
        width:"100%", maxWidth:480,
        background:"rgba(15,10,30,.95)", backdropFilter:"blur(12px)",
        borderTop:"1px solid rgba(124,58,237,.25)",
        display:"flex", zIndex:20
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:"10px 0", border:"none", background:"transparent",
            color: tab===t.id ? "#c4b5fd" : "#6b5e8a",
            cursor:"pointer", fontSize:10, display:"flex", flexDirection:"column",
            alignItems:"center", gap:3, transition:"color .2s"
          }}>
            <span style={{ fontSize:18 }}>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── 홈 탭 ─────────────────────────────────────────────────────────────────────
function HomeTab({ entries, topMood, setTab }) {
  const todayEntry = entries.find(e => e.date === today());
  return (
    <div style={{ animation:"fadeUp .4s ease" }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:48, marginBottom:8 }}>🌙</div>
        <div style={{ fontSize:14, color:"#c4b5fd" }}>
          {new Date().toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric", weekday:"long" })}
        </div>
      </div>

      {/* 오늘 저널 여부 */}
      <div style={{
        background: todayEntry ? "rgba(52,211,153,.1)" : "rgba(124,58,237,.15)",
        border:`1px solid ${todayEntry ? "rgba(52,211,153,.3)" : "rgba(124,58,237,.3)"}`,
        borderRadius:16, padding:20, marginBottom:16, textAlign:"center"
      }}>
        {todayEntry ? (
          <>
            <div style={{ fontSize:32, marginBottom:6 }}>✨</div>
            <div style={{ fontWeight:600, color:"#34d399" }}>오늘 저널을 완성했어요!</div>
            <div style={{ fontSize:12, color:"#6ee7b7", marginTop:4 }}>Firebase에 안전하게 저장됐어요</div>
          </>
        ) : (
          <>
            <div style={{ fontSize:32, marginBottom:6 }}>📓</div>
            <div style={{ fontWeight:600, color:"#c4b5fd" }}>오늘의 저널을 시작해보세요</div>
            <button onClick={() => setTab("journal")} style={{
              marginTop:12, padding:"10px 24px", borderRadius:20,
              background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
              border:"none", color:"#fff", fontFamily:"inherit",
              fontSize:13, cursor:"pointer", fontWeight:600
            }}>저널 시작하기 →</button>
          </>
        )}
      </div>

      {/* 통계 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {[
          { label:"총 기록", value:`${entries.length}일`, emoji:"📅" },
          { label:"대표 감정", value:topMood, emoji:"💫" },
        ].map(s => (
          <div key={s.label} style={{
            background:"rgba(124,58,237,.1)", border:"1px solid rgba(124,58,237,.2)",
            borderRadius:12, padding:16, textAlign:"center"
          }}>
            <div style={{ fontSize:24 }}>{s.emoji}</div>
            <div style={{ fontSize:22, fontWeight:700, color:"#e9d5ff", margin:"4px 0" }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#9ca3af" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 최근 기록 */}
      {entries.length > 0 && (
        <div>
          <div style={{ fontSize:13, color:"#a78bfa", marginBottom:10, fontWeight:600 }}>최근 저널</div>
          {entries.slice(0,3).map(e => (
            <div key={e.id} style={{
              background:"rgba(255,255,255,.03)", border:"1px solid rgba(124,58,237,.15)",
              borderRadius:12, padding:14, marginBottom:8
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:12, color:"#7c3aed" }}>{fmtDate(e.date)}</span>
                <span style={{ fontSize:16 }}>{e.mood}</span>
              </div>
              <div style={{ fontSize:12, color:"#9ca3af", lineHeight:1.6 }}>
                {e.answers?.gratitude?.slice(0,60) || ""}...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 저널 탭 ───────────────────────────────────────────────────────────────────
function JournalTab({ step, setStep, answers, setAnswers, mood, setMood, saving, onSave }) {
  const q = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;
  const allDone = Object.keys(answers).length === QUESTIONS.length;

  const next = () => {
    if (!answers[q.id]?.trim()) return;
    if (isLast) return;
    setStep(s => s + 1);
  };

  return (
    <div style={{ animation:"fadeUp .4s ease" }}>
      {/* 진행 바 */}
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {QUESTIONS.map((qq, i) => (
          <div key={i} onClick={() => setStep(i)} style={{
            flex:1, height:4, borderRadius:2, cursor:"pointer",
            background: i <= step ? qq.color : "rgba(255,255,255,.1)",
            transition:"background .3s"
          }}/>
        ))}
      </div>

      <div style={{ fontSize:11, color:"#9ca3af", marginBottom:8 }}>
        {step + 1} / {QUESTIONS.length}
      </div>

      {/* 질문 */}
      <div style={{
        background:"rgba(124,58,237,.1)", border:`1px solid ${q.color}40`,
        borderRadius:16, padding:20, marginBottom:16
      }}>
        <div style={{ fontSize:32, marginBottom:10 }}>{q.emoji}</div>
        <div style={{ fontSize:13, color:"#a78bfa", marginBottom:6 }}>{q.label}</div>
        <div style={{ fontSize:15, color:"#e9d5ff", lineHeight:1.7 }}>{q.text}</div>
      </div>

      {/* 답변 입력 */}
      <textarea
        value={answers[q.id] || ""}
        onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
        placeholder="자유롭게 적어보세요..."
        rows={5}
        style={{
          width:"100%", background:"rgba(255,255,255,.05)",
          border:"1px solid rgba(124,58,237,.3)", borderRadius:12,
          padding:14, color:"#e2d9f3", fontSize:14, lineHeight:1.7,
          fontFamily:"inherit", resize:"vertical", marginBottom:12
        }}
      />

      {/* 감정 선택 (마지막 단계) */}
      {allDone && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:13, color:"#a78bfa", marginBottom:10 }}>오늘의 감정을 선택해주세요</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {MOODS.map(m => (
              <button key={m} onClick={() => setMood(m)} style={{
                fontSize:28, background: mood===m ? "rgba(124,58,237,.3)" : "transparent",
                border: mood===m ? "2px solid #7c3aed" : "2px solid transparent",
                borderRadius:12, padding:"6px 10px", cursor:"pointer"
              }}>{m}</button>
            ))}
          </div>
        </div>
      )}

      {/* 버튼 */}
      <div style={{ display:"flex", gap:10 }}>
        {step > 0 && (
          <button onClick={() => setStep(s=>s-1)} style={{
            flex:1, padding:14, borderRadius:12,
            background:"rgba(255,255,255,.05)", border:"1px solid rgba(124,58,237,.3)",
            color:"#c4b5fd", fontFamily:"inherit", fontSize:14, cursor:"pointer"
          }}>← 이전</button>
        )}
        {!isLast ? (
          <button onClick={next} disabled={!answers[q.id]?.trim()} style={{
            flex:2, padding:14, borderRadius:12,
            background: answers[q.id]?.trim()
              ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,.05)",
            border:"none", color: answers[q.id]?.trim() ? "#fff" : "#6b5e8a",
            fontFamily:"inherit", fontSize:14, cursor:"pointer", fontWeight:600
          }}>다음 →</button>
        ) : (
          <button onClick={onSave} disabled={saving || !allDone || !mood} style={{
            flex:2, padding:14, borderRadius:12,
            background: allDone && mood ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,.05)",
            border:"none", color: allDone && mood ? "#fff" : "#6b5e8a",
            fontFamily:"inherit", fontSize:14, cursor:"pointer", fontWeight:600,
            animation: allDone && mood ? "pulse 2s ease infinite" : "none"
          }}>{saving ? "저장 중..." : "☁️ Firebase에 저장"}</button>
        )}
      </div>
    </div>
  );
}

// ── AI 대화 탭 ────────────────────────────────────────────────────────────────
function AITab({ messages, aiInput, setAiInput, onSend, aiLoading }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 200px)", animation:"fadeUp .4s ease" }}>
      <div style={{ fontSize:13, color:"#a78bfa", marginBottom:12, fontWeight:600 }}>🤖 AI 동반자</div>

      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:10, paddingBottom:10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            maxWidth:"85%", padding:"12px 16px", borderRadius:16, fontSize:13, lineHeight:1.7,
            alignSelf: m.role==="user" ? "flex-end" : "flex-start",
            background: m.role==="user"
              ? "linear-gradient(135deg,#7c3aed,#4f46e5)"
              : "rgba(255,255,255,.07)",
            border: m.role==="ai" ? "1px solid rgba(124,58,237,.2)" : "none",
            color:"#e9d5ff", animation:"fadeUp .3s ease"
          }}>{m.text}</div>
        ))}
        {aiLoading && (
          <div style={{
            alignSelf:"flex-start", padding:"12px 16px", borderRadius:16,
            background:"rgba(255,255,255,.07)", border:"1px solid rgba(124,58,237,.2)",
            fontSize:13, color:"#a78bfa"
          }}>생각 중... ✨</div>
        )}
      </div>

      <div style={{ display:"flex", gap:8, paddingTop:10, borderTop:"1px solid rgba(124,58,237,.2)" }}>
        <input
          value={aiInput}
          onChange={e => setAiInput(e.target.value)}
          onKeyDown={e => e.key==="Enter" && !e.shiftKey && onSend()}
          placeholder="마음속 이야기를 전해주세요..."
          style={{
            flex:1, background:"rgba(255,255,255,.05)", border:"1px solid rgba(124,58,237,.3)",
            borderRadius:24, padding:"10px 16px", color:"#e2d9f3",
            fontSize:13, fontFamily:"inherit"
          }}
        />
        <button onClick={onSend} disabled={aiLoading || !aiInput.trim()} style={{
          width:44, height:44, borderRadius:"50%",
          background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
          border:"none", color:"#fff", fontSize:18, cursor:"pointer",
          opacity: aiLoading || !aiInput.trim() ? 0.4 : 1
        }}>→</button>
      </div>
    </div>
  );
}

// ── 인사이트 탭 ───────────────────────────────────────────────────────────────
function InsightTab({ entries, topKw, moodCount }) {
  if (entries.length === 0) {
    return (
      <div style={{ textAlign:"center", paddingTop:60, animation:"fadeUp .4s ease" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🔭</div>
        <div style={{ color:"#a78bfa", fontSize:14 }}>저널을 쌓으면 인사이트가 나타나요</div>
      </div>
    );
  }

  return (
    <div style={{ animation:"fadeUp .4s ease" }}>
      <div style={{ fontSize:13, color:"#a78bfa", marginBottom:16, fontWeight:600 }}>
        📊 총 {entries.length}일의 인사이트
      </div>

      {/* 키워드 */}
      {topKw.length > 0 && (
        <div style={{
          background:"rgba(124,58,237,.1)", border:"1px solid rgba(124,58,237,.2)",
          borderRadius:16, padding:16, marginBottom:14
        }}>
          <div style={{ fontSize:12, color:"#a78bfa", marginBottom:12, fontWeight:600 }}>🔑 자주 등장한 키워드</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {topKw.map(([w, c]) => (
              <span key={w} style={{
                padding:"4px 12px", borderRadius:20,
                background:`rgba(124,58,237,${Math.min(.15+c*.05,.5)})`,
                border:"1px solid rgba(124,58,237,.3)",
                fontSize: Math.min(11+c*1.5, 16), color:"#c4b5fd"
              }}>{w}</span>
            ))}
          </div>
        </div>
      )}

      {/* 감정 분포 */}
      {Object.keys(moodCount).length > 0 && (
        <div style={{
          background:"rgba(124,58,237,.1)", border:"1px solid rgba(124,58,237,.2)",
          borderRadius:16, padding:16, marginBottom:14
        }}>
          <div style={{ fontSize:12, color:"#a78bfa", marginBottom:12, fontWeight:600 }}>💫 감정 분포</div>
          {Object.entries(moodCount).sort((a,b)=>b[1]-a[1]).map(([m, c]) => (
            <div key={m} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <span style={{ fontSize:20, width:28 }}>{m}</span>
              <div style={{ flex:1, height:8, background:"rgba(255,255,255,.05)", borderRadius:4 }}>
                <div style={{
                  height:"100%", borderRadius:4,
                  width:`${(c/entries.length)*100}%`,
                  background:"linear-gradient(90deg,#7c3aed,#a78bfa)"
                }}/>
              </div>
              <span style={{ fontSize:11, color:"#9ca3af", width:20 }}>{c}일</span>
            </div>
          ))}
        </div>
      )}

      {/* 최근 흐름 */}
      <div style={{
        background:"rgba(124,58,237,.1)", border:"1px solid rgba(124,58,237,.2)",
        borderRadius:16, padding:16
      }}>
        <div style={{ fontSize:12, color:"#a78bfa", marginBottom:12, fontWeight:600 }}>📅 최근 기록</div>
        {entries.slice(0,7).map(e => (
          <div key={e.id} style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"8px 0", borderBottom:"1px solid rgba(124,58,237,.1)"
          }}>
            <span style={{ fontSize:11, color:"#6b7280", width:50 }}>{fmtDate(e.date)}</span>
            <span style={{ fontSize:18 }}>{e.mood}</span>
            <span style={{ fontSize:12, color:"#9ca3af", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {e.answers?.gratitude?.slice(0,30) || ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
