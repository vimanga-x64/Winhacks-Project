import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../services/speech_service.dart';

class VoiceMessageInput extends StatefulWidget {
  const VoiceMessageInput({
    super.key,
    required this.onSubmit,
    this.hintText = 'Type or speak your message',
    this.localeId = 'en_CA',
    this.enabled = true,
  });

  final Future<void> Function(String text) onSubmit;
  final String hintText;
  final String localeId;
  final bool enabled;

  @override
  State<VoiceMessageInput> createState() => _VoiceMessageInputState();
}

class _VoiceMessageInputState extends State<VoiceMessageInput> {
  late final TextEditingController _controller;
  late final SpeechService _speechService;

  bool _isListening = false;
  bool _speechReady = false;
  bool _isSubmitting = false;
  String _statusText = 'Initializing voice input...';

  double _soundLevel = 0;
  double _minSoundLevel = 0;
  double _maxSoundLevel = 1;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
    _speechService = SpeechService(
      onSpeechResult: _onSpeechResult,
      onSpeechError: _onSpeechError,
      onSpeechStatus: _onSpeechStatus,
      onSpeechLevel: _onSpeechLevel,
    );
    _initializeSpeech();
  }

  @override
  void dispose() {
    // Ensures we stop/cancel recognizer when widget leaves the tree.
    _speechService.dispose();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _initializeSpeech({bool force = false}) async {
    // Triggers plugin initialization and platform microphone permission flow.
    final available = await _speechService.initialize(force: force);
    if (!mounted) return;
    setState(() {
      _speechReady = available;
      _statusText = available ? 'Tap the mic to speak' : _statusText;
    });
  }

  Future<void> _toggleListening() async {
    if (!widget.enabled || _isSubmitting) return;

    if (!_speechReady) {
      await _initializeSpeech(force: true);
      if (!_speechReady) return;
    }

    if (_isListening) {
      await _speechService.stopListening();
      return;
    }

    await _speechService.startListening(localeId: widget.localeId);
  }

  Future<void> _cancelListening() async {
    await _speechService.cancelListening();
    if (!mounted) return;
    setState(() {
      _isListening = false;
      _soundLevel = 0;
      _statusText = 'Voice input cancelled';
    });
  }

  Future<void> _submit() async {
    if (!widget.enabled || _isSubmitting) return;
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    if (_isListening) {
      await _speechService.stopListening();
    }

    setState(() => _isSubmitting = true);
    try {
      await widget.onSubmit(text);
      if (!mounted) return;
      setState(() {
        _controller.clear();
        _statusText = 'Message sent';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _statusText = 'Failed to send message');
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text('Failed to send message')),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  void _onSpeechResult(String recognizedWords, bool isFinal) {
    if (!mounted) return;
    setState(() {
      _controller.value = TextEditingValue(
        text: recognizedWords,
        selection: TextSelection.collapsed(offset: recognizedWords.length),
      );
      _statusText = isFinal ? 'Speech captured' : 'Listening...';
    });
  }

  void _onSpeechError(String message) {
    if (!mounted) return;
    final normalizedMessage = _normalizeError(message);
    setState(() {
      _isListening = false;
      _soundLevel = 0;
      _statusText = normalizedMessage;
      if (normalizedMessage == 'Microphone permission required' ||
          normalizedMessage == 'Voice input unavailable') {
        _speechReady = false;
      }
    });
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(content: Text(normalizedMessage)),
    );
  }

  void _onSpeechStatus(String status) {
    if (!mounted) return;
    final listening = status.toLowerCase() == 'listening';
    setState(() {
      _isListening = listening;
      if (listening) {
        _statusText = 'Listening...';
      } else if (_statusText == 'Listening...') {
        _statusText = 'Tap the mic to speak';
      }
      if (!listening) {
        _soundLevel = 0;
      }
    });
  }

  void _onSpeechLevel(double level) {
    if (!mounted) return;
    setState(() {
      _soundLevel = level;
      _minSoundLevel = math.min(_minSoundLevel, level);
      _maxSoundLevel = math.max(_maxSoundLevel, level);
    });
  }

  String _normalizeError(String message) {
    final lower = message.toLowerCase();
    if (lower.contains('permission')) {
      return 'Microphone permission required';
    }
    if (lower.contains('notavailable') ||
        lower.contains('not available') ||
        lower.contains('speech unavailable')) {
      return 'Voice input unavailable';
    }
    return 'Recognition error: $message';
  }

  double get _soundLevelProgress {
    final delta = _maxSoundLevel - _minSoundLevel;
    if (delta <= 0) return 0;
    return ((_soundLevel - _minSoundLevel) / delta).clamp(0.0, 1.0);
  }

  @override
  Widget build(BuildContext context) {
    final canSend = widget.enabled && !_isSubmitting && _controller.text.trim().isNotEmpty;
    final micDisabled = !widget.enabled || _isSubmitting || !_speechReady;

    final micIcon = micDisabled
        ? Icons.mic
        : _isListening
            ? Icons.mic
            : Icons.mic_none;

    final micColor = micDisabled
        ? Colors.grey
        : _isListening
            ? Colors.redAccent
            : Theme.of(context).iconTheme.color;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _controller,
          enabled: widget.enabled && !_isSubmitting,
          minLines: 1,
          maxLines: 4,
          textInputAction: TextInputAction.newline,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            hintText: widget.hintText,
            suffixIconConstraints: const BoxConstraints(minWidth: 96),
            suffixIcon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.close),
                  tooltip: 'Cancel voice input',
                  onPressed: _isListening ? _cancelListening : null,
                ),
                IconButton(
                  icon: Icon(micIcon),
                  color: micColor,
                  tooltip: _isListening ? 'Stop listening' : 'Start listening',
                  onPressed: micDisabled ? null : _toggleListening,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: _isListening ? Colors.redAccent : Colors.grey,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _statusText,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
            FilledButton(
              onPressed: canSend ? _submit : null,
              child: _isSubmitting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Send'),
            ),
          ],
        ),
        if (_isListening) ...[
          const SizedBox(height: 6),
          LinearProgressIndicator(value: _soundLevelProgress),
        ],
      ],
    );
  }
}
