"use client";

import { Brain, Check, Copy, RotateCcw, SendHorizontal, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CoachView } from "@/server/assistant/view";
import { forgetFactAction, resetConversationAction, sendMessageAction } from "./actions";

type Message = CoachView["messages"][number] & { pending?: boolean };

const MAX = 1500;

export function Coach({ view, draft }: { view: CoachView; draft: string }) {
  const [messages, setMessages] = useState<Message[]>(view.messages);
  const [quota, setQuota] = useState(view.quota);
  const [memory, setMemory] = useState(view.memory);
  const [text, setText] = useState(draft);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const counter = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  const send = (value: string) => {
    const content = value.trim();
    if (!content || pending) return;
    setError(null);
    setNotice(null);
    const tempId = `temp-${++counter.current}`;
    setMessages((list) => [...list, { id: tempId, role: "user", content, pending: true }]);
    setText("");
    start(async () => {
      try {
        const result = await sendMessageAction(content);
        if (!result.ok) {
          // Le message n'est pas parti : on le rend à la personne pour qu'elle puisse réessayer.
          setMessages((list) => list.filter((m) => m.id !== tempId));
          setText(content);
          setError(result.error);
          return;
        }
        setMessages((list) => [
          ...list.map((m) => (m.id === tempId ? { ...m, id: result.question.id, pending: false } : m)),
          { id: result.reply.id, role: "assistant", content: result.reply.content },
        ]);
        setQuota(result.quota);
        if (result.remembered.length) {
          setMemory((list) => [...list, ...result.remembered]);
          setNotice(`Je retiens : ${result.remembered.join(" ; ")}`);
        }
      } catch {
        setMessages((list) => list.filter((m) => m.id !== tempId));
        setText(content);
        setError("Connexion perdue. Ton message n'est pas parti : réessaie dans un instant.");
      }
    });
  };

  const reset = () => {
    if (!window.confirm("Effacer cette conversation ? Ce que le coach retient de ton projet est conservé.")) return;
    start(async () => {
      await resetConversationAction();
      setMessages([]);
    });
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">Ton coach</p>
          <h1 className="mt-1 text-2xl leading-tight font-bold text-balance sm:text-3xl">{view.projectName}</h1>
        </div>
        <QuotaBadge quota={quota} />
      </header>

      <MemoryPanel memory={memory} onForget={(fact) => {
        setMemory((list) => list.filter((f) => f !== fact));
        void forgetFactAction(fact);
      }} />

      <section aria-label="Conversation" className="flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="rounded-card border border-border bg-card p-5 sm:p-6">
            <p className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-5 text-primary" aria-hidden /> Je connais ton plan, ton terrain et où tu en es.
            </p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Pose-moi n&apos;importe quelle question sur ton projet : je te réponds avec une action concrète pour cette
              semaine. Tu peux aussi me demander d&apos;écrire un message pour tes clients.
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {view.suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    disabled={pending || quota.exhausted}
                    className="w-full cursor-pointer rounded-xl border border-border px-4 py-3 text-left text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary-soft/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ol className="flex flex-col gap-4" aria-live="polite" aria-relevant="additions">
          {messages.map((m) => (
            <li key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "user" ? (
                <p className={cn("max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 whitespace-pre-line text-primary-foreground", m.pending && "opacity-70")}>
                  {m.content}
                </p>
              ) : (
                <CoachBubble content={m.content} />
              )}
            </li>
          ))}
          {pending && messages.at(-1)?.role === "user" && (
            <li className="flex justify-start">
              <p className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-muted-foreground" role="status">
                <span className="flex gap-1" aria-hidden>
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} className="size-2 animate-bounce rounded-full bg-primary motion-reduce:animate-none" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </span>
                Le coach réfléchit…
              </p>
            </li>
          )}
        </ol>
        <div ref={endRef} />
      </section>

      {notice && (
        <Alert tone="success" className="flex items-start gap-2">
          <Brain className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          {notice}
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="sticky bottom-20 z-10 rounded-card border border-border bg-card p-2 shadow-card md:bottom-4"
      >
        <label htmlFor="message" className="sr-only">
          Ton message au coach
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="message"
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => {
              // Entrée envoie sur ordinateur ; Maj+Entrée va à la ligne.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                send(text);
              }
            }}
            rows={Math.min(5, Math.max(1, text.split("\n").length))}
            placeholder={quota.exhausted ? "Tes échanges du mois sont utilisés" : "Écris ta question…"}
            disabled={quota.exhausted}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="icon" aria-label="Envoyer" disabled={pending || !text.trim() || quota.exhausted} className="size-11 shrink-0">
            <SendHorizontal aria-hidden />
          </Button>
        </div>
      </form>

      {messages.length > 0 && (
        <button
          type="button"
          onClick={reset}
          disabled={pending}
          className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 self-center text-sm text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-4" aria-hidden /> Nouvelle conversation
        </button>
      )}
    </div>
  );
}

function CoachBubble({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible (navigateur ancien) : la personne peut sélectionner le texte.
    }
  };
  return (
    <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-3 leading-relaxed">
        {content.split(/\n{2,}/).map((paragraph, i) => (
          <p key={i} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
      <button
        type="button"
        onClick={copy}
        className="-mb-1 mt-2 inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}

function QuotaBadge({ quota }: { quota: CoachView["quota"] }) {
  const low = quota.percentLeft <= 20;
  return (
    <div className="flex min-w-40 flex-col gap-1.5" title="Échanges offerts ce mois-ci">
      <span className={cn("text-xs font-medium", low ? "text-highlight" : "text-muted-foreground")}>
        {quota.exhausted
          ? "Plus d'échanges ce mois-ci"
          : `Environ ${quota.messagesLeft} échange${quota.messagesLeft > 1 ? "s" : ""} restant${quota.messagesLeft > 1 ? "s" : ""} ce mois-ci`}
      </span>
      <span
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={quota.percentLeft}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Échanges restants ce mois-ci"
      >
        <span className={cn("block h-full rounded-full", low ? "bg-highlight" : "bg-primary")} style={{ width: `${quota.percentLeft}%` }} />
      </span>
    </div>
  );
}

function MemoryPanel({ memory, onForget }: { memory: string[]; onForget: (fact: string) => void }) {
  if (!memory.length) return null;
  return (
    <details className="group rounded-card border border-border bg-card px-4 py-3">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <Brain className="size-4 text-primary" aria-hidden />
        Ce que je retiens de ton projet ({memory.length})
      </summary>
      <p className="mt-1 text-sm text-muted-foreground">Je m&apos;en sers pour mieux te répondre. Retire ce qui n&apos;est plus vrai.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {memory.map((fact) => (
          <li key={fact} className="flex items-start justify-between gap-3 text-sm">
            <span className="pt-2">{fact}</span>
            <button
              type="button"
              onClick={() => onForget(fact)}
              aria-label={`Oublier : ${fact}`}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
