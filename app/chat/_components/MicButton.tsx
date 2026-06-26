"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import styles from "../window.module.css";

// Tipos mínimos del Web Speech API (no están en lib.dom estándar).
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

/**
 * Dictado por voz: transcribe en español al cuadro de texto usando el
 * reconocimiento del navegador (Chrome/Edge). Si no está disponible, no
 * se muestra el botón.
 */
export default function MicButton({
  onText,
}: {
  onText: (text: string) => void;
}) {
  const recRef = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);

  // Mantiene la última callback sin recrear el reconocimiento.
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: RecognitionCtor;
      webkitSpeechRecognition?: RecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) text += r[0].transcript;
      }
      if (text.trim()) onTextRef.current(text.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        /* ya parado */
      }
    };
  }, []);

  if (!supported) return null;

  function toggle() {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      try {
        rec.start();
        setListening(true);
      } catch {
        /* ya iniciado */
      }
    }
  }

  return (
    <button
      type="button"
      className={`${styles.tool} ${listening ? styles.toolOn : ""}`}
      onClick={toggle}
      aria-pressed={listening}
      title={listening ? "Detener dictado" : "Dictar por voz"}
      aria-label="Dictar por voz"
    >
      {listening ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
  );
}
