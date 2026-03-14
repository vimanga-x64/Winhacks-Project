import 'package:flutter/material.dart';

import '../widgets/voice_message_input.dart';

/// Example:
/// ChatScreen(
///   onSendMessage: (message) async => existingApi.sendMessage(message),
/// )
class ChatScreen extends StatefulWidget {
  const ChatScreen({
    super.key,
    required this.onSendMessage,
    this.title = 'Chat',
  });

  // Keep backend flow outside the input widget via dependency injection.
  final Future<String> Function(String message) onSendMessage;
  final String title;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final List<_ChatMessage> _messages = <_ChatMessage>[];
  bool _isSending = false;

  Future<void> _submitMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _isSending) return;

    setState(() {
      _messages.add(_ChatMessage(text: trimmed, isUser: true));
      _isSending = true;
    });

    try {
      final response = await widget.onSendMessage(trimmed);
      if (!mounted) return;
      if (response.trim().isNotEmpty) {
        setState(() => _messages.add(_ChatMessage(text: response.trim(), isUser: false)));
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to send message: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? const Center(child: Text('Type or speak a message to begin'))
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      final align = message.isUser ? Alignment.centerRight : Alignment.centerLeft;
                      final bg = message.isUser
                          ? Theme.of(context).colorScheme.primaryContainer
                          : Theme.of(context).colorScheme.surfaceContainerHighest;
                      return Align(
                        alignment: align,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: bg,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(message.text),
                        ),
                      );
                    },
                  ),
          ),
          SafeArea(
            top: false,
            minimum: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: VoiceMessageInput(
              enabled: !_isSending,
              onSubmit: _submitMessage,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatMessage {
  const _ChatMessage({
    required this.text,
    required this.isUser,
  });

  final String text;
  final bool isUser;
}
