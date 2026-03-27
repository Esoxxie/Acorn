import { useEffect, useRef, useState } from "react";

export function useSpeechCapture() {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const supported = typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  function stop() {
    recognitionRef.current?.stop();
  }

  function reset() {
    setTranscript("");
    setError(null);
  }

  function start() {
    if (!supported) {
      setError("Voice input is not available in this browser.");
      return;
    }

    const SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechCtor) {
      setError("Voice input is not available in this browser.");
      return;
    }

    const recognition = new SpeechCtor();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "en-US";
    recognition.onerror = (event) => {
      setError(event.error || "Could not capture speech right now.");
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognition.onresult = (event) => {
      const joined = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      setTranscript(joined);
      setError(null);
    };
    setListening(true);
    recognition.start();
  }

  return {
    supported,
    listening,
    transcript,
    error,
    start,
    stop,
    reset,
    setTranscript,
  };
}
