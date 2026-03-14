import 'package:fittrack_flutter/services/speech_service.dart';
import 'package:fittrack_flutter/widgets/voice_message_input.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeSpeechService extends SpeechService {
  bool _listening = false;

  @override
  bool get isListening => _listening;

  @override
  Future<bool> initialize({bool force = false}) async {
    return true;
  }

  @override
  Future<void> startListening({String localeId = 'en_CA'}) async {
    _listening = true;
    onSpeechStatus?.call('listening');
    onSpeechResult?.call('hello from voice', false);
  }

  @override
  Future<void> stopListening() async {
    _listening = false;
    onSpeechStatus?.call('notListening');
  }

  @override
  Future<void> cancelListening() async {
    _listening = false;
    onSpeechStatus?.call('notListening');
  }
}

void main() {
  testWidgets('shows mic icon and submits transcribed speech', (tester) async {
    String? submittedText;
    final fakeSpeech = _FakeSpeechService();

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: VoiceMessageInput(
            speechService: fakeSpeech,
            onSubmit: (text) async {
              submittedText = text;
            },
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.mic_none), findsOneWidget);

    await tester.tap(find.byTooltip('Start listening'));
    await tester.pump();
    expect(find.text('hello from voice'), findsOneWidget);

    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    expect(submittedText, 'hello from voice');
  });
}
