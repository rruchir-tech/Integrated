import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Download,
  MessageCircle,
  Plus,
  ScanSearch,
  SlidersHorizontal,
  Sparkles,
  SunMedium,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type FeedbackTone =
  | "navigate"
  | "create"
  | "analyze"
  | "save"
  | "filter"
  | "danger"
  | "theme"
  | "chat"
  | "export"
  | "neutral";

type FeedbackVoice = {
  id: number;
  message: string;
  tone: FeedbackTone;
};

type FeedbackBurst = {
  id: number;
  x: number;
  y: number;
  tone: FeedbackTone;
};

const ACTION_SELECTOR = [
  "[data-feedback]",
  "a[href]",
  "button",
  "[role='button']",
  "[role='menuitem']",
  "[role='tab']",
  "[role='combobox']",
  "input",
  "textarea",
  "select",
].join(",");

const toneIcons = {
  navigate: ArrowUpRight,
  create: Plus,
  analyze: ScanSearch,
  save: Check,
  filter: SlidersHorizontal,
  danger: AlertTriangle,
  theme: SunMedium,
  chat: MessageCircle,
  export: Download,
  neutral: Sparkles,
} satisfies Record<FeedbackTone, typeof Sparkles>;

function asActionTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>(ACTION_SELECTOR);
}

function isUnavailable(element: HTMLElement) {
  return element.matches(":disabled, [aria-disabled='true']") || element.dataset.feedback === "silent";
}

function getActionLabel(element: HTMLElement) {
  const labelledBy = element.getAttribute("aria-labelledby");
  const externalLabel = labelledBy ? document.getElementById(labelledBy)?.textContent : null;
  const associatedLabel = (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  )
    ? Array.from(element.labels ?? []).map((label) => label.textContent).join(" ")
    : null;
  const label =
    element.dataset.feedbackLabel ||
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    externalLabel ||
    associatedLabel ||
    (element instanceof HTMLInputElement ? element.placeholder || element.name : "") ||
    element.textContent ||
    "";

  return label.replace(/\s+/g, " ").replace(/\s*\*\s*$/, "").trim().slice(0, 48);
}

function inferFeedback(element: HTMLElement): { tone: FeedbackTone; message: string } {
  const requestedTone = element.dataset.feedback as FeedbackTone | undefined;
  const label = getActionLabel(element);
  const normalized = `${requestedTone ?? ""} ${label} ${element.getAttribute("href") ?? ""}`.toLowerCase();

  let tone: FeedbackTone = requestedTone && requestedTone in toneIcons ? requestedTone : "neutral";

  if (!requestedTone) {
    if (/delete|remove|reject|sign out|log out|discard/.test(normalized)) tone = "danger";
    else if (/analy|generate|insight|report|copilot|ai |protocol/.test(normalized)) tone = "analyze";
    else if (/create|new |add |start|duplicate/.test(normalized)) tone = "create";
    else if (/save|update|approve|complete|submit|apply/.test(normalized)) tone = "save";
    else if (/search|filter|sort|select|clear|reset|status/.test(normalized)) tone = "filter";
    else if (/message|send|ask|chat|comment/.test(normalized)) tone = "chat";
    else if (/export|download|print|csv|png|pdf/.test(normalized)) tone = "export";
    else if (/theme|light|dark/.test(normalized)) tone = "theme";
    else if (element.matches("a[href]")) tone = "navigate";
  }

  if (element.dataset.feedbackMessage) {
    return { tone, message: element.dataset.feedbackMessage };
  }

  switch (tone) {
    case "navigate":
      return { tone, message: label ? `Opening ${label}` : "Moving through the workspace" };
    case "create":
      return { tone, message: label ? `Making space for ${label.toLowerCase()}` : "Making space for something new" };
    case "analyze":
      return { tone, message: "Reading the signal and its context" };
    case "save":
      return { tone, message: "Locking in your changes" };
    case "filter":
      return { tone, message: "Narrowing the signal" };
    case "danger":
      return { tone, message: "Taking care with that change" };
    case "theme":
      return { tone, message: "Adjusting the workspace light" };
    case "chat":
      return { tone, message: "Passing that thought to the copilot" };
    case "export":
      return { tone, message: "Preparing a clean copy" };
    default:
      return { tone, message: label || "Workspace updated" };
  }
}

function centerOf(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function InteractionFeedback({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [voice, setVoice] = useState<FeedbackVoice | null>(null);
  const [bursts, setBursts] = useState<FeedbackBurst[]>([]);
  const sequence = useRef(0);
  const hideTimer = useRef<number | null>(null);
  const lastAnnouncement = useRef({ message: "", time: 0 });

  const announce = useCallback((message: string, tone: FeedbackTone) => {
    const now = performance.now();
    if (lastAnnouncement.current.message === message && now - lastAnnouncement.current.time < 350) return;
    lastAnnouncement.current = { message, time: now };

    const id = ++sequence.current;
    setVoice({ id, message, tone });
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setVoice((current) => current?.id === id ? null : current), 1850);
  }, []);

  const burst = useCallback((x: number, y: number, tone: FeedbackTone) => {
    if (reduceMotion) return;
    const id = ++sequence.current;
    setBursts((current) => [...current.slice(-4), { id, x, y, tone }]);
    window.setTimeout(() => setBursts((current) => current.filter((item) => item.id !== id)), 900);
  }, [reduceMotion]);

  useEffect(() => {
    let pointerFrame = 0;

    const onPointerMove = (event: PointerEvent) => {
      if (reduceMotion || event.pointerType === "touch") return;
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--interaction-x", `${event.clientX}px`);
        document.documentElement.style.setProperty("--interaction-y", `${event.clientY}px`);
        document.documentElement.dataset.pointerAwake = "true";
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const element = asActionTarget(event.target);
      if (!element || isUnavailable(element) || element.matches("input:not([type='checkbox']):not([type='radio']), textarea")) return;
      const { tone } = inferFeedback(element);
      burst(event.clientX, event.clientY, tone);
    };

    const onClick = (event: MouseEvent) => {
      const element = asActionTarget(event.target);
      if (!element || isUnavailable(element)) return;
      if (element.matches("input:not([type='checkbox']):not([type='radio']), textarea")) return;
      const feedback = inferFeedback(element);
      announce(feedback.message, feedback.tone);

      if (event.detail === 0) {
        const point = centerOf(element);
        burst(point.x, point.y, feedback.tone);
      }
    };

    const onFocus = (event: FocusEvent) => {
      const element = asActionTarget(event.target);
      if (!element || isUnavailable(element) || !element.matches("input, textarea, select, [role='combobox']")) return;
      const label = getActionLabel(element);
      const requested = element.dataset.feedbackMessage;
      announce(requested || (label ? `Listening for ${label.toLowerCase()}` : "Ready for your input"), "filter");
    };

    const onChange = (event: Event) => {
      const element = asActionTarget(event.target);
      if (!element || isUnavailable(element)) return;
      if (!element.matches("select, input[type='checkbox'], input[type='radio']")) return;
      announce(element.dataset.feedbackMessage || "Selection updated", "filter");
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
    document.addEventListener("click", onClick, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("change", onChange, true);

    return () => {
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("change", onChange, true);
      delete document.documentElement.dataset.pointerAwake;
    };
  }, [announce, burst, reduceMotion]);

  const VoiceIcon = voice ? toneIcons[voice.tone] : Sparkles;

  return (
    <>
      {children}
      <div className="interaction-spotlight" aria-hidden="true" />

      <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
        {bursts.map((item) => (
          <span
            key={item.id}
            className="interaction-burst"
            data-tone={item.tone}
            style={{ "--burst-x": `${item.x}px`, "--burst-y": `${item.y}px` } as CSSProperties}
          />
        ))}
      </div>

      <div className="interaction-voice-wrap" aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="wait" initial={false}>
          {voice ? (
            <motion.div
              key={voice.id}
              data-tone={voice.tone}
              className="interaction-voice"
              initial={{ opacity: 0, y: 10, scale: 0.96, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, scale: 0.98, filter: "blur(3px)" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="interaction-voice-icon"><VoiceIcon className="h-3.5 w-3.5" /></span>
              <span className="min-w-0">
                <span className="interaction-voice-name">Bioalyzer</span>
                <span className="interaction-voice-message">{voice.message}</span>
              </span>
              <span className="interaction-voice-wave" aria-hidden="true">
                <i /><i /><i />
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="listening"
              className="interaction-listening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.35 }}
              aria-hidden="true"
            >
              <span className="signal-dot h-1.5 w-1.5 rounded-full bg-emerald-400 text-emerald-400" />
              <span>Bioalyzer is listening</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
