/// <reference types="vite/client" />

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }

  interface SpeechRecognitionConstructor {
    new (): SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    start(): void;
    stop(): void;
  }

  interface SpeechRecognitionResultLike {
    transcript: string;
  }

  interface SpeechRecognitionEvent {
    results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
  }

  interface SpeechRecognitionErrorEvent {
    error: string;
  }
}

export {};
