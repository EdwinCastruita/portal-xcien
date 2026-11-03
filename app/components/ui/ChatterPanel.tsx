"use client";

import DOMPurify from "dompurify";
import {
  Loader2,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/app/components/ToastContext";
import { apiFetch } from "@/app/lib/api";

const PAGE_SIZE = 30;

interface Thread {
  model: string;
  res_id: number;
  name: string;
  kind: string;
  stage: string;
  active: boolean;
  message_count: number;
}

interface Message {
  id: number;
  author: string;
  date: string;
  body: string;
  is_note: boolean;
  attachments: { name: string }[];
}

interface Participant {
  id: number;
  name: string;
}

interface ChatterPanelProps {
  solicitudId: string;
  onClose: () => void;
}

const threadKey = (thread: Thread) => `${thread.model}:${thread.res_id}`;

const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Ocurrió un error inesperado";

// Los enlaces al backend de Odoo no abren en el portal: quedan como texto.
function renderBody(html: string) {
  const fragment = DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });
  for (const link of fragment.querySelectorAll("a")) {
    const href = link.getAttribute("href") || "";
    if (!href || /^(#|\/web|\/mail|\/odoo)/.test(href)) {
      link.replaceWith(...link.childNodes);
    } else {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  }
  const container = document.createElement("div");
  container.append(fragment);
  return DOMPurify.sanitize(container.innerHTML, { ADD_ATTR: ["target"] });
}

const threadOption = (thread: Thread) => (
  <option key={threadKey(thread)} value={threadKey(thread)}>
    {thread.kind} · {thread.name} ({thread.message_count})
    {thread.active ? "" : " · Archivada"}
  </option>
);

export default function ChatterPanel({
  solicitudId,
  onClose,
}: ChatterPanelProps) {
  const { success, error: toastError } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [notifyIds, setNotifyIds] = useState<number[]>([]);
  const [posting, setPosting] = useState(false);
  // Evita que una respuesta tardía pinte los mensajes de otro hilo.
  const messagesRequest = useRef<AbortController | null>(null);

  const selected = threads.find((thread) => threadKey(thread) === selectedKey);
  const leadThreads = threads.filter((thread) => thread.model === "crm.lead");
  const taskThreads = threads.filter((thread) => thread.model !== "crm.lead");
  const base = `/solicitudes/${encodeURIComponent(solicitudId)}/chatter`;

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const res = await apiFetch<{ threads: Thread[] }>(base, {
        company: true,
      });
      setThreads(res.threads);
      setSelectedKey(
        (current) =>
          current || (res.threads[0] ? threadKey(res.threads[0]) : ""),
      );
    } catch (err) {
      toastError(errorMessage(err));
    } finally {
      setLoadingThreads(false);
    }
  }, [base, toastError]);

  const loadMessages = useCallback(
    async (key: string, offset = 0) => {
      messagesRequest.current?.abort();
      const controller = new AbortController();
      messagesRequest.current = controller;
      setLoadingMessages(true);
      const [model, resId] = key.split(":");
      const query = new URLSearchParams({
        model,
        res_id: resId,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      try {
        const res = await apiFetch<{
          messages: Message[];
          has_more: boolean;
          participants: Participant[];
        }>(`${base}/messages?${query}`, {
          company: true,
          signal: controller.signal,
        });
        setMessages((current) =>
          offset ? [...current, ...res.messages] : res.messages,
        );
        setHasMore(res.has_more);
        setParticipants(res.participants);
      } catch (err) {
        if (!controller.signal.aborted) toastError(errorMessage(err));
      } finally {
        if (!controller.signal.aborted) setLoadingMessages(false);
      }
    },
    [base, toastError],
  );

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!selectedKey) return;
    setMessages([]);
    setHasMore(false);
    setParticipants([]);
    setNotifyIds([]);
    loadMessages(selectedKey);
    return () => messagesRequest.current?.abort();
  }, [selectedKey, loadMessages]);

  const refresh = () => {
    loadThreads();
    if (selectedKey) loadMessages(selectedKey);
  };

  const post = async () => {
    if (!selected || !draft.trim()) return;
    setPosting(true);
    try {
      await apiFetch(`${base}/post`, {
        method: "POST",
        company: true,
        body: {
          model: selected.model,
          res_id: selected.res_id,
          body: draft,
          partner_ids: notifyIds,
        },
      });
      setDraft("");
      setNotifyIds([]);
      success("Nota registrada");
      refresh();
    } catch (err) {
      toastError(errorMessage(err));
    } finally {
      setPosting(false);
    }
  };

  const toggleNotify = (partnerId: number) =>
    setNotifyIds((current) =>
      current.includes(partnerId)
        ? current.filter((id) => id !== partnerId)
        : [...current, partnerId],
    );

  return (
    <div className="overlay-backdrop overlay-drawer animate-fade-in">
      <div className="drawer-panel md:max-w-xl lg:max-w-2xl animate-slide-in-from-right flex flex-col overflow-hidden lg:p-8">
        <div className="flex items-start justify-between gap-4 mb-5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <MessageSquare
              className="w-8 h-8 shrink-0 text-(--brand-accent)"
              strokeWidth={1.5}
            />
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter">
              Interacciones
            </h2>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={refresh}
              aria-label="Actualizar"
              title="Actualizar"
              className="w-11 h-11 rounded-xl flex items-center justify-center text-base-content/60 hover:bg-base-content/5"
            >
              <RefreshCw
                className={`w-4 h-4 ${loadingMessages || loadingThreads ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              title="Cerrar"
              className="w-11 h-11 rounded-xl flex items-center justify-center text-base-content/60 hover:bg-base-content/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="shrink-0 mb-4">
          <div
            className={`grid gap-3 ${taskThreads.length ? "sm:grid-cols-2" : ""}`}
          >
            <div className="min-w-0">
              <label
                htmlFor="chatter-opportunity"
                className="block text-[10px] font-black uppercase tracking-widest text-base-content/50 mb-2"
              >
                Oportunidad
              </label>
              <select
                id="chatter-opportunity"
                value={selected?.model === "crm.lead" ? selectedKey : ""}
                onChange={(e) => setSelectedKey(e.target.value)}
                disabled={!leadThreads.length}
                className="select select-bordered bg-base-100 w-full rounded-xl"
              >
                <option value="" disabled hidden>
                  Ver mensajes de la oportunidad
                </option>
                {leadThreads.map(threadOption)}
              </select>
            </div>
            {taskThreads.length > 0 && (
              <div className="min-w-0">
                <label
                  htmlFor="chatter-task"
                  className="block text-[10px] font-black uppercase tracking-widest text-base-content/50 mb-2"
                >
                  Tareas relacionadas ({taskThreads.length})
                </label>
                <select
                  id="chatter-task"
                  value={selected?.model === "project.task" ? selectedKey : ""}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="select select-bordered bg-base-100 w-full rounded-xl"
                >
                  <option value="" disabled hidden>
                    Selecciona una tarea
                  </option>
                  {taskThreads.map(threadOption)}
                </select>
              </div>
            )}
          </div>
          {selected?.stage && (
            <p className="text-xs text-base-content/50 mt-2">
              Etapa: {selected.stage}
            </p>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar space-y-3 pr-1">
          {messages.map((message) => (
            <article
              key={message.id}
              className="rounded-2xl border border-base-content/10 bg-base-content/[0.03] p-4"
            >
              <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-2">
                <span className="text-sm font-bold min-w-0 break-words">
                  {message.author || "Sistema"}
                </span>
                <span className="text-xs text-base-content/50">
                  {message.date &&
                    new Date(message.date).toLocaleString("es-MX", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  {message.is_note && " · Nota"}
                </span>
              </header>
              <div
                className="rich-text text-sm"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML sanitizado con DOMPurify
                dangerouslySetInnerHTML={{ __html: renderBody(message.body) }}
              />
              {message.attachments.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {message.attachments.map((attachment, index) => (
                    <li
                      // biome-ignore lint/suspicious/noArrayIndexKey: los nombres pueden repetirse
                      key={index}
                      className="flex items-center gap-2 text-xs text-base-content/60 break-all"
                    >
                      <Paperclip className="w-3 h-3 shrink-0" />
                      {attachment.name}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}

          {loadingMessages && messages.length === 0 && (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-base-content/40" />
            </div>
          )}
          {!loadingMessages && !loadingThreads && messages.length === 0 && (
            <p className="text-sm text-base-content/50 text-center py-10">
              Sin mensajes en esta conversación.
            </p>
          )}
          {hasMore && (
            <button
              type="button"
              onClick={() => loadMessages(selectedKey, messages.length)}
              disabled={loadingMessages}
              className="btn-cta-tertiary w-full py-3 rounded-2xl text-[10px] disabled:opacity-50"
            >
              Cargar más
            </button>
          )}
        </div>

        <div className="shrink-0 pt-4 mt-4 border-t border-base-content/10 space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            disabled={!selected}
            aria-label="Nueva nota"
            placeholder={
              selected
                ? `Nota en ${selected.kind}: ${selected.name}`
                : "Escribe una nota..."
            }
            className="textarea textarea-bordered bg-base-100 w-full rounded-xl"
          />
          {participants.length > 0 && (
            <fieldset>
              <legend className="text-[10px] font-black uppercase tracking-widest text-base-content/50 mb-1">
                Notificar a (opcional)
              </legend>
              <div className="flex flex-wrap gap-x-4 max-h-24 overflow-y-auto custom-scrollbar">
                {participants.map((participant) => (
                  <label
                    key={participant.id}
                    className="flex items-center gap-2 min-h-11 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={notifyIds.includes(participant.id)}
                      onChange={() => toggleNotify(participant.id)}
                      className="checkbox checkbox-sm"
                    />
                    {participant.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <button
            type="button"
            onClick={post}
            disabled={posting || !selected || !draft.trim()}
            className="btn-cta-secondary w-full sm:w-auto sm:ml-auto px-6 py-3 rounded-2xl text-[10px] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {posting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Registrar nota
          </button>
        </div>
      </div>
    </div>
  );
}
