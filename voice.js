
const LIFE_VOICE = {
  recognition: null,
  supported: false,

  init(onResult, onStatus) {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onStatus?.("Reconnaissance vocale non disponible");
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = "fr-FR";
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onresult = event => {
      const text = event.results[0][0].transcript;
      onResult?.(text);
    };

    this.recognition.onerror = () => {
      onStatus?.("Erreur de reconnaissance vocale");
    };

    this.recognition.onend = () => {
      onStatus?.("Micro arrêté");
    };

    this.supported = true;
    return true;
  },

  start() {
    if (!this.recognition) return false;

    this.recognition.start();
    return true;
  },

  stop() {
    this.recognition?.stop();
  }
};

window.LIFE_VOICE = LIFE_VOICE;
