"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { Meeting } from "@/lib/data";
import type { AppUser } from "@/lib/types";
import { Plus, Puzzle, Search } from "./icons";
import { Logo } from "./Logo";
import { CHROME_STORE_URL, SHOW_EXTENSION_PROMPT } from "@/lib/links";

export function Sidebar({
  meetings,
  activeId,
  onOpen,
  onNew,
  onBrand,
  onProfile,
  onRename,
  onDelete,
  user,
}: {
  meetings: Meeting[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onBrand: () => void;
  onProfile: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  user: AppUser;
}) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  // Close the ⋯ menu on any outside click.
  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuId]);

  useEffect(() => {
    if (editId) editRef.current?.focus();
  }, [editId]);

  function startRename(m: Meeting) {
    setMenuId(null);
    setEditId(m.id);
    setEditVal(m.title);
  }

  function commitRename() {
    if (editId) onRename(editId, editVal);
    setEditId(null);
  }

  let lastDay = "";
  return (
    <aside className="side">
      <button className="brand" onClick={onBrand}>
        <Logo size={22} />
        <b>Tenet</b>
      </button>
      <button className="newbtn" onClick={onNew}>
        <Plus /> New session
      </button>
      <div className="search">
        <Search /> Search all meetings
      </div>
      <div>
        {meetings.map((m) => {
          const showGroup = m.day !== lastDay;
          lastDay = m.day;
          return (
            <Fragment key={m.id}>
              {showGroup && <div className="grp">{m.day}</div>}
              {editId === m.id ? (
                <input
                  ref={editRef}
                  className="mi-edit"
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditId(null);
                  }}
                />
              ) : (
                <div className={`mi-wrap${m.id === activeId ? " on" : ""}`}>
                  <button className="mi" onClick={() => onOpen(m.id)}>
                    <div className="mi-name">{m.title}</div>
                    <div className="mi-meta">{m.time} · {m.dur}</div>
                  </button>
                  <button
                    className="mi-more"
                    aria-label="Session options"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setMenuId((id) => (id === m.id ? null : m.id));
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
                  </button>
                  {menuId === m.id && (
                    <div className="mi-menu" onMouseDown={(e) => e.stopPropagation()}>
                      <button onClick={() => startRename(m)}>Rename</button>
                      <button className="danger" onClick={() => { setMenuId(null); onDelete(m.id); }}>Delete</button>
                    </div>
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
      {SHOW_EXTENSION_PROMPT && (
        <a className="side-ext" href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer">
          <Puzzle /> Install Chrome extension
        </a>
      )}
      <button className="foot" onClick={onProfile}>
        <span className="av">{user.name[0].toUpperCase()}</span>
        <span>
          <span className="sf-name">{user.name}</span>
          <span className="sf-plan">early access</span>
        </span>
      </button>
    </aside>
  );
}
