"use client";

import React, { useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
  useDroppable, DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, Trash2, GripVertical, Bell, Edit3,
  Calendar, Clock, Users, History, HelpCircle,
  LayoutDashboard, Columns2, List, ChevronRight, X, Grid3x3,
} from "lucide-react";
import { useEffect } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TYPES
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export interface SubNote {
  id: string;
  title: string;
  eventAt?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  color: string;
  isUrgent: boolean;
  boardId: string | null;
  width: "half" | "full";
  order: number;
  author: string;
  subnotes: SubNote[];
  expiresAt?: any;
  eventAt?: any;
  createdAt?: any;
  isDeleted?: boolean;
  deleted?: boolean;
}

export interface Board {
  id: string;
  title: string;
  color: string;
  order: number;
  width: "half" | "full";
  createdAt?: Timestamp;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PALETTE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const BOARD_COLORS = [
  "#7B2FBE", "#2563EB", "#16A34A", "#D97706",
  "#DC2626", "#0891B2", "#9333EA", "#DB2777",
  "#5CB85C", "#E67E22",
];

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   HELPERS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function toDate(val: any): Date | null {
  if (!val) return null;
  try {
    if (typeof val?.toDate === "function") return val.toDate();
    if (val instanceof Date) return val;
    if (typeof val === "string" || typeof val === "number") {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    // Firestore Timestamp-like object with seconds
    if (val.seconds) return new Date(val.seconds * 1000);
  } catch { /* ignore */ }
  return null;
}

function formatDate(val: any): string {
  const d = toDate(val);
  if (!d) return "";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isExpired(val: any): boolean {
  const d = toDate(val);
  if (!d) return false;
  return d < new Date();
}

function getInitial(str: string): string {
  return (str || "?")[0].toUpperCase();
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   NOTICE CARD (matches live HTML exactly)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function NoticeCard({
  notice, boards, canEdit, canDelete, onDelete, onUpdate,
}: {
  notice: Notice;
  boards: Board[];
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Notice>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: notice.id, data: { type: "Notice", notice } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(notice.title || "");
  const [editContent, setEditContent] = useState(notice.content || "");
  const [editExpiry, setEditExpiry] = useState(
    notice.expiresAt ? (toDate(notice.expiresAt)?.toISOString().split("T")[0] ?? "") : ""
  );
  const [editEventAt, setEditEventAt] = useState(
    notice.eventAt ? (toDate(notice.eventAt)?.toISOString().split("T")[0] ?? "") : ""
  );

  const expired = isExpired(notice.expiresAt);
  const accentColor = notice.color || "#7B2FBE";

  const saveEdit = async () => {
    onUpdate(notice.id, {
      title: editTitle,
      content: editContent,
      expiresAt: editExpiry || null,
      eventAt: editEventAt || null,
    } as any);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="group relative rounded-3xl border border-purple-200 bg-white p-5 shadow-md">
        <input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          placeholder="Título..."
          className="w-full font-black text-base text-[#1A1A2E] border-b border-gray-100 pb-2 mb-3 outline-none focus:border-purple-400 bg-transparent"
        />
        <textarea
          value={editContent}
          onChange={e => setEditContent(e.target.value)}
          rows={3}
          placeholder="Contenido..."
          className="w-full text-sm text-gray-600 border border-gray-100 rounded-xl px-3 py-2 mb-3 outline-none focus:border-purple-300 resize-none"
        />
        <div className="flex gap-3 mb-4 flex-wrap">
          <label className="flex flex-col gap-1 text-xs font-bold text-gray-500">
            Fecha Evento
            <input type="date" value={editEventAt} onChange={e => setEditEventAt(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 outline-none text-gray-700" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-gray-500">
            Fecha Vencimiento
            <input type="date" value={editExpiry} onChange={e => setEditExpiry(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 outline-none text-gray-700" />
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={saveEdit} className="flex-1 bg-[#7B2FBE] text-white font-bold py-2.5 rounded-xl text-sm hover:bg-[#5C1FA0]">Guardar</button>
          <button onClick={() => setIsEditing(false)} className="flex-1 border-2 border-gray-100 text-gray-600 font-bold py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`notice-${notice.id}`}
      className="group relative rounded-3xl border transition-all overflow-hidden hover:shadow-[0_8px_32px_rgba(31,38,135,0.1)] bg-white/40 backdrop-blur-md border-white/60 hover:border-[#7B2FBE]/50 shadow-[0_4px_24px_rgba(31,38,135,0.05)]"
    >
      {/* Left accent bar on hover */}
      <div
        className="absolute top-0 left-0 w-1.5 h-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(to bottom, ${accentColor}, ${accentColor}99)` }}
      />

      <div className="p-4 sm:p-5 flex flex-col h-full">
        <div className="flex-1 min-w-0 w-full flex flex-col h-full">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2.5 mb-3 relative z-10">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              {/* Drag handle */}
              {canEdit && (
                <button
                  {...attributes}
                  {...listeners}
                  className="mt-0.5 text-gray-400 hover:text-[#7B2FBE] bg-gray-50 hover:bg-purple-50 border border-gray-100 transition-colors shrink-0 touch-none p-1 rounded-lg shadow-sm cursor-grab active:cursor-grabbing"
                  title="Arrastrar aviso"
                >
                  <GripVertical className="w-4 h-4" />
                </button>
              )}

              {/* Author initial icon */}
              <div
                className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)` }}
              >
                {getInitial(notice.author)}
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="font-black text-base leading-snug break-words text-[#1A1A2E]">
                  {notice.title}
                </h3>
              </div>
            </div>
          </div>

          {/* Content */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words flex-1 text-gray-600 pl-10">
            {notice.content}
          </p>

          {/* Sub-Eventos / Subnotes */}
          {notice.subnotes && notice.subnotes.length > 0 && (
            <div className="mt-4 pl-10 space-y-2">
              {notice.subnotes.map(sn => {
                const snDate = toDate(sn.eventAt);
                const isToday = snDate?.toDateString() === new Date().toDateString();
                const isPast = snDate && snDate < new Date(new Date().setHours(0,0,0,0));
                return (
                  <div key={sn.id} className={`text-[11px] px-3 py-2 rounded-xl border flex justify-between items-center ${isToday ? "bg-amber-100 border-amber-300 text-amber-900 font-black shadow-sm" : isPast ? "bg-gray-50 border-gray-100 text-gray-400 line-through opacity-75" : "bg-white border-gray-200 text-gray-600 font-bold"}`}>
                    <span className="truncate mr-2">{sn.title}</span>
                    {sn.eventAt && <span className="shrink-0">{formatDate(sn.eventAt)}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto">
          {/* Date badges */}
          <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap items-center gap-2">
            {notice.eventAt && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100" title="Fecha Específica del Evento">
                <Calendar className="w-3 h-3" /> Evento: {formatDate(notice.eventAt)}
              </span>
            )}
            {notice.expiresAt && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 ${expired ? "bg-gray-50 text-gray-400 border-gray-100" : "bg-red-50 text-red-500 border-red-100"}`} title="Fecha de Vencimiento">
                <Clock className="w-3 h-3" /> Vence: {formatDate(notice.expiresAt)}
              </span>
            )}
            {notice.author && (
              <span className="text-[10px] font-bold px-2 py-1 bg-gray-50 text-gray-400 rounded-lg border border-gray-100 flex items-center gap-1">
                <Users className="w-3 h-3" /> {notice.author}
              </span>
            )}
            {notice.createdAt && (
              <span className="text-[10px] font-medium text-gray-300 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatDate(notice.createdAt)}
              </span>
            )}
          </div>

          {/* Bottom actions: board selector + buttons */}
          <div className="mt-4 pt-3 border-t border-gray-100/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {/* Board selector */}
              {canEdit && (
                <select
                  value={notice.boardId || ""}
                  onChange={e => onUpdate(notice.id, { boardId: e.target.value || null } as any)}
                  className="text-xs font-bold bg-white text-gray-500 rounded-lg px-2 py-1.5 outline-none cursor-pointer hover:bg-purple-50 hover:text-[#7B2FBE] border border-gray-200 transition-colors max-w-[140px] truncate"
                >
                  <option value="">Sin pizarra</option>
                  {boards.map(b => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-blue-500 bg-white hover:bg-blue-50 p-2 rounded-xl transition-colors border border-gray-100 hover:border-blue-100 shadow-sm"
                  title="Editar Aviso"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(notice.id)}
                  className="text-gray-400 hover:text-red-500 bg-white hover:bg-red-50 p-2 rounded-xl transition-colors border border-gray-100 hover:border-red-100 shadow-sm"
                  title="Eliminar Aviso"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   COMPACT NOTICE ROW (List Mode)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function NoticeCompactRow({
  notice, boards, canEdit, canDelete, onDelete, onUpdate,
}: {
  notice: Notice;
  boards: Board[];
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Notice>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: notice.id, data: { type: "Notice", notice } });
  const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.35 : 1 };
  const expired = isExpired(notice.expiresAt);

  return (
    <div ref={setNodeRef} style={style}
      className="group relative rounded-xl border transition-all overflow-hidden hover:shadow-[0_8px_24px_rgba(31,38,135,0.08)] bg-white/40 backdrop-blur-md border-white/60 hover:border-[#7B2FBE]/40 shadow-[0_4px_24px_rgba(31,38,135,0.04)]"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-[#7B2FBE] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button {...attributes} {...listeners}
              className="text-gray-400 hover:text-[#7B2FBE] touch-none p-0.5 cursor-grab active:cursor-grabbing"
              title="Arrastrar aviso"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
          <h3 className="font-black text-sm leading-tight break-words text-[#1A1A2E]">{notice.title || notice.content.slice(0,60)}</h3>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {notice.eventAt && (
              <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                Ev: {formatDate(notice.eventAt)}
              </span>
            )}
            {notice.expiresAt && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${expired ? "bg-gray-50 text-gray-400 border-gray-100" : "bg-red-50 text-red-500 border-red-100"}`}>
                Vence: {formatDate(notice.expiresAt)}
              </span>
            )}
            {notice.author && <span className="text-[10px] text-gray-500 font-bold">{notice.author}</span>}
          </div>
          <div className="flex items-center gap-1 border-l border-gray-200 pl-2 ml-1">
            {canEdit && (
              <select
                value={notice.boardId || ""}
                onChange={e => onUpdate(notice.id, { boardId: e.target.value || null } as any)}
                className="text-[10px] font-bold bg-transparent text-gray-400 rounded outline-none cursor-pointer hover:text-[#7B2FBE] max-w-[80px] truncate"
              >
                <option value="">Mover...</option>
                {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            )}
            {canEdit && (
              <button className="text-gray-400 hover:text-blue-500 p-1 rounded transition-colors">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(notice.id)} className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="pl-6">
          <p className="text-xs leading-relaxed whitespace-pre-wrap text-gray-600">{notice.content}</p>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   BOARD SECTION (matches live HTML exactly)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function BoardSection({
  board, notices, boards, canEdit, canDelete,
  onDeleteNotice, onUpdateNotice,
  onDeleteBoard, onToggleWidth,
}: {
  board: Board;
  notices: Notice[];
  boards: Board[];
  canEdit: boolean;
  canDelete: boolean;
  onDeleteNotice: (id: string) => void;
  onUpdateNotice: (id: string, data: Partial<Notice>) => void;
  onDeleteBoard: (id: string) => void;
  onToggleWidth: (id: string, current: "half" | "full") => void;
}) {
  const [listMode, setListMode] = useState(false);
  const {
    attributes, listeners, setNodeRef: setSortableRef,
    transform, transition, isDragging: isBoardDragging,
  } = useSortable({ id: `board-sort-${board.id}`, data: { type: "Board", board } });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: `board-${board.id}` });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isBoardDragging ? 0.4 : 1,
  };

  const colSpan = board.width === "full" ? "col-span-1 md:col-span-2" : "";

  return (
    <div ref={setSortableRef} style={style} className={colSpan}>
      <div
        className={`group bg-white/40 backdrop-blur-2xl rounded-3xl border shadow-[0_8px_32px_rgba(31,38,135,0.07)] overflow-hidden h-full transition-all ${isOver ? "ring-2 ring-purple-400/50" : ""}`}
        style={{ borderColor: `${board.color}66` }}
      >
        {/* Board header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-white/40"
          style={{ background: `linear-gradient(to right, ${board.color}4D, transparent)` }}
        >
          <div className="flex items-center gap-3">
            {/* Board drag handle */}
            {canEdit && (
              <button
                {...attributes}
                {...listeners}
                className="text-gray-400 hover:text-[#7B2FBE] bg-white hover:bg-purple-50 border border-gray-100 shadow-sm transition-colors touch-none p-1.5 rounded-lg cursor-grab active:cursor-grabbing"
                title="Arrastrar pizarra"
              >
                <GripVertical className="w-5 h-5" />
              </button>
            )}
            <LayoutDashboard className="w-5 h-5 text-[#7B2FBE]/60" />
            <h3 className="text-lg font-black text-[#1A1A2E] font-heading">{board.title}</h3>
            <span className="text-xs font-bold bg-white/60 text-gray-500 px-2 py-0.5 rounded-full border border-gray-100">
              {notices.length} avisos
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setListMode(!listMode)}
              title={listMode ? "Cambiar a vista de tarjetas" : "Cambiar a vista compacta"}
              className={`transition-colors p-1.5 rounded-full hover:bg-purple-50 ${listMode ? "text-[#7B2FBE] bg-purple-50" : "text-gray-400 hover:text-[#7B2FBE]"}`}
            >
              {listMode ? <Grid3x3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onToggleWidth(board.id, board.width)}
              title={board.width === "full" ? "Reducir a la mitad" : "Expandir a todo el ancho"}
              className="transition-colors p-1.5 rounded-full text-gray-400 hover:text-[#7B2FBE] hover:bg-purple-50"
            >
              <Columns2 className="w-4 h-4" />
            </button>
            {canDelete && (
              <button
                onClick={() => onDeleteBoard(board.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Board content / drop zone */}
        <div ref={setDroppableRef} className="p-5 md:p-6">
          <SortableContext items={notices.map(n => n.id)} strategy={verticalListSortingStrategy}>
            <div className={listMode ? "space-y-2" : "space-y-4"}>
              {notices.map(notice => listMode ? (
                <NoticeCompactRow
                  key={notice.id}
                  notice={notice}
                  boards={boards}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onDelete={onDeleteNotice}
                  onUpdate={onUpdateNotice}
                />
              ) : (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  boards={boards}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onDelete={onDeleteNotice}
                  onUpdate={onUpdateNotice}
                />
              ))}
              {notices.length === 0 && (
                <div className="text-center py-8 text-gray-300 border-2 border-dashed border-gray-100 rounded-2xl text-sm font-medium">
                  Sin avisos â€” arrastra uno aquí
                </div>
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MAIN COMPONENT
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface AvisosKanbanProps {
  notices: Notice[];
  boards: Board[];
  userEmail: string;
  isAdmin: boolean;
  canCreate: boolean;
}

export function AvisosKanban({ notices: propNotices, boards: propBoards, userEmail, isAdmin, canCreate }: AvisosKanbanProps) {
  const [dragOverrides, setDragOverrides] = useState<Record<string, string | null>>({});
  const [activeDragData, setActiveDragData] = useState<any | null>(null);

  /* Separate active from trashed */
  const activeNoticesRaw = propNotices.filter((n: any) => !n.isDeleted && !n.deleted);
  const trashedNotices = propNotices.filter((n: any) => n.isDeleted || n.deleted);

  const notices: Notice[] = activeNoticesRaw
    .map(n => n.id in dragOverrides ? { ...n, boardId: dragOverrides[n.id] } : n)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const boards: Board[] = [...propBoards].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  /* Modals */
  const [showNewNotice, setShowNewNotice] = useState(false);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showHelp, setShowHelp] = useState(false);


  /* Forms */
  const [nTitle, setNTitle] = useState("");
  const [nContent, setNContent] = useState("");
  const [nEventAt, setNEventAt] = useState("");
  const [nExpiry, setNExpiry] = useState("");
  const [nBoardId, setNBoardId] = useState<string | null>(null);
  const [nSubnotes, setNSubnotes] = useState<SubNote[]>([]);

  const [bTitle, setBTitle] = useState("");
  const [bColor, setBColor] = useState(BOARD_COLORS[0]);

  const authorLabel = userEmail.split("@")[0];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  /* â”€â”€ CRUD â”€â”€ */
  const handleAddNotice = async () => {
    if (!nTitle.trim() && !nContent.trim()) return;
    await addDoc(collection(db, "announcements"), {
      title: nTitle.trim(),
      content: nContent.trim(),
      color: "#7B2FBE",
      isUrgent: false,
      boardId: nBoardId || (boards.length > 0 ? boards[0].id : null),
      width: "half",
      order: notices.length,
      author: authorLabel,
      subnotes: nSubnotes,
      expiresAt: nExpiry || null,
      eventAt: nEventAt || null,
      createdAt: Timestamp.now(),
      isDeleted: false,
    });
    setShowNewNotice(false);
    setNTitle(""); setNContent(""); setNEventAt(""); setNExpiry(""); setNSubnotes([]);
  };

  const handleUpdateNotice = async (id: string, data: Partial<Notice>) => {
    await updateDoc(doc(db, "announcements", id), data as Record<string, unknown>);
  };

  const handleDeleteNotice = async (id: string) => {
    if (confirm("¿Mover este aviso a la papelera?")) {
      await updateDoc(doc(db, "announcements", id), { isDeleted: true });
    }
  };

  const handleRestoreNotice = async (id: string) => {
    await updateDoc(doc(db, "announcements", id), { isDeleted: false, deleted: false });
  };

  const handlePermanentDelete = async (id: string) => {
    if (confirm("¿Eliminar permanentemente? No se puede deshacer.")) {
      await deleteDoc(doc(db, "announcements", id));
    }
  };

  const handleAddBoard = async () => {
    if (!bTitle.trim()) return;
    await addDoc(collection(db, "boards"), {
      title: bTitle.trim(),
      color: bColor,
      order: boards.length,
      width: "full",
      createdAt: Timestamp.now(),
    });
    setShowNewBoard(false); setBTitle("");
  };

  const handleDeleteBoard = async (id: string) => {
    if (!confirm("¿Eliminar esta pizarra? Sus avisos quedarán sin asignar.")) return;
    const toUpdate = notices.filter(n => n.boardId === id);
    await Promise.all(toUpdate.map(n => updateDoc(doc(db, "announcements", n.id), { boardId: null })));
    await deleteDoc(doc(db, "boards", id));
  };

  const handleToggleBoardWidth = async (id: string, current: "half" | "full") => {
    await updateDoc(doc(db, "boards", id), { width: current === "full" ? "half" : "full" });
  };

  /* â”€â”€ DnD â”€â”€ */
  const handleDragStart = (e: DragStartEvent) => setActiveDragData(e.active.data.current);

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over || active.data.current?.type !== "Notice") return;
    let targetBoardId: string | null | undefined = undefined;
    if (String(over.id).startsWith("board-") && !String(over.id).startsWith("board-sort-")) {
      targetBoardId = String(over.id).replace("board-", "");
    } else if (over.data.current?.type === "Notice") {
      targetBoardId = over.data.current.notice.boardId;
    }
    if (targetBoardId === undefined) return;
    const activeNotice = notices.find(n => n.id === active.id);
    if (activeNotice && activeNotice.boardId !== targetBoardId) {
      setDragOverrides(prev => ({ ...prev, [active.id as string]: targetBoardId as string | null }));
    }
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveDragData(null);
    if (!over) { setDragOverrides({}); return; }

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === "Board" && overType === "Board") {
      const oldIndex = boards.findIndex(b => `board-sort-${b.id}` === active.id);
      const newIndex = boards.findIndex(b => `board-sort-${b.id}` === over.id);
      if (oldIndex !== newIndex) {
        const nb = [...boards];
        const [moved] = nb.splice(oldIndex, 1);
        nb.splice(newIndex, 0, moved);
        await Promise.all(nb.map((b, i) => updateDoc(doc(db, "boards", b.id), { order: i })));
      }
    } else if (activeType === "Notice") {
      const activeNotice = notices.find(n => n.id === active.id);
      if (!activeNotice) { setDragOverrides({}); return; }
      const overrideBoardId = dragOverrides[active.id as string];
      const finalBoardId = overrideBoardId !== undefined ? overrideBoardId : activeNotice.boardId;
      const targetNotices = notices.filter(n => n.boardId === finalBoardId && n.id !== active.id);
      let insertIdx = targetNotices.length;
      if (overType === "Notice" && over.data.current?.notice.boardId === finalBoardId) {
        insertIdx = targetNotices.findIndex(n => n.id === over.id);
        if (insertIdx === -1) insertIdx = targetNotices.length;
      }
      targetNotices.splice(insertIdx, 0, activeNotice);
      setDragOverrides({});
      await updateDoc(doc(db, "announcements", activeNotice.id), { boardId: finalBoardId });
      await Promise.all(targetNotices.map((n, i) => updateDoc(doc(db, "announcements", n.id), { order: i })));
    }
    setDragOverrides({});
  };

  const getBoardNotices = (boardId: string) => notices.filter(n => n.boardId === boardId);
  const unassigned = notices.filter(n => !n.boardId);
  const canEdit = canCreate || isAdmin;
  const canDelete = isAdmin;

  /* â”€â”€ Today's events â”€â”€ */
  const today = new Date();
  const todayStr = today.toDateString();
  const todayEvents: { id: string, title: string }[] = [];
  notices.forEach(n => {
    if (n.eventAt && toDate(n.eventAt)?.toDateString() === todayStr) {
      todayEvents.push({ id: n.id, title: n.title || n.content.slice(0, 60) });
    }
    if (n.subnotes && Array.isArray(n.subnotes)) {
      n.subnotes.forEach(sn => {
        if (sn.eventAt && toDate(sn.eventAt)?.toDateString() === todayStr) {
          todayEvents.push({ id: sn.id || (n.id + sn.title), title: `${n.title ? n.title + ' - ' : ''}${sn.title}` });
        }
      });
    }
  });

  return (
    <div className="space-y-6">

      {/* â”€â”€ HEADER CARD â”€â”€ */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black font-heading text-[#1A1A2E] flex items-center gap-3">
            <Bell className="w-6 h-6 text-[#F5C518]" /> Avisos Importantes
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Arrastra los avisos entre pizarras para organizarlos. Las pizarras también se pueden reordenar.
          </p>
        </div>

        {canEdit && (
          <div className="flex gap-3 shrink-0 flex-wrap justify-end">
            <button
              onClick={() => setShowTrash(true)}
              className="flex items-center gap-2 font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-2.5 rounded-xl transition-all text-sm shadow-sm"
            >
              <History className="w-4 h-4" /> Papelera
              {trashedNotices.length > 0 && (
                <span className="text-[10px] font-black bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">
                  {trashedNotices.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-2 font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2.5 rounded-xl transition-all text-sm shadow-sm">
              <HelpCircle className="w-4 h-4" /> ¿Cómo Funciona?
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowNewBoard(true)}
                className="flex items-center gap-2 font-bold text-[#7B2FBE] bg-purple-50 hover:bg-purple-100 border border-purple-200 px-4 py-2.5 rounded-xl transition-all text-sm"
              >
                <LayoutDashboard className="w-4 h-4" /> Nueva Pizarra
              </button>
            )}
            <button
              onClick={() => setShowNewNotice(true)}
              className="flex items-center gap-2 font-bold text-white bg-[#7B2FBE] hover:bg-[#5C1FA0] px-5 py-2.5 rounded-xl transition-all shadow-md text-sm"
            >
              <Plus className="w-4 h-4" /> Redactar Aviso
            </button>
          </div>
        )}
      </div>

      {/* â”€â”€ TODAY'S EVENTS BANNER â”€â”€ */}
      {todayEvents.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-amber-800 font-black text-sm flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5" /> Eventos y Sucesos Programados para Hoy
          </h3>
          <div className="flex flex-wrap gap-3">
            {todayEvents.map(evt => (
              <button key={evt.id} className="bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-400 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 group">
                <span className="truncate max-w-[250px]">{evt.title}</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* â”€â”€ DnD CONTEXT â”€â”€ */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Unassigned notices */}
        {unassigned.length > 0 && (
          <div className="space-y-4 pb-2">
            <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
              <div className="flex-1 h-px bg-gray-100" /> Sin Pizarra <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <SortableContext items={unassigned.map(n => n.id)} strategy={rectSortingStrategy}>
                {unassigned.map(notice => (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    boards={boards}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onDelete={handleDeleteNotice}
                    onUpdate={handleUpdateNotice}
                  />
                ))}
              </SortableContext>
            </div>
          </div>
        )}

        {/* Boards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SortableContext items={boards.map(b => `board-sort-${b.id}`)} strategy={rectSortingStrategy}>
            {boards.map(board => (
              <BoardSection
                key={board.id}
                board={board}
                notices={getBoardNotices(board.id)}
                boards={boards}
                canEdit={canEdit}
                canDelete={canDelete}
                onDeleteNotice={handleDeleteNotice}
                onUpdateNotice={handleUpdateNotice}
                onDeleteBoard={handleDeleteBoard}
                onToggleWidth={handleToggleBoardWidth}
              />
            ))}
          </SortableContext>
        </div>

        <DragOverlay>
          {activeDragData?.type === "Notice" && (
            <div className="bg-white/80 backdrop-blur-md border-2 border-purple-400 rounded-3xl p-5 shadow-2xl opacity-90 w-[400px] max-w-full">
              <div className="font-black text-base text-[#1A1A2E]">
                {activeDragData.notice.title || activeDragData.notice.content?.slice(0, 50)}
              </div>
            </div>
          )}
          {activeDragData?.type === "Board" && (
            <div className="bg-white/80 border-2 border-purple-400 rounded-3xl p-6 shadow-2xl h-24 w-[500px] max-w-full flex items-center">
              <div className="font-black text-xl text-[#1A1A2E]">{activeDragData.board.title}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* â”€â”€ MODAL: New Notice â”€â”€ */}
      {showNewNotice && (
        <div className="fixed inset-0 bg-[#1A1A2E]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-xl text-[#1A1A2E]">Redactar Aviso</h3>
              <button onClick={() => setShowNewNotice(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <input value={nTitle} onChange={e => setNTitle(e.target.value)}
                placeholder="Título del aviso..."
                className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3.5 text-base font-bold outline-none focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all" />
              <textarea value={nContent} onChange={e => setNContent(e.target.value)}
                placeholder="Detalle o descripción..." rows={4}
                className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3.5 text-sm outline-none focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all resize-none" />
              <div className="grid grid-cols-3 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-gray-500">Pizarra</span>
                  <select value={nBoardId || ""} onChange={e => setNBoardId(e.target.value || null)}
                    className="bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none font-bold text-gray-700">
                    <option value="">Sin pizarra</option>
                    {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-gray-500">Fecha Evento</span>
                  <input type="date" value={nEventAt} onChange={e => setNEventAt(e.target.value)}
                    className="bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none font-bold text-gray-700" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-gray-500">Vencimiento</span>
                  <input type="date" value={nExpiry} onChange={e => setNExpiry(e.target.value)}
                    className="bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none font-bold text-gray-700" />
                </label>
              </div>

              {/* Sub-Eventos */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-black text-[#1A1A2E]">Sub-Eventos (Ej: Talleres, Cronograma)</span>
                  <button onClick={() => setNSubnotes([...nSubnotes, { id: Date.now().toString(), title: "", eventAt: "" }])}
                    className="text-xs font-bold text-[#7B2FBE] bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {nSubnotes.map((sn, idx) => (
                    <div key={sn.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <input value={sn.title} onChange={e => {
                        const newSn = [...nSubnotes]; newSn[idx].title = e.target.value; setNSubnotes(newSn);
                      }} placeholder="Nombre del taller o hito..." className="flex-1 bg-white border border-gray-200 focus:border-purple-300 rounded-lg px-3 py-2 text-sm outline-none font-medium" />
                      <input type="date" value={sn.eventAt} onChange={e => {
                        const newSn = [...nSubnotes]; newSn[idx].eventAt = e.target.value; setNSubnotes(newSn);
                      }} className="bg-white border border-gray-200 focus:border-purple-300 rounded-lg px-3 py-2 text-sm outline-none w-36 font-bold text-gray-600" />
                      <button onClick={() => setNSubnotes(nSubnotes.filter(n => n.id !== sn.id))} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {nSubnotes.length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-4 border-2 border-dashed border-gray-100 rounded-xl">
                      No hay sub-eventos. Puedes agregar fechas específicas aquí.
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button onClick={handleAddNotice} className="flex-1 bg-[#7B2FBE] hover:bg-[#5C1FA0] text-white font-bold py-3.5 rounded-xl transition-all shadow-md">
                  Publicar Aviso
                </button>
                <button onClick={() => setShowNewNotice(false)} className="flex-1 bg-white border-2 border-gray-100 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ MODAL: New Board â”€â”€ */}
      {showNewBoard && (
        <div className="fixed inset-0 bg-[#1A1A2E]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-xl text-[#1A1A2E]">Nueva Pizarra</h3>
              <button onClick={() => setShowNewBoard(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-5">
              <input value={bTitle} onChange={e => setBTitle(e.target.value)}
                placeholder="Nombre de la pizarra..."
                className="w-full bg-gray-50 rounded-2xl px-5 py-3.5 text-base font-bold outline-none focus:ring-4 focus:ring-purple-100" />
              <div>
                <span className="text-xs font-bold text-gray-500 mb-2 block">Color temático</span>
                <div className="flex flex-wrap gap-2">
                  {BOARD_COLORS.map(c => (
                    <button key={c} onClick={() => setBColor(c)}
                      className={`w-10 h-10 rounded-2xl border-4 transition-transform ${bColor === c ? "border-gray-800 scale-110" : "border-transparent hover:scale-105"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleAddBoard} className="flex-1 bg-[#7B2FBE] text-white font-bold py-3.5 rounded-xl">Crear</button>
                <button onClick={() => setShowNewBoard(false)} className="flex-1 border-2 border-gray-100 text-gray-600 font-bold py-3.5 rounded-xl">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ MODAL: Papelera â”€â”€ */}
      {showTrash && (
        <div className="fixed inset-0 bg-[#1A1A2E]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-xl text-[#1A1A2E] flex items-center gap-2">
                <Trash2 className="w-6 h-6 text-gray-400" /> Papelera de Avisos
              </h3>
              <button onClick={() => setShowTrash(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              {trashedNotices.length === 0 ? (
                <div className="text-center text-gray-400 py-10 font-bold">La papelera está vacía.</div>
              ) : (
                <div className="space-y-3">
                  {trashedNotices.map(notice => (
                    <div key={notice.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-[#1A1A2E] truncate">{notice.title || notice.content?.slice(0, 60)}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Por: {notice.author} · {formatDate(notice.createdAt)}</div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleRestoreNotice(notice.id)}
                          className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all">
                          Restaurar
                        </button>
                        <button onClick={() => handlePermanentDelete(notice.id)}
                          className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ¿Cómo Funciona? ─── */}
      {showHelp && (
        <div className="fixed inset-0 bg-[#1A1A2E]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-xl text-[#1A1A2E] flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-blue-500" /> ¿Cómo Funciona?
              </h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-5 text-sm text-gray-600 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="flex gap-3 items-start">
                <span className="text-2xl leading-none">1️⃣</span>
                <div>
                  <p className="font-black text-[#1A1A2E] mb-1">Redactar un Aviso</p>
                  <p className="mb-2">Crea tarjetas de información para el equipo. Al crearlas, puedes asignarles características especiales:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Aviso Urgente:</strong> Destaca la tarjeta en color rojo vibrante para alertas inmediatas.</li>
                    <li><strong>Fecha del Evento:</strong> Ideal para talleres o cierres. Si el evento es HOY, aparecerá destacado en la parte superior de la pantalla.</li>
                    <li><strong>Fecha de Expiración:</strong> El aviso se borrará automáticamente del sistema al pasar este día.</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="text-2xl leading-none">2️⃣</span>
                <div>
                  <p className="font-black text-[#1A1A2E] mb-1">Organizar en Pizarras</p>
                  <p className="mb-2">Las Pizarras agrupan los avisos por temática. Tienes varias herramientas en la cabecera de cada pizarra para organizar y ajustar Cómo se ven:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Crear Pizarra:</strong> Usa el botón "Nueva Pizarra" para añadir un grupo nuevo.</li>
                    <li><strong>Vista Compacta / Tarjetas:</strong> Usa los iconos de lista y cuadrícula para cambiar entre la vista de tarjetas y una lista ultra-compacta. (El cambio lo verán todos).</li>
                    <li><strong>Ancho de la Pizarra:</strong> Usa los botones de expandir y contraer para que la pizarra ocupe la mitad o se expanda a todo lo ancho de la pantalla.</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="text-2xl leading-none">3️⃣</span>
                <div>
                  <p className="font-black text-[#1A1A2E] mb-1">Ordenar y Redimensionar Avisos</p>
                  <p className="mb-2">Tienes control total sobre Cómo se muestran los avisos individuales dentro de tu pantalla:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Arrastrar y Soltar (Reordenar):</strong> Haz clic sostenido en el ícono de puntos que aparece en cualquier aviso o pizarra y arrástralo libremente. Puedes mover avisos a otras pizarras o reordenar el orden de las pizarras en la pantalla.</li>
                    <li><strong>Agrandar un Aviso (Ancho Completo):</strong> Si estás usando la vista de tarjetas, usa el botón de expandir en el pie del aviso para que ocupe todo el ancho de la pizarra, destacándolo por sobre los demás.</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="text-2xl leading-none">4️⃣</span>
                <div>
                  <p className="font-black text-[#1A1A2E] mb-1">Papelera de Reciclaje</p>
                  <p className="mb-2">Cuando alguien elimina un aviso, este no desaparece para siempre. Queda guardado en la Papelera con registro completo de lo que ocurrió:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Eliminado Manual:</strong> El aviso fue borrado por un funcionario. La Papelera muestra exactamente quién lo eliminó y cuándo, por lo que nadie puede borrar un aviso sin dejar rastro.</li>
                    <li><strong>Expirado:</strong> El aviso cumplió su fecha de vencimiento y se archivó automáticamente, sin intervención de nadie.</li>
                    <li><strong>Restaurar:</strong> Cualquier aviso de la Papelera puede ser devuelto a la Pizarra principal con un clic.</li>
                    <li><strong>Destruir:</strong> El borrado permanente y definitivo solo lo puede realizar el creador original del aviso o el Administrador.</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="text-2xl leading-none">5️⃣</span>
                <div>
                  <p className="font-black text-[#1A1A2E] mb-1">Sub-Eventos (Ej: Talleres)</p>
                  <p className="mb-2">Puedes agregar múltiples "Sub-Eventos" dentro de un solo aviso. Esto es ideal para publicar cronogramas, talleres o fechas de cierres:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Creación:</strong> Al redactar un aviso, busca el botón de "+ Agregar" para añadir fechas específicas.</li>
                    <li><strong>Alerta Amarilla:</strong> Si un sub-evento ocurre "Hoy", se destacará en amarillo en la tarjeta y también aparecerá en la cinta superior de alertas.</li>
                    <li><strong>Historial Tachado:</strong> Cuando la fecha de un sub-evento ya pasó, este se mostrará tachado para que todos vean qué talleres ya se realizaron, sin tener que borrar el aviso principal.</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="w-full bg-[#7B2FBE] text-white font-bold py-3 rounded-xl hover:bg-[#5C1FA0] transition-all mt-4"
              >
                ¡Entendido, gracias!
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

