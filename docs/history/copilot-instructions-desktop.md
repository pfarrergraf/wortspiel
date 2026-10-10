# Copilot Instructions for Tabu Desktop App

## Project Overview
This is a German-language **desktop Tabu game** with real-time voice recognition. Players describe words without using forbidden "taboo" terms, while AI listens to detect rule violations and correct guesses.

**Core Architecture:**
- **Voice Pipeline**: `faster-whisper` (speech-to-text) + `speechbrain` (speaker identification) 
- **Game Logic**: `TabuGame` class manages cards, scoring, and rule validation in `tabu_app.py`
- **UI**: PyQt5 desktop interface with real-time audio processing in background thread
- **Data**: JSON cards in `tabu_cards.json` (German words + forbidden terms)

## Key Components & Data Flow

```
Audio Input → AudioStreamWorker → VoiceRecognizer → TabuGame → MainWindow
    ↓              ↓                    ↓              ↓           ↓
sounddevice → faster-whisper → speechbrain → rule logic → PyQt5 UI
```

**Critical Classes:**
- `AudioStreamWorker`: Background thread handling continuous audio capture (3-sec chunks)
- `VoiceRecognizer`: Speaker embedding generation and identification using ECAPA model
- `TabuGame`: Rule validation - detects taboo words from explainer, correct guesses from others
- `MainWindow`: PyQt5 UI showing current word, forbidden terms, score

## Development Workflow

**Setup & Testing:**
```powershell
# Bootstrap entire environment (recommended)
.\bootstrap.ps1

# Manual setup
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python test_app.py  # Validates all components

# Run app
python tabu_app.py
```

**Key Files:**
- `requirements.txt`: Includes CUDA installation notes for GPU acceleration
- `test_app.py`: Component validation (imports, audio devices, game logic)
- `bootstrap.ps1`: Automated setup script with error handling

## GPU/Performance Considerations

**Device Selection Pattern:**
```python
device = "cuda" if torch.cuda.is_available() else "cpu"
compute_type = "float16" if device == "cuda" else "int8"
```

- App auto-detects CUDA availability and adjusts model precision
- CPU fallback is always available
- SpeechBrain models attempt GPU placement but gracefully degrade

**Audio Processing Chain:**
- 16kHz mono audio chunks (3-second windows)
- Temporary WAV files for speaker recognition (`/tmp/tmp_segment.wav`)
- Real-time transcription with German language model

## Project-Specific Patterns

**Card Data Structure:**
```json
{"word": "Advent", "taboo": ["Weihnachten", "Kerzen", "Ankunft", "Krippe"]}
```

**Error Handling Philosophy:**
- Graceful degradation: missing CUDA → CPU, missing audio → continue
- Silent failures in audio processing with console logging
- Type hints removed from problematic locations to avoid runtime errors

**Thread Safety:**
- `AudioStreamWorker` runs as daemon thread with `queue.Queue` for audio data
- Clean shutdown pattern: `worker.stop()` → `worker.join()`

## Integration Points

**External Dependencies:**
- Hugging Face models auto-downloaded to `/tmp/speechbrain/`
- Windows-specific audio backend via `sounddevice`/PortAudio
- PyQt5 for cross-platform desktop UI

**Common Debugging:**
- Audio device issues: Check `sounddevice.query_devices()` output
- CUDA problems: Verify torch installation and driver compatibility
- Speaker recognition fails: Embeddings not trained (expected in current version)

## Language & Localization
- German-language Whisper model (`language="de"`)
- German UI text and card content
- Comments and docstrings in German
