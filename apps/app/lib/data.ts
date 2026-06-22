// Demo dataset for the Tenet app UI (Russian). The same meeting content is shared
// across every demo note (only title/meta change), matching the prototype.

export const DUR = 1634; // seconds (27:14)

export function fmt(s: number): string {
  s = Math.max(0, Math.round(s));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

export type TranscriptSegment = { start: number; speaker: string; text: string };

// AI-generated recap of a meeting (LLM, with an extractive demo fallback).
export type KeyMoment = { text: string; start: number; quote: string; speaker: string };
export type MeetingSummary = { tldr: string; keyPoints: KeyMoment[]; nextSteps: string[] };

export type Meeting = {
  id: string;
  day: string;
  title: string;
  time: string;
  dur: string;
  who: string;
  // Demo-only metadata used by the new design (recent preview, "rel" badge).
  prev?: string;
  rel?: string;
  // Set on real recordings/uploads: object URL of the captured audio and its
  // measured length. When present, the note player drives a real <audio>.
  audioUrl?: string;
  durSec?: number;
  audioMime?: string;
  // Real transcript from the speech-to-text pipeline (Groq/Deepgram or fallback).
  transcript?: TranscriptSegment[];
  // AI recap generated from the transcript (Gemini/Groq or extractive fallback).
  summary?: MeetingSummary;
};

// Sample lines used when no transcription provider is configured. The API spreads
// their timestamps across the real recording length so jump-to-source still lands.
export const DEMO_TRANSCRIPT_TEXT: { speaker: string; text: string }[] = [
  { speaker: "Майя", text: "Привет всем, это установочный звонок Acme и Northwind. Давайте пройдёмся по тому, где сейчас активация." },
  { speaker: "Дэв", text: "Главная проблема — большая часть оттока происходит на онбординге, ещё до того, как они доходят до ключевой функции." },
  { speaker: "Майя", text: "Понятно. А что с командной работой между встречами?" },
  { speaker: "Майя", text: "Каждый синк начинается с того, что мы заново вспоминаем, на чём остановились в прошлый раз. Это съедает первые минут десять." },
  { speaker: "Прия", text: "По цене были возражения?" },
  { speaker: "Прия", text: "Сначала да, но когда стало видно, сколько часов это экономит, цена перестала быть вопросом." },
  { speaker: "Дэв", text: "Окей, значит фокус на онбординг и на сохранение контекста. Зафиксировали." },
];

export const MEETINGS: Meeting[] = [
  { id: "m1", day: "Сегодня", title: "Установочный звонок, Acme × Northwind", time: "10:30", rel: "сейчас", dur: "27:14", who: "Вы, Майя, Дэв, Прия", prev: "Активация Acme проседает на онбординге." },
  { id: "m2", day: "Сегодня", title: "Еженедельный синк, Growth", time: "9:00", rel: "", dur: "22:05", who: "Вы, Дэв, Прия", prev: "Команда восстанавливает контекст между синками." },
  { id: "m3", day: "Вчера", title: "Обзор роадмапа", time: "16:15", rel: "", dur: "44:19", who: "Вы, 4 человека", prev: "Приоритеты Q3 согласованы с продуктом." },
  { id: "m4", day: "Вчера", title: "1:1 с Прией", time: "13:00", rel: "", dur: "26:48", who: "Вы, Прия", prev: "Путаница в навигации в первой сессии." },
  { id: "m5", day: "Вчера", title: "Клиент, Lumen Labs", time: "11:00", rel: "", dur: "31:12", who: "Вы, Cumalala", prev: "Доверие появляется после реального результата." },
];

// Summary HTML for demo notes (the design renders <b> emphasis).
export const TLDR =
  "Активация Acme проседает на <b>онбординге</b>. Команда заново восстанавливает контекст между синками, а цена показалась справедливой, как только стало видно сэкономленное время.";

export type KeyPoint = { txt: string; sec: number; ts: string; who: string; q: string };

export const KP: KeyPoint[] = [
  { txt: "Большинство новых пользователей тихо отваливаются на онбординге.", sec: 724, ts: "12:04", who: "Дэв", q: "большая часть оттока происходит на онбординге, ещё до того, как они доходят до ключевой функции." },
  { txt: "Команда заново восстанавливает контекст между еженедельными синками.", sec: 980, ts: "16:20", who: "Майя", q: "каждый синк начинается с того, что мы заново вспоминаем, на чём остановились в прошлый раз." },
  { txt: "Цена показалась справедливой, как только они увидели сэкономленное время.", sec: 1310, ts: "21:50", who: "Прия", q: "когда стало видно, сколько часов это экономит, цена перестала быть вопросом." },
];

export type TranscriptLine = { who: string; tt?: string; src?: number; said: string };

export const TR: TranscriptLine[] = [
  { who: "Майя", said: "Привет всем, это установочный звонок Acme и Northwind. Давайте пройдёмся по тому, где сейчас активация." },
  { who: "Дэв", src: 0, said: "Главная проблема — <mark>большая часть оттока происходит на онбординге, ещё до того, как они доходят до ключевой функции.</mark> Люди регистрируются и пропадают." },
  { who: "Майя", said: "Понятно. А что с командной работой между встречами?" },
  { who: "Майя", src: 1, said: "<mark>Каждый синк начинается с того, что мы заново вспоминаем, на чём остановились в прошлый раз.</mark> Это съедает первые минут десять." },
  { who: "Прия", said: "По цене были возражения?" },
  { who: "Прия", src: 2, said: "Сначала да, но <mark>когда стало видно, сколько часов это экономит, цена перестала быть вопросом.</mark>" },
  { who: "Дэв", said: "Окей, значит фокус на онбординг и на сохранение контекста. Зафиксировали." },
];

export const TODOS = [
  "Разобрать отток в воронке онбординга",
  "Поделиться шаблоном саммари синка",
  "Добавить 30-секундный момент «что это умеет»",
];

export type Cite = { who: string; ts: string; sec: number; src: number };
export type QA = { q: string; a: string; cites: Cite[] | null };

export const ASKQA: QA[] = [
  { q: "Что мешало больше всего?", a: "Онбординг — пользователи отваливаются ещё до ключевой функции.", cites: [{ who: "Дэв", ts: "12:04", sec: 724, src: 0 }] },
  { q: "Цена обсуждалась?", a: "Да — сначала было возражение, но оно ушло, когда стало видно экономию времени.", cites: [{ who: "Прия", ts: "21:50", sec: 1310, src: 2 }] },
  { q: "Упоминали конкурентов?", a: "Нет — конкуренты в этой встрече не обсуждались, не буду додумывать.", cites: null },
];

export const GUIDE = [
  "Расскажите, как прошёл последний онбординг нового пользователя.",
  "Где именно люди застревают в первый раз?",
  "Что съедает время в начале каждого синка?",
  "Какие возражения были по цене?",
  "Если бы был волшебный инструмент — что бы он делал?",
];
