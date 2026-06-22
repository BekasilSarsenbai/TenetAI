"use client";

import { useEffect, useRef } from "react";
import { getDictionary } from "@/lib/dictionaries";
import { useDict, useLocale } from "@/lib/i18n";

type Point = { id: number; text: string; time: string; seg: [number, number]; transcript: { who: string; said: string; source?: boolean }[] };

// Locale-independent layout per summary point: which waveform segment it maps
// to, its timestamp, and which transcript line is the highlighted source.
const STATIC = [
  { time: "12:04", seg: [26, 40] as [number, number], sourceIdx: 1 },
  { time: "04:12", seg: [6, 18] as [number, number], sourceIdx: 1 },
  { time: "21:37", seg: [44, 58] as [number, number], sourceIdx: 1 },
];

function buildData(locale: "en" | "ru"): Point[] {
  const d = getDictionary(locale);
  return d.trace.items.map((it, i) => ({
    id: i,
    text: it.text,
    time: STATIC[i].time,
    seg: STATIC[i].seg,
    transcript: it.lines.map((l, j) => ({ who: l.who, said: l.said, source: j === STATIC[i].sourceIdx })),
  }));
}

export function TraceDemo() {
  const t = useDict();
  const { locale } = useLocale();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scope = root.current;
    if (!scope) return;
    const DATA = buildData(locale);
    const $ = <T extends Element>(sel: string) => scope.querySelector<T>(sel);

    const BAR_COUNT = 64;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seeded = (i: number) => {
      const x = Math.sin(i * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    const heights = Array.from({ length: BAR_COUNT }, (_, i) => {
      const base = 0.28 + seeded(i) * 0.55;
      const env = Math.sin((i / BAR_COUNT) * Math.PI);
      return Math.max(0.18, base * (0.55 + 0.65 * env));
    });

    const insightsEl = $("#insights")!;
    const transcriptEl = $("#transcript")!;
    const waveEl = $("#wave")!;
    const stampEl = $("#stamp")!;
    const figure = $("#figure")!;
    const connector = $("#connector")!;
    const conPath = $("#conPath")!;
    const conA = $("#conA")!;
    const conB = $("#conB")!;
    const playhead = $<HTMLElement>("#playhead")!;
    const playBtn = $("#play")!;
    const playIcon = $("#playIcon")!;

    // reset (guards against StrictMode double-mount + locale rebuild)
    insightsEl.innerHTML = "";
    waveEl.querySelectorAll(".bar").forEach((b) => b.remove());

    let userInteracted = false;
    let activeId: number | null = null;
    let playing = false;
    let raf = 0;
    let cycle = 0;
    let idx = 0;

    DATA.forEach((d) => {
      const b = document.createElement("button");
      b.className = "insight";
      b.dataset.id = String(d.id);
      b.innerHTML = `<span class="mark"><svg viewBox="0 0 12 12" fill="none"><path d="M2 6.5L5 9.5L10 3" stroke="#1a1205" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${d.text}<span class="ts">[${d.time}]</span>`;
      b.addEventListener("click", () => {
        userInteracted = true;
        setActive(d.id);
      });
      insightsEl.appendChild(b);
    });

    const bars: HTMLElement[] = [];
    heights.forEach((h, i) => {
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.height = h * 100 + "%";
      bar.dataset.i = String(i);
      waveEl.appendChild(bar);
      bars.push(bar);
    });

    function renderTranscript(d: Point) {
      transcriptEl.innerHTML = "";
      d.transcript.forEach((t) => {
        const line = document.createElement("div");
        line.className = "line " + (t.source ? "lit source" : "dim");
        line.innerHTML = `<span class="who">${t.who}</span><span class="said">${t.said}</span>`;
        transcriptEl.appendChild(line);
      });
    }

    function positionPlayhead(barIndex: number) {
      const wRect = waveEl.getBoundingClientRect();
      const bRect = bars[barIndex].getBoundingClientRect();
      playhead.style.left = bRect.left - wRect.left + "px";
      playhead.style.opacity = reduce ? "0" : "1";
    }

    function drawConnector() {
      if (window.innerWidth <= 760 || activeId === null) {
        connector.classList.remove("show");
        return;
      }
      const fig = figure.getBoundingClientRect();
      const act = scope!.querySelector(".insight.active");
      const src = transcriptEl.querySelector(".line.source");
      if (!act || !src) {
        connector.classList.remove("show");
        return;
      }
      const a = act.getBoundingClientRect();
      const s = src.getBoundingClientRect();
      const x1 = a.right - fig.left;
      const y1 = a.top - fig.top + a.height / 2;
      const x2 = s.left - fig.left;
      const y2 = s.top - fig.top + s.height / 2;
      const mx = x1 + (x2 - x1) * 0.5;
      conPath.setAttribute("d", `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`);
      conA.setAttribute("cx", String(x1));
      conA.setAttribute("cy", String(y1));
      conB.setAttribute("cx", String(x2));
      conB.setAttribute("cy", String(y2));
      connector.classList.add("show");
    }

    function setActive(id: number) {
      activeId = id;
      const d = DATA[id];
      scope!.querySelectorAll(".insight").forEach((el) =>
        el.classList.toggle("active", Number((el as HTMLElement).dataset.id) === id),
      );
      renderTranscript(d);
      bars.forEach((b, i) => b.classList.toggle("in", i >= d.seg[0] && i <= d.seg[1]));
      stampEl.textContent = "[" + d.time + "]";
      positionPlayhead(d.seg[0]);
      drawConnector();
    }

    function sweep(d: Point) {
      const wRect = waveEl.getBoundingClientRect();
      const start = bars[d.seg[0]].getBoundingClientRect().left - wRect.left;
      const end = bars[d.seg[1]].getBoundingClientRect().left - wRect.left;
      let t0: number | null = null;
      const dur = 1700;
      cancelAnimationFrame(raf);
      function step(ts: number) {
        if (!playing) return;
        if (t0 === null) t0 = ts;
        const p = Math.min(1, (ts - t0) / dur);
        playhead.style.left = start + (end - start) * p + "px";
        if (p < 1) raf = requestAnimationFrame(step);
        else {
          playing = false;
          playIcon.innerHTML = '<path d="M0 0l12 7L0 14z"/>';
          positionPlayhead(d.seg[0]);
        }
      }
      raf = requestAnimationFrame(step);
    }

    function togglePlay() {
      if (activeId === null) return;
      playing = !playing;
      playIcon.innerHTML = playing
        ? '<rect x="0" y="0" width="4" height="14"/><rect x="8" y="0" width="4" height="14"/>'
        : '<path d="M0 0l12 7L0 14z"/>';
      if (playing && !reduce) sweep(DATA[activeId]);
      else cancelAnimationFrame(raf);
    }

    const onPlay = () => {
      userInteracted = true;
      togglePlay();
    };
    const onResize = () => {
      if (activeId !== null) {
        positionPlayhead(DATA[activeId].seg[0]);
        drawConnector();
      }
    };
    playBtn.addEventListener("click", onPlay);
    window.addEventListener("resize", onResize);

    setActive(0);
    setTimeout(drawConnector, 60);
    if (!reduce) {
      cycle = window.setInterval(() => {
        if (userInteracted) {
          clearInterval(cycle);
          return;
        }
        idx = (idx + 1) % DATA.length;
        setActive(idx);
      }, 3200);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      playBtn.removeEventListener("click", onPlay);
      cancelAnimationFrame(raf);
      clearInterval(cycle);
    };
  }, [locale]);

  return (
    <section className="section" id="trace">
      <div className="wrap">
        <h2>
          {t.trace.h2.a}
          <em>{t.trace.h2.em}</em>
          {t.trace.h2.b}
        </h2>
        <p className="lead">{t.trace.lead}</p>

        <div className="demo" ref={root}>
          <div className="demo-figure" id="figure">
            <svg className="connector" id="connector">
              <path id="conPath" d="" />
              <circle id="conA" r="3.5" />
              <circle id="conB" r="3.5" />
            </svg>

            <div className="panel left">
              <div className="panel-head">
                <span className="h">{t.trace.summary}</span>
                <span className="hint">{t.trace.points}</span>
              </div>
              <div className="insights" id="insights" />
            </div>

            <div className="panel right">
              <div className="panel-head">
                <span className="h">{t.trace.transcript}</span>
                <span className="hint">
                  <b>{t.trace.clickPoint}</b>
                </span>
              </div>
              <div className="transcript" id="transcript" />
              <div className="player">
                <button className="play" id="play" aria-label={t.trace.playLabel}>
                  <svg id="playIcon" viewBox="0 0 12 14" fill="currentColor">
                    <path d="M0 0l12 7L0 14z" />
                  </svg>
                </button>
                <div className="wave" id="wave">
                  <div className="playhead" id="playhead" />
                </div>
                <div className="stamp" id="stamp">
                  [12:04]
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
