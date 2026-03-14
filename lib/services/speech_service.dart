import 'dart:async';

import 'package:speech_to_text/speech_recognition_error.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

typedef SpeechResultCallback = void Function(String recognizedWords, bool isFinal);
typedef SpeechErrorCallback = void Function(String message);
typedef SpeechStatusCallback = void Function(String status);
typedef SpeechLevelCallback = void Function(double level);

class SpeechService {
  SpeechService({
    this.onSpeechResult,
    this.onSpeechError,
    this.onSpeechStatus,
    this.onSpeechLevel,
  });

  final SpeechToText _speechToText = SpeechToText();

  SpeechResultCallback? onSpeechResult;
  SpeechErrorCallback? onSpeechError;
  SpeechStatusCallback? onSpeechStatus;
  SpeechLevelCallback? onSpeechLevel;

  bool _initialized = false;
  bool _available = false;

  bool get isListening => _speechToText.isListening;
  bool get isAvailable => _available;

  Future<bool> initialize({bool force = false}) async {
    if (_initialized && !force) return _available;

    // Initializes native speech services and triggers microphone permission flow.
    _available = await _speechToText.initialize(
      onStatus: _handleStatus,
      onError: _handleError,
      debugLogging: false,
    );
    _initialized = true;

    if (!_available) {
      final hasMicPermission = await _speechToText.hasPermission;
      if (!hasMicPermission) {
        onSpeechError?.call('Microphone permission required');
      } else {
        onSpeechError?.call('Voice input unavailable');
      }
    }

    return _available;
  }

  Future<void> startListening({String localeId = 'en_CA'}) async {
    final ready = _initialized ? _available : await initialize();
    if (!ready) return;
    if (_speechToText.isListening) return;

    // Starts continuous listening and emits partial transcripts for live UI updates.
    await _speechToText.listen(
      onResult: _handleResult,
      localeId: localeId,
      listenOptions: SpeechListenOptions(
        partialResults: true,
        listenMode: ListenMode.dictation,
        cancelOnError: true,
      ),
      onSoundLevelChange: (level) => onSpeechLevel?.call(level),
    );
  }

  Future<void> stopListening() async {
    if (_speechToText.isListening) {
      await _speechToText.stop();
    }
  }

  Future<void> cancelListening() async {
    if (_speechToText.isListening) {
      await _speechToText.cancel();
    }
  }

  void dispose() {
    unawaited(cancelListening());
  }

  void _handleResult(SpeechRecognitionResult result) {
    onSpeechResult?.call(result.recognizedWords, result.finalResult);
  }

  void _handleError(SpeechRecognitionError error) {
    final message = error.errorMsg.isEmpty ? 'Speech recognition error' : error.errorMsg;
    onSpeechError?.call(message);
  }

  void _handleStatus(String status) {
    onSpeechStatus?.call(status);
  }
}
