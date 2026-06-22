"use client";

import { useState } from "react";
import { useDict } from "@/lib/i18n";
import { Logo } from "./Logo";

const Mag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
);

export function AppMock() {
  const t = useDict();
  const a = t.appMock;
  const [openKp, setOpenKp] = useState<number | null>(0);
  const [tab, setTab] = useState<"transcript" | "insights" | "chat">("transcript");
  const [lit, setLit] = useState<number | null>(0);

  function clickKp(i: number) {
    if (openKp === i) {
      setOpenKp(null);
      return;
    }
    setOpenKp(i);
    setLit(i);
    setTab("transcript");
  }

  let lastDay = "";

  return (
    <div className="appmock">
      <div className="am-app">
        {/* sidebar */}
        <aside className="side">
          <div className="brand"><Logo size={22} /><b>Tenet</b></div>
          <button className="new-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            {a.newNote}
          </button>
          <div className="search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            {a.search}
          </div>
          <div className="side-list">
            {a.notes.map((n, i) => {
              const grp = n.day !== lastDay ? n.day : null;
              lastDay = n.day;
              return (
                <div key={i}>
                  {grp && <div className="grp">{grp}</div>}
                  <button className={`mi${i === 0 ? " on" : ""}`}>
                    <div className="mi-name">{n.title}</div>
                    <div className="mi-meta">{n.meta}</div>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="side-foot">
            <div className="sf-av">B</div>
            <div><div className="sf-name">Beka</div><div className="sf-plan">{a.plan}</div></div>
          </div>
        </aside>

        {/* main */}
        <div className="main">
          <div className="topbar">
            <div className="tb-right">
              <button className="tb-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" /></svg>
                {a.share}
              </button>
            </div>
          </div>

          <div className="stage">
            <div className="vnote">
              <div className="note-left">
                <div className="note-left-scroll">
                  <div className="nl-inner">
                    <div className="vid">
                      <div className="vid-grid">
                        <div className="vid-tile" style={{ backgroundImage: "url(/call/person-1.jpg)" }}><span>{a.tileP}</span></div>
                        <div className="vid-tile" style={{ backgroundImage: "url(/call/person-2.jpg)" }}><span>{a.tileYou}</span></div>
                      </div>
                      <button className="vid-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l16 9-16 9z" /></svg></button>
                      <div className="vid-bar">
                        <span className="vid-time">8:12</span>
                        <div className="vid-prog"><div className="vid-prog-fill" style={{ width: "30%" }} /></div>
                        <span className="vid-time">27:14</span>
                      </div>
                    </div>

                    <div className="nl-title">{a.title}</div>
                    <div className="nl-meta">{a.meta}</div>
                    <div className="nl-rule" />

                    <div className="sec-h">{a.summaryH}</div>
                    <p className="summary-p" dangerouslySetInnerHTML={{ __html: a.summary }} />

                    <div className="sec-h" style={{ marginTop: 30 }}>{a.keyPointsH}</div>
                    <div>
                      {a.kp.map((k, i) => (
                        <div className={`kp${openKp === i ? " open" : ""}`} key={i}>
                          <button className="kp-row" onClick={() => clickKp(i)}>
                            <span className="kp-dot" />
                            <span className="kp-main"><span className="kp-txt">{k.txt}</span></span>
                            <span className="kp-mag"><Mag /></span>
                          </button>
                          <div className="kp-src">
                            <div className="kp-quote">&quot;{k.q}&quot;</div>
                            <div className="kp-jump">
                              <span className="pp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l16 9-16 9z" /></svg></span>
                              {a.jumpTo} {k.ts}<span className="who">· {k.who}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="sec-h" style={{ marginTop: 30 }}>{a.nextStepsH}</div>
                    {a.todos.map((todo, i) => (
                      <div className="todo" key={i}><span className="cb" /> {todo}</div>
                    ))}
                    <div style={{ height: 24 }} />
                  </div>
                </div>
              </div>

              <div className="note-right">
                <div className="tabs">
                  <button className={`tab${tab === "transcript" ? " on" : ""}`} onClick={() => setTab("transcript")}>{a.tabs.transcript}</button>
                  <button className={`tab${tab === "insights" ? " on" : ""}`} onClick={() => setTab("insights")}>{a.tabs.insights}</button>
                  <button className={`tab${tab === "chat" ? " on" : ""}`} onClick={() => setTab("chat")}>{a.tabs.chat}</button>
                </div>

                {tab === "transcript" && (
                  <div className="panel">
                    {a.tr.map((line, i) => (
                      <div className={`tr-block${line.src >= 0 && line.src === lit ? " lit" : ""}`} key={i}>
                        <div className="tr-who"><span className="tr-av">{line.who[0]}</span><span className="tr-name">{line.who}</span></div>
                        <div className="tr-said" dangerouslySetInnerHTML={{ __html: line.html }} />
                      </div>
                    ))}
                  </div>
                )}

                {tab === "insights" && (
                  <div className="panel">
                    <div className="ins-block">
                      <div className="ins-lbl">{a.insights.themesH}</div>
                      {a.insights.themes.map((th, i) => (
                        <div className="ins-item" key={i}><span className="ins-dot" /><span className="ins-txt">{th}</span></div>
                      ))}
                    </div>
                    <div className="ins-block">
                      <div className="ins-lbl">{a.insights.speakersH}</div>
                      {a.insights.speakers.map((sp, i) => (
                        <div className="ins-item" key={i}><span className="ins-dot" /><span className="ins-txt" dangerouslySetInnerHTML={{ __html: sp }} /></div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "chat" && (
                  <div className="panel">
                    <div className="sugg">
                      {a.sugg.map((q, i) => (<button key={i} onClick={() => setTab("chat")}>{q}</button>))}
                    </div>
                    <div className="chat-q"><div className="bub u">{a.chat.q}</div></div>
                    <div className="bub a">{a.chat.a}
                      <div className="cites"><span className="cite">{a.chat.cite}</span></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="dock">
                <div className="dock-inner">
                  <button className="dock-resume"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l16 9-16 9z" /></svg> {a.listen}</button>
                  <div className="dock-ask">
                    <input placeholder={a.askPlaceholder} readOnly />
                    <button className="dock-send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11l5-5 5 5M12 6v13" /></svg></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
