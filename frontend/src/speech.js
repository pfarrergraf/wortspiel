import { normalize } from "./engine.js";
import { isNativeApp } from "./native.js";

export function findSpeechMatches(text, card) {
  const heard = ` ${normalize(text)} `;
  const includes = (word) => heard.includes(` ${normalize(word)} `);
  return { taboo: card.taboo.filter(includes), guessed: includes(card.word) };
}

// No fallback to remote recognition: browsers must support explicit local processing.
export class LocalSpeech {
  constructor(onText, onStatus) {
    this.onText = onText;
    this.onStatus = onStatus;
    this.instance = null;
    this.running = false;
  }

  static constructorForBrowser() {
    return globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  }

  static async availability() {
    // The Android package requests no microphone permission and has no
    // native/cloud recognition plugin. Keep every manual game control.
    if (isNativeApp()) return "unsupported";
    const Constructor = LocalSpeech.constructorForBrowser();
    if (
      !Constructor ||
      !("processLocally" in Constructor.prototype) ||
      typeof Constructor.available !== "function"
    )
      return "unsupported";
    try {
      return await Constructor.available({
        langs: ["de-DE"],
        processLocally: true,
      });
    } catch {
      return "unavailable";
    }
  }

  static async install() {
    const Constructor = LocalSpeech.constructorForBrowser();
    if (typeof Constructor?.install !== "function") return false;
    return Constructor.install({ langs: ["de-DE"], processLocally: true });
  }

  async start() {
    if (this.running) return;
    if ((await LocalSpeech.availability()) !== "available")
      throw new Error(
        "Lokale Spracherkennung ist auf diesem Gerät nicht verfügbar. Die Spieltasten funktionieren weiterhin.",
      );
    const Constructor = LocalSpeech.constructorForBrowser();
    const recognition = new Constructor();
    recognition.processLocally = true;
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = false;
    this.instance = recognition;
    this.running = true;
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++)
        if (event.results[i].isFinal)
          this.onText(event.results[i][0].transcript);
    };
    recognition.onerror = (event) => {
      this.stop();
      this.onStatus(
        `Mikrofon gestoppt (${event.error}). Bitte nutze die Spieltasten.`,
      );
    };
    recognition.onend = () => {
      if (this.running) {
        this.running = false;
        this.onStatus("Mikrofon beendet. Mit den Spieltasten weiterspielen.");
      }
    };
    try {
      recognition.start();
      this.onStatus("Mikrofon hört lokal zu.");
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  stop() {
    this.running = false;
    const recognition = this.instance;
    this.instance = null;
    if (recognition) {
      recognition.onend = null;
      recognition.abort();
    }
  }
}
