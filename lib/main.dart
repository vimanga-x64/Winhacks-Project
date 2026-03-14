import 'dart:convert';
import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  runApp(const FitTrackApp());
}

enum UnitSystem { metric, imperial }

class UserProfile {
  const UserProfile({
    required this.name,
    required this.age,
    required this.sex,
    required this.heightCm,
    required this.heightFt,
    required this.heightIn,
    required this.weight,
    required this.targetWeight,
    required this.activityLevel,
    required this.fitnessGoal,
    required this.workoutFrequency,
    required this.units,
  });

  final String name;
  final String age;
  final String sex;
  final String heightCm;
  final String heightFt;
  final String heightIn;
  final String weight;
  final String targetWeight;
  final String activityLevel;
  final String fitnessGoal;
  final String workoutFrequency;
  final UnitSystem units;

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'age': age,
      'sex': sex,
      'heightCm': heightCm,
      'heightFt': heightFt,
      'heightIn': heightIn,
      'weight': weight,
      'targetweight': targetWeight,
      'activityLevel': activityLevel,
      'fitnessGoal': fitnessGoal,
      'workoutFrequency': workoutFrequency,
      'units': units.name,
    };
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      name: (json['name'] ?? '').toString(),
      age: (json['age'] ?? '').toString(),
      sex: (json['sex'] ?? '').toString(),
      heightCm: (json['heightCm'] ?? '').toString(),
      heightFt: (json['heightFt'] ?? '').toString(),
      heightIn: (json['heightIn'] ?? '').toString(),
      weight: (json['weight'] ?? '').toString(),
      targetWeight: (json['targetweight'] ?? '').toString(),
      activityLevel: (json['activityLevel'] ?? '').toString(),
      fitnessGoal: (json['fitnessGoal'] ?? '').toString(),
      workoutFrequency: (json['workoutFrequency'] ?? '').toString(),
      units: (json['units'] ?? 'metric') == 'imperial'
          ? UnitSystem.imperial
          : UnitSystem.metric,
    );
  }
}

class SleepData {
  const SleepData({
    required this.bedtime,
    required this.wake,
    required this.totalMinutes,
    required this.deepMinutes,
    required this.remMinutes,
    required this.lightMinutes,
    required this.awakeMinutes,
    required this.efficiency,
    required this.sleepDebtMinutes,
    required this.sleepInertiaMinutes,
  });

  final String bedtime;
  final String wake;
  final int totalMinutes;
  final int deepMinutes;
  final int remMinutes;
  final int lightMinutes;
  final int awakeMinutes;
  final double efficiency;
  final int sleepDebtMinutes;
  final int sleepInertiaMinutes;

  factory SleepData.fromJson(Map<String, dynamic> json) {
    return SleepData(
      bedtime: (json['bedtime'] ?? '23:00').toString(),
      wake: (json['wake'] ?? '07:00').toString(),
      totalMinutes: _toInt(json['total_min']),
      deepMinutes: _toInt(json['deep_min']),
      remMinutes: _toInt(json['rem_min']),
      lightMinutes: _toInt(json['light_min']),
      awakeMinutes: _toInt(json['awake_min']),
      efficiency: _toDouble(json['efficiency']),
      sleepDebtMinutes: _toInt(json['sleep_debt_min']),
      sleepInertiaMinutes: _toInt(json['sleep_inertia_min']),
    );
  }
}

class HealthDay {
  const HealthDay({
    required this.date,
    required this.steps,
    required this.hrv,
    required this.restingHr,
    required this.sleep,
  });

  final String date;
  final int steps;
  final int hrv;
  final int restingHr;
  final SleepData sleep;

  factory HealthDay.fromJson(Map<String, dynamic> json) {
    return HealthDay(
      date: (json['date'] ?? '').toString(),
      steps: _toInt(json['steps']),
      hrv: _toInt(json['hrv']),
      restingHr: _toInt(json['resting_hr']),
      sleep: SleepData.fromJson(json['sleep'] as Map<String, dynamic>),
    );
  }
}

class FoodDay {
  const FoodDay({
    required this.date,
    required this.calories,
    required this.target,
    required this.proteinG,
    required this.carbsG,
    required this.fatG,
  });

  final String date;
  final int calories;
  final int target;
  final int proteinG;
  final int carbsG;
  final int fatG;

  factory FoodDay.fromJson(Map<String, dynamic> json) {
    return FoodDay(
      date: (json['date'] ?? '').toString(),
      calories: _toInt(json['calories']),
      target: _toInt(json['target']),
      proteinG: _toInt(json['protein_g']),
      carbsG: _toInt(json['carbs_g']),
      fatG: _toInt(json['fat_g']),
    );
  }
}

class GainEntry {
  GainEntry({
    required this.meal,
    required this.input,
    this.calories,
    this.loading = false,
  });

  String meal;
  String input;
  String? calories;
  bool loading;
}

class LostEntry {
  LostEntry({
    required this.activity,
    required this.duration,
    this.calories,
    this.loading = false,
  });

  String activity;
  String duration;
  String? calories;
  bool loading;
}

class OtherEntry {
  OtherEntry({
    required this.category,
    required this.input,
    this.response,
    this.loading = false,
  });

  String category;
  String input;
  String? response;
  bool loading;
}

class BackendService {
  const BackendService(this.baseUrl);

  final String baseUrl;

  Future<int> estimateCalories({
    required String entryType,
    required String entryText,
    required double? weightKg,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/estimate'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'entry_type': entryType,
        'entry_text': entryText,
        'weight_kg': weightKg,
      }),
    );
    if (res.statusCode >= 400) {
      throw Exception('Estimate failed (${res.statusCode})');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return _toInt(data['estimated_calories']);
  }

  Future<Map<String, String>> recommendation(Map<String, dynamic> payload) async {
    final res = await http.post(
      Uri.parse('$baseUrl/recommendation'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (res.statusCode >= 400) {
      throw Exception('Recommendation failed (${res.statusCode})');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return {
      'recommendation': (data['recommendation'] ?? '').toString(),
      'summary': (data['summary'] ?? '').toString(),
    };
  }

  Future<Map<String, List<String>>> recoveryTips(Map<String, dynamic> payload) async {
    final res = await http.post(
      Uri.parse('$baseUrl/recovery'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (res.statusCode >= 400) {
      throw Exception('Recovery tips failed (${res.statusCode})');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final raw = (data['recovery_tips'] as Map<String, dynamic>? ?? {});
    return raw.map((k, v) => MapEntry(k, (v as List<dynamic>).map((e) => e.toString()).toList()));
  }
}

class FitTrackApp extends StatefulWidget {
  const FitTrackApp({super.key});

  @override
  State<FitTrackApp> createState() => _FitTrackAppState();
}

class _FitTrackAppState extends State<FitTrackApp> {
  static const _prefAuth = 'fittrack_is_auth';
  static const _prefProfile = 'fittrack_profile';
  static const _prefBackend = 'fittrack_backend_url';

  bool _ready = false;
  bool _authenticated = false;
  bool _showRecovery = false;
  UserProfile? _profile;
  String _backendUrl = 'http://10.0.2.2:8000';
  List<HealthDay> _healthDays = const [];
  List<FoodDay> _foodDays = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final healthRaw = await rootBundle.loadString('assets/data/simulated_health.json');
    final foodRaw = await rootBundle.loadString('assets/data/simulated_food.json');
    final healthDays = ((jsonDecode(healthRaw) as Map<String, dynamic>)['days'] as List<dynamic>)
        .map((e) => HealthDay.fromJson(e as Map<String, dynamic>))
        .toList(growable: false);
    final foodDays = ((jsonDecode(foodRaw) as Map<String, dynamic>)['days'] as List<dynamic>)
        .map((e) => FoodDay.fromJson(e as Map<String, dynamic>))
        .toList(growable: false);

    final profileRaw = prefs.getString(_prefProfile);
    UserProfile? profile;
    if (profileRaw != null) {
      profile = UserProfile.fromJson(jsonDecode(profileRaw) as Map<String, dynamic>);
    }

    setState(() {
      _authenticated = prefs.getBool(_prefAuth) ?? false;
      _backendUrl = prefs.getString(_prefBackend) ?? _backendUrl;
      _profile = profile;
      _healthDays = healthDays;
      _foodDays = foodDays;
      _ready = true;
    });
  }

  Future<void> _saveAuth(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefAuth, value);
    setState(() => _authenticated = value);
  }

  Future<void> _saveProfile(UserProfile profile) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefProfile, jsonEncode(profile.toJson()));
    setState(() => _profile = profile);
  }

  Future<void> _saveBackend(String backend) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefBackend, backend);
    setState(() => _backendUrl = backend);
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefAuth, false);
    await prefs.remove(_prefProfile);
    setState(() {
      _authenticated = false;
      _profile = null;
      _showRecovery = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final baseText = GoogleFonts.interTextTheme();
    final theme = ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF0A0A0A),
      useMaterial3: true,
      textTheme: baseText.copyWith(
        headlineLarge: GoogleFonts.bebasNeue(fontSize: 52, color: Colors.white),
        headlineMedium: GoogleFonts.oswald(fontSize: 32, color: Colors.white),
        titleLarge: GoogleFonts.oswald(fontSize: 24, color: Colors.white),
      ),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFFEF4444),
        surface: Color(0xFF0E0E0E),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0x11FFFFFF),
        labelStyle: GoogleFonts.inter(color: Colors.white70),
        hintStyle: GoogleFonts.inter(color: Colors.white54),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0x22FFFFFF)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0x22FFFFFF)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFFEF4444)),
        ),
      ),
    );

    if (!_ready) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: theme,
        home: const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    Widget home;
    if (!_authenticated) {
      home = LoginScreen(onLogin: () => _saveAuth(true));
    } else if (_profile == null) {
      home = LandingOnboardingScreen(onComplete: _saveProfile);
    } else if (_showRecovery) {
      home = RecoveryDashboardScreen(
        profile: _profile!,
        healthDays: _healthDays,
        foodDays: _foodDays,
        backendUrl: _backendUrl,
        onBack: () => setState(() => _showRecovery = false),
      );
    } else {
      home = FitnessDashboardScreen(
        initialProfile: _profile!,
        healthDays: _healthDays,
        foodDays: _foodDays,
        backendUrl: _backendUrl,
        onSaveBackendUrl: _saveBackend,
        onShowRecovery: () => setState(() => _showRecovery = true),
        onProfileUpdated: _saveProfile,
        onLogout: _logout,
      );
    }

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: theme,
      home: home,
    );
  }
}

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key, required this.onLogin});

  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          const _DarkBackground(),
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Container(
                margin: const EdgeInsets.all(24),
                padding: const EdgeInsets.all(26),
                decoration: BoxDecoration(
                  color: const Color(0xFF111111),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0x22FFFFFF)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.local_fire_department, color: Color(0xFFEF4444), size: 42),
                    const SizedBox(height: 10),
                    RichText(
                      text: TextSpan(
                        style: GoogleFonts.bebasNeue(fontSize: 42, letterSpacing: 1.5),
                        children: const [
                          TextSpan(text: 'FIT', style: TextStyle(color: Colors.white)),
                          TextSpan(text: 'TRACK', style: TextStyle(color: Color(0xFFEF4444))),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Welcome Back',
                      style: GoogleFonts.oswald(fontSize: 28, color: Colors.white),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Track your fitness journey with AI-powered insights.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(color: Colors.white70),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFFEF4444),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: onLogin,
                        icon: const Icon(Icons.login),
                        label: const Text('Sign In'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class LandingOnboardingScreen extends StatefulWidget {
  const LandingOnboardingScreen({super.key, required this.onComplete});

  final Future<void> Function(UserProfile profile) onComplete;

  @override
  State<LandingOnboardingScreen> createState() => _LandingOnboardingScreenState();
}

class _LandingOnboardingScreenState extends State<LandingOnboardingScreen> {
  bool _showForm = false;
  int _section = 0;
  UnitSystem _units = UnitSystem.metric;

  final _name = TextEditingController();
  final _age = TextEditingController();
  final _sex = TextEditingController();
  final _heightCm = TextEditingController();
  final _heightFt = TextEditingController();
  final _heightIn = TextEditingController();
  final _weight = TextEditingController();
  final _target = TextEditingController();
  final _activity = TextEditingController();
  final _goal = TextEditingController();
  final _workouts = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _age.dispose();
    _sex.dispose();
    _heightCm.dispose();
    _heightFt.dispose();
    _heightIn.dispose();
    _weight.dispose();
    _target.dispose();
    _activity.dispose();
    _goal.dispose();
    _workouts.dispose();
    super.dispose();
  }

  bool _sectionValid() {
    if (_section == 0) {
      return _name.text.trim().isNotEmpty && _age.text.trim().isNotEmpty && _sex.text.trim().isNotEmpty;
    }
    if (_section == 1) {
      if (_units == UnitSystem.metric) {
        return _heightCm.text.trim().isNotEmpty && _weight.text.trim().isNotEmpty && _target.text.trim().isNotEmpty;
      }
      return _heightFt.text.trim().isNotEmpty &&
          _heightIn.text.trim().isNotEmpty &&
          _weight.text.trim().isNotEmpty &&
          _target.text.trim().isNotEmpty;
    }
    return _activity.text.trim().isNotEmpty && _goal.text.trim().isNotEmpty && _workouts.text.trim().isNotEmpty;
  }

  Future<void> _submit() async {
    final profile = UserProfile(
      name: _name.text.trim(),
      age: _age.text.trim(),
      sex: _sex.text.trim(),
      heightCm: _heightCm.text.trim(),
      heightFt: _heightFt.text.trim(),
      heightIn: _heightIn.text.trim(),
      weight: _weight.text.trim(),
      targetWeight: _target.text.trim(),
      activityLevel: _activity.text.trim(),
      fitnessGoal: _goal.text.trim(),
      workoutFrequency: _workouts.text.trim(),
      units: _units,
    );
    await widget.onComplete(profile);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const _DarkBackground(),
          if (!_showForm) _buildHero(context),
          if (_showForm) _buildForm(context),
        ],
      ),
    );
  }

  Widget _buildHero(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 700;

    return Stack(
      fit: StackFit.expand,
      children: [
        if (isMobile)
          Positioned.fill(
            child: Opacity(
              opacity: 0.72,
              child: Image.asset(
                'assets/images/David_goggins.png',
                fit: BoxFit.cover,
              ),
            ),
          )
        else
          Align(
            alignment: Alignment.centerRight,
            child: Opacity(
              opacity: 0.48,
              child: Image.asset(
                'assets/images/David_goggins.png',
                width: screenWidth * 0.56,
                fit: BoxFit.cover,
              ),
            ),
          ),
        if (isMobile)
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xAA000000), Color(0x66000000), Color(0xCC000000)],
              ),
            ),
          ),
        if (isMobile)
          Container(color: const Color(0x22000000)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  RichText(
                    text: TextSpan(
                      style: GoogleFonts.bebasNeue(fontSize: 34, letterSpacing: 1.0),
                      children: const [
                        TextSpan(text: 'FIT', style: TextStyle(color: Colors.white)),
                        TextSpan(text: 'TRACK', style: TextStyle(color: Color(0xFFEF4444))),
                      ],
                    ),
                  ),
                  const Spacer(),
                  OutlinedButton(
                    onPressed: () => setState(() => _showForm = true),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFEF4444),
                      side: const BorderSide(color: Color(0xFFEF4444)),
                    ),
                    child: const Text('Join Now'),
                  ),
                ],
              ),
              const Spacer(),
              Text(
                'IT\'S NOT FITNESS.',
                style: GoogleFonts.oswald(
                  fontSize: 58,
                  fontWeight: FontWeight.w700,
                  height: 0.95,
                  color: Colors.white,
                ),
              ),
              Text(
                'IT\'S A LIFESTYLE.',
                style: GoogleFonts.oswald(
                  fontSize: 58,
                  fontWeight: FontWeight.w700,
                  height: 0.95,
                  color: const Color(0xFFEF4444),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: 220,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFEF4444),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                  ),
                  onPressed: () => setState(() => _showForm = true),
                  child: const Text('Get Started'),
                ),
              ),
              const SizedBox(height: 35),
              Text(
                '"The body achieves what the mind believes." - Napoleon Hill',
                style: GoogleFonts.inter(color: Colors.white54),
              ),
              const SizedBox(height: 18),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildForm(BuildContext context) {
    final progress = (_section + 1) / 3;
    return Stack(
      fit: StackFit.expand,
      children: [
        Opacity(
          opacity: 0.25,
          child: Image.asset('assets/images/goggins_signinpage.jpg', fit: BoxFit.cover),
        ),
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Container(
              margin: const EdgeInsets.all(18),
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xEE101010),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0x22FFFFFF)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  LinearProgressIndicator(
                    value: progress,
                    minHeight: 4,
                    backgroundColor: Colors.white12,
                    valueColor: const AlwaysStoppedAnimation(Color(0xFFEF4444)),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _stepChip('1 Personal', _section == 0),
                      _stepChip('2 Body', _section == 1),
                      _stepChip('3 Goals', _section == 2),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (_section == 0) ...[
                    _formField(_name, 'Full Name'),
                    _formField(_age, 'Age', keyboardType: TextInputType.number),
                    _dropdownField(
                      label: 'Sex',
                      value: _sex.text.isEmpty ? null : _sex.text,
                      items: const ['male', 'female', 'other', 'prefer-not'],
                      onChanged: (v) => setState(() => _sex.text = v ?? ''),
                    ),
                  ],
                  if (_section == 1) ...[
                    Row(
                      children: [
                        Text('Units', style: GoogleFonts.inter(color: Colors.white70)),
                        const Spacer(),
                        SegmentedButton<UnitSystem>(
                          segments: const [
                            ButtonSegment(value: UnitSystem.metric, label: Text('Metric')),
                            ButtonSegment(value: UnitSystem.imperial, label: Text('Imperial')),
                          ],
                          selected: {_units},
                          onSelectionChanged: (v) => setState(() => _units = v.first),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    if (_units == UnitSystem.metric)
                      _formField(_heightCm, 'Height (cm)', keyboardType: TextInputType.number)
                    else ...[
                      Row(
                        children: [
                          Expanded(child: _formField(_heightFt, 'Height (ft)', keyboardType: TextInputType.number)),
                          const SizedBox(width: 10),
                          Expanded(child: _formField(_heightIn, 'Height (in)', keyboardType: TextInputType.number)),
                        ],
                      ),
                    ],
                    _formField(
                      _weight,
                      _units == UnitSystem.metric ? 'Weight (kg)' : 'Weight (lbs)',
                      keyboardType: TextInputType.number,
                    ),
                    _formField(
                      _target,
                      _units == UnitSystem.metric ? 'Target Weight (kg)' : 'Target Weight (lbs)',
                      keyboardType: TextInputType.number,
                    ),
                  ],
                  if (_section == 2) ...[
                    _dropdownField(
                      label: 'Activity Level',
                      value: _activity.text.isEmpty ? null : _activity.text,
                      items: const ['sedentary', 'light', 'moderate', 'active', 'extreme'],
                      onChanged: (v) => setState(() => _activity.text = v ?? ''),
                    ),
                    _dropdownField(
                      label: 'Fitness Goal',
                      value: _goal.text.isEmpty ? null : _goal.text,
                      items: const [
                        'lose-fat',
                        'lose-fat-gradual',
                        'lose fat moderately',
                        'build-muscle',
                        'maintain',
                        'endurance',
                        'flexibility',
                        'general',
                      ],
                      onChanged: (v) => setState(() => _goal.text = v ?? ''),
                    ),
                    _formField(_workouts, 'Workouts per week', keyboardType: TextInputType.number),
                  ],
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      OutlinedButton(
                        onPressed: () {
                          if (_section == 0) {
                            setState(() => _showForm = false);
                          } else {
                            setState(() => _section -= 1);
                          }
                        },
                        child: const Text('Back'),
                      ),
                      const Spacer(),
                      FilledButton(
                        style: FilledButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
                        onPressed: !_sectionValid()
                            ? null
                            : () {
                                if (_section < 2) {
                                  setState(() => _section += 1);
                                } else {
                                  _submit();
                                }
                              },
                        child: Text(_section < 2 ? 'Continue' : 'Finish'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _stepChip(String label, bool active) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        border: Border.all(color: active ? const Color(0xFFEF4444) : Colors.white24),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        label,
        style: GoogleFonts.inter(
          fontSize: 12,
          color: active ? Colors.white : Colors.white60,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _formField(
    TextEditingController c,
    String label, {
    TextInputType? keyboardType,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: c,
        keyboardType: keyboardType,
        onChanged: (_) => setState(() {}),
        style: const TextStyle(color: Colors.white),
        decoration: InputDecoration(labelText: label),
      ),
    );
  }

  Widget _dropdownField({
    required String label,
    required String? value,
    required List<String> items,
    required void Function(String?) onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: DropdownButtonFormField<String>(
        value: value,
        dropdownColor: const Color(0xFF111111),
        style: GoogleFonts.inter(color: Colors.white),
        iconEnabledColor: Colors.white70,
        decoration: InputDecoration(labelText: label),
        items: items
            .map((e) => DropdownMenuItem<String>(
                  value: e,
                  child: Text(e, style: GoogleFonts.inter(color: Colors.white)),
                ))
            .toList(),
        onChanged: onChanged,
      ),
    );
  }
}

class FitnessDashboardScreen extends StatefulWidget {
  const FitnessDashboardScreen({
    super.key,
    required this.initialProfile,
    required this.healthDays,
    required this.foodDays,
    required this.backendUrl,
    required this.onSaveBackendUrl,
    required this.onShowRecovery,
    required this.onProfileUpdated,
    required this.onLogout,
  });

  final UserProfile initialProfile;
  final List<HealthDay> healthDays;
  final List<FoodDay> foodDays;
  final String backendUrl;
  final Future<void> Function(String) onSaveBackendUrl;
  final VoidCallback onShowRecovery;
  final Future<void> Function(UserProfile) onProfileUpdated;
  final Future<void> Function() onLogout;

  @override
  State<FitnessDashboardScreen> createState() => _FitnessDashboardScreenState();
}

class _FitnessDashboardScreenState extends State<FitnessDashboardScreen> {
  late UserProfile _profile;
  late UnitSystem _units;
  late TextEditingController _backendController;

  bool _editingBio = false;
  bool _showBreakdown = false;
  bool _isSummarized = false;
  bool _recommendationLoading = false;
  String? _recommendation;
  String? _summary;

  final List<GainEntry> _gains = [GainEntry(meal: 'Breakfast', input: '')];
  final List<LostEntry> _lost = [LostEntry(activity: '', duration: '')];
  final List<OtherEntry> _others = [OtherEntry(category: '', input: '')];

  @override
  void initState() {
    super.initState();
    _profile = widget.initialProfile;
    _units = widget.initialProfile.units;
    _backendController = TextEditingController(text: widget.backendUrl);
  }

  @override
  void dispose() {
    _backendController.dispose();
    super.dispose();
  }

  double _toKg(double value) => _units == UnitSystem.metric ? value : value * 0.453592;

  double get _weight => double.tryParse(_profile.weight) ?? 0;
  double get _heightCm {
    if (_units == UnitSystem.metric) {
      return double.tryParse(_profile.heightCm) ?? 0;
    }
    final ft = double.tryParse(_profile.heightFt) ?? 0;
    final inch = double.tryParse(_profile.heightIn) ?? 0;
    return (ft * 30.48) + (inch * 2.54);
  }

  double get _age => double.tryParse(_profile.age) ?? 0;

  double get _bmi {
    final w = _toKg(_weight);
    final h = _heightCm / 100;
    if (w <= 0 || h <= 0) return 0;
    return w / (h * h);
  }

  double get _bmr {
    final w = _toKg(_weight);
    final h = _heightCm;
    final a = _age;
    if (w <= 0 || h <= 0 || a <= 0) return 0;
    if (_profile.sex.toLowerCase() == 'female') {
      return 10 * w + 6.25 * h - 5 * a - 161;
    }
    return 10 * w + 6.25 * h - 5 * a + 5;
  }

  double get _activityMultiplier {
    switch (_profile.activityLevel.toLowerCase()) {
      case 'sedentary':
        return 1.2;
      case 'light':
        return 1.375;
      case 'moderate':
        return 1.55;
      case 'active':
        return 1.725;
      case 'extreme':
        return 1.9;
      default:
        return 1.2;
    }
  }

  double get _tdee => _bmr * _activityMultiplier;

  int get _goalAdjustment {
    switch (_profile.fitnessGoal) {
      case 'lose-fat':
        return -750;
      case 'lose-fat-gradual':
        return -500;
      case 'lose fat moderately':
        return -250;
      case 'build-muscle':
        return 300;
      case 'maintain':
        return 0;
      default:
        return -100;
    }
  }

  int get _dailyTarget => (_tdee + _goalAdjustment).round();

  int get _totalGained => _gains.fold(0, (sum, e) => sum + _toInt(e.calories));
  int get _totalLost => _lost.fold(0, (sum, e) => sum + _toInt(e.calories));

  Future<void> _toggleSummarize() async {
    if (_isSummarized) {
      setState(() {
        _isSummarized = false;
        _recommendation = null;
        _summary = null;
      });
      return;
    }

    setState(() => _recommendationLoading = true);

    try {
      final api = BackendService(_backendController.text.trim());

      for (final gain in _gains) {
        if (gain.input.trim().isEmpty || gain.calories != null) continue;
        gain.loading = true;
        setState(() {});
        final cals = await api.estimateCalories(
          entryType: 'food',
          entryText: gain.input,
          weightKg: null,
        );
        gain.calories = cals.toString();
        gain.loading = false;
      }

      for (final lost in _lost) {
        if (lost.activity.trim().isEmpty || lost.duration.trim().isEmpty || lost.calories != null) continue;
        lost.loading = true;
        setState(() {});
        final cals = await api.estimateCalories(
          entryType: 'activity',
          entryText: '${lost.activity} for ${lost.duration}',
          weightKg: _toKg(_weight),
        );
        lost.calories = cals.toString();
        lost.loading = false;
      }

      for (final other in _others) {
        if (other.category.trim().isNotEmpty && other.input.trim().isNotEmpty) {
          other.response = 'recorded';
        }
      }

      final payload = {
        'measurement_system': _units.name,
        'user_profile': {
          'age': _toDouble(_profile.age),
          'sex': _profile.sex,
          'weight': _toKg(_toDouble(_profile.weight)),
          'height': _heightCm,
          'goal': _profile.fitnessGoal,
          'target_weight': _toDouble(_profile.targetWeight),
          'activity_level': _profile.activityLevel,
          'weekly_workouts': _toDouble(_profile.workoutFrequency),
        },
        'metabolic_data': {
          'bmr_kcal': _bmr,
          'activity_factor': _activityMultiplier,
          'baseline_needs_kcal': _tdee,
          'estimated_daily_needs_kcal': _tdee,
          'target_kcal': _dailyTarget,
        },
        'daily_totals': {
          'total_consumed_kcal': _totalGained,
          'total_burned_kcal': _totalLost,
          'net_kcal': _totalGained - _totalLost,
          'difference_from_target_kcal': (_totalGained - _totalLost) - _dailyTarget,
        },
        'additional_info': {
          'sleep_hours': 8,
          'mood': 'normal',
          'notes': _others
              .where((e) => e.category.trim().isNotEmpty && e.input.trim().isNotEmpty)
              .map((e) => '${e.category}: ${e.input}')
              .join('; '),
        },
        'food_summary': _gains
            .where((e) => e.input.trim().isNotEmpty && e.calories != null)
            .map((e) => '${e.input} (${e.calories} kcal)')
            .toList(),
        'activity_summary': _lost
            .where((e) => e.activity.trim().isNotEmpty && e.calories != null)
            .map((e) => '${e.activity} ${e.duration} (${e.calories} kcal)')
            .toList(),
      };

      final rec = await api.recommendation(payload);

      setState(() {
        _recommendation = rec['recommendation'];
        _summary = rec['summary'];
        _isSummarized = true;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to summarize day: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _recommendationLoading = false);
      }
    }
  }

  void _saveProfile() {
    widget.onProfileUpdated(_profile);
  }

  @override
  Widget build(BuildContext context) {
    final goalLabel = _goalLabel(_profile.fitnessGoal);
    final isCompact = MediaQuery.sizeOf(context).width < 430;
    final goalColor = _goalAdjustment > 0
        ? const Color(0xFF60A5FA)
        : _goalAdjustment < 0
            ? const Color(0xFFFB923C)
            : const Color(0xFF4ADE80);

    return Scaffold(
      body: Stack(
        children: [
          const _DarkBackground(),
          SafeArea(
            child: Column(
              children: [
                _header(isCompact: isCompact),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 24),
                    child: Column(
                      children: [
                        if (_isSummarized || _recommendationLoading) _recommendationCard(),
                        const SizedBox(height: 12),
                        _bioCard(),
                        const SizedBox(height: 12),
                        _strategyCard(goalLabel, goalColor),
                        const SizedBox(height: 12),
                        _threeColumns(isCompact: isCompact),
                        const SizedBox(height: 12),
                        _backendCard(isCompact: isCompact),
                        const SizedBox(height: 12),
                        _actions(isCompact: isCompact),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _header({required bool isCompact}) {
    if (isCompact) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
        child: Column(
          children: [
            Row(
              children: [
                RichText(
                  text: TextSpan(
                    style: GoogleFonts.bebasNeue(fontSize: 30, letterSpacing: 0.7),
                    children: const [
                      TextSpan(text: 'FIT', style: TextStyle(color: Colors.white)),
                      TextSpan(text: 'TRACK', style: TextStyle(color: Color(0xFFEF4444))),
                    ],
                  ),
                ),
                const Spacer(),
                IconButton(
                  onPressed: () async {
                    await widget.onLogout();
                  },
                  icon: const Icon(Icons.logout, size: 20),
                  tooltip: 'Logout',
                ),
              ],
            ),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: widget.onShowRecovery,
                    icon: const Icon(Icons.monitor_heart, size: 16),
                    label: const Text('Recovery'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => setState(() => _editingBio = !_editingBio),
                    icon: Icon(_editingBio ? Icons.check : Icons.edit, size: 16),
                    label: Text(_editingBio ? 'Done Editing' : 'Edit Profile'),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
      child: Row(
        children: [
          RichText(
            text: TextSpan(
              style: GoogleFonts.bebasNeue(fontSize: 32, letterSpacing: 0.8),
              children: const [
                TextSpan(text: 'FIT', style: TextStyle(color: Colors.white)),
                TextSpan(text: 'TRACK', style: TextStyle(color: Color(0xFFEF4444))),
              ],
            ),
          ),
          const Spacer(),
          OutlinedButton(
            onPressed: widget.onShowRecovery,
            child: const Text('Recovery Dashboard'),
          ),
          const SizedBox(width: 8),
          OutlinedButton.icon(
            onPressed: () async {
              await widget.onLogout();
            },
            icon: const Icon(Icons.logout, size: 16),
            label: const Text('Logout'),
          ),
        ],
      ),
    );
  }

  Widget _recommendationCard() {
    return _glassCard(
      padding: const EdgeInsets.all(16),
      borderColor: const Color(0x66EF4444),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  color: Color(0xFFEF4444),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check, color: Colors.white),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Daily Analysis', style: GoogleFonts.oswald(fontSize: 24, color: Colors.white)),
                  Text(
                    'AI-guided summary based on today\'s entries.',
                    style: GoogleFonts.inter(color: Colors.white54),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (_recommendationLoading)
            Text('Analyzing your data with AI...', style: GoogleFonts.inter(color: Colors.white70))
          else ...[
            if ((_summary ?? '').isNotEmpty)
              Text('Summary: $_summary', style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: Colors.white)),
            const SizedBox(height: 8),
            Text(_recommendation ?? '', style: GoogleFonts.inter(height: 1.6, color: Colors.white)),
          ],
        ],
      ),
    );
  }

  Widget _bioCard() {
    return _glassCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        children: [
          Row(
            children: [
              _pillButton(
                _units == UnitSystem.metric ? 'Metric' : 'Imperial',
                onTap: () {
                  setState(() {
                    _units = _units == UnitSystem.metric ? UnitSystem.imperial : UnitSystem.metric;
                    _profile = UserProfile(
                      name: _profile.name,
                      age: _profile.age,
                      sex: _profile.sex,
                      heightCm: _profile.heightCm,
                      heightFt: _profile.heightFt,
                      heightIn: _profile.heightIn,
                      weight: _profile.weight,
                      targetWeight: _profile.targetWeight,
                      activityLevel: _profile.activityLevel,
                      fitnessGoal: _profile.fitnessGoal,
                      workoutFrequency: _profile.workoutFrequency,
                      units: _units,
                    );
                  });
                },
              ),
              const Spacer(),
              IconButton(
                onPressed: () => setState(() => _editingBio = !_editingBio),
                icon: Icon(_editingBio ? Icons.check : Icons.edit),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: const BoxDecoration(
                  color: Color(0xFFEF4444),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.person, color: Colors.white),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _editingBio
                    ? TextFormField(
                        initialValue: _profile.name,
                        onChanged: (v) => _profile = _copyProfile(name: v),
                        decoration: const InputDecoration(labelText: 'Name'),
                      )
                    : Text(_profile.name, style: GoogleFonts.oswald(fontSize: 26, color: Colors.white)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          LayoutBuilder(
            builder: (context, constraints) {
              final metricWidth = constraints.maxWidth < 430
                  ? (constraints.maxWidth - 10) / 2
                  : 150.0;
              return Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  SizedBox(width: metricWidth, child: _metricBox('Age', _profile.age)),
                  SizedBox(
                    width: metricWidth,
                    child: _metricBox(
                      'Weight',
                      _units == UnitSystem.metric
                          ? '${_profile.weight} kg'
                          : '${(_toDouble(_profile.weight) * 2.20462).toStringAsFixed(1)} lbs',
                    ),
                  ),
                  SizedBox(
                    width: metricWidth,
                    child: _metricBox(
                      'Height',
                      _units == UnitSystem.metric
                          ? '${_heightCm.toStringAsFixed(0)} cm'
                          : _toFeetInches(_heightCm),
                    ),
                  ),
                  SizedBox(width: metricWidth, child: _metricBox('BMI', _bmi.toStringAsFixed(1))),
                  SizedBox(width: metricWidth, child: _metricBox('BMR', _bmr.toStringAsFixed(0))),
                  SizedBox(width: metricWidth, child: _metricBox('Activity', _profile.activityLevel)),
                  SizedBox(width: metricWidth, child: _metricBox('Goal', _profile.fitnessGoal)),
                  SizedBox(
                    width: metricWidth,
                    child: _metricBox('Workouts', '${_profile.workoutFrequency}/wk'),
                  ),
                ],
              );
            },
          ),
          if (_editingBio) ...[
            const SizedBox(height: 12),
            _editableProfileGrid(),
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
                onPressed: _saveProfile,
                child: const Text('Save Profile'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _editableProfileGrid() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _editableField('Age', _profile.age, (v) => _profile = _copyProfile(age: v))),
            const SizedBox(width: 10),
            Expanded(child: _editableField('Sex', _profile.sex, (v) => _profile = _copyProfile(sex: v))),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _editableField('Weight', _profile.weight, (v) => _profile = _copyProfile(weight: v)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _editableField('Target', _profile.targetWeight, (v) => _profile = _copyProfile(targetWeight: v)),
            ),
          ],
        ),
      ],
    );
  }

  Widget _editableField(String label, String value, void Function(String) onChanged) {
    return TextFormField(
      initialValue: value,
      onChanged: onChanged,
      decoration: InputDecoration(labelText: label),
    );
  }

  Widget _strategyCard(String goalLabel, Color goalColor) {
    final weeklyChange = (_goalAdjustment * 7) / 3500;
    final isCompact = MediaQuery.sizeOf(context).width < 430;

    return _glassCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isCompact)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Your Calorie Strategy', style: GoogleFonts.oswald(fontSize: 24, color: Colors.white)),
                const SizedBox(height: 8),
                _pillButton(
                  _showBreakdown ? 'Hide Breakdown' : 'Show Breakdown',
                  onTap: () => setState(() => _showBreakdown = !_showBreakdown),
                ),
              ],
            )
          else
            Row(
              children: [
                Text('Your Calorie Strategy', style: GoogleFonts.oswald(fontSize: 24, color: Colors.white)),
                const Spacer(),
                _pillButton(
                  _showBreakdown ? 'Hide Breakdown' : 'Show Breakdown',
                  onTap: () => setState(() => _showBreakdown = !_showBreakdown),
                ),
              ],
            ),
          const SizedBox(height: 8),
          Text(
            'Track your day below and tap Summarize Day for AI feedback.',
            style: GoogleFonts.inter(color: Colors.white60),
          ),
          if (_showBreakdown)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0x10FFFFFF),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0x22FFFFFF)),
              ),
              child: Column(
                children: [
                  _calcRow('Base Metabolic Rate (BMR)', '${_bmr.toStringAsFixed(0)} kcal'),
                  _calcRow('Activity Multiplier', _profile.activityLevel),
                  const Divider(color: Color(0x22FFFFFF)),
                  _calcRow('TDEE (Maintenance)', '${_tdee.toStringAsFixed(0)} kcal'),
                  _calcRow('Goal Adjustment', '${_goalAdjustment > 0 ? '+' : ''}$_goalAdjustment kcal', color: goalColor),
                  const Divider(color: Color(0x22FFFFFF)),
                  _calcRow('Daily Target', '$_dailyTarget kcal', strong: true, color: const Color(0xFFEF4444)),
                ],
              ),
            ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0x15EF4444),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0x66EF4444)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Current Goal', style: GoogleFonts.inter(color: Colors.white54)),
                Text(goalLabel, style: GoogleFonts.oswald(fontSize: 28, color: Colors.white)),
                const SizedBox(height: 4),
                Text(
                  'Daily adjustment ${_goalAdjustment > 0 ? '+' : ''}$_goalAdjustment kcal | Weekly change ${weeklyChange > 0 ? '+' : ''}${weeklyChange.toStringAsFixed(2)} lbs',
                  style: GoogleFonts.inter(color: Colors.white70),
                ),
                const SizedBox(height: 8),
                Text(
                  'Your Daily Target: $_dailyTarget calories per day',
                  style: GoogleFonts.bebasNeue(fontSize: 34, color: const Color(0xFFEF4444), letterSpacing: 0.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _calcRow(String k, String v, {Color? color, bool strong = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(child: Text(k, style: GoogleFonts.inter(color: Colors.white70))),
          Text(
            v,
            style: GoogleFonts.inter(
              color: color ?? Colors.white,
              fontWeight: strong ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _threeColumns({required bool isCompact}) {
    return LayoutBuilder(
      builder: (context, c) {
        final isWide = !isCompact && c.maxWidth > 980;
        if (isWide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _gainColumn(isCompact: false)),
              const SizedBox(width: 10),
              Expanded(child: _lostColumn(isCompact: false)),
              const SizedBox(width: 10),
              Expanded(child: _otherColumn(isCompact: false)),
            ],
          );
        }
        return Column(
          children: [
            _gainColumn(isCompact: isCompact),
            const SizedBox(height: 10),
            _lostColumn(isCompact: isCompact),
            const SizedBox(height: 10),
            _otherColumn(isCompact: isCompact),
          ],
        );
      },
    );
  }

  Widget _gainColumn({required bool isCompact}) {
    return _trackerColumn(
      title: 'Gain Calories',
      icon: Icons.restaurant,
      accent: const Color(0xFF4ADE80),
      child: Column(
        children: [
          ..._gains.asMap().entries.map((entry) {
            final i = entry.key;
            final e = entry.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: isCompact
                  ? Column(
                      children: [
                        DropdownButtonFormField<String>(
                          value: e.meal,
                          dropdownColor: const Color(0xFF111111),
                          style: GoogleFonts.inter(color: Colors.white),
                          decoration: const InputDecoration(isDense: true),
                          items: const ['Breakfast', 'Lunch', 'Dinner', 'Snack']
                              .map((m) => DropdownMenuItem(
                                    value: m,
                                    child: Text(m, style: const TextStyle(fontSize: 12, color: Colors.white)),
                                  ))
                              .toList(),
                          onChanged: _isSummarized
                              ? null
                              : (v) {
                                  setState(() => e.meal = v ?? e.meal);
                                },
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                enabled: !_isSummarized,
                                initialValue: e.input,
                                style: GoogleFonts.inter(color: Colors.white),
                                onChanged: (v) {
                                  e.input = v;
                                  e.calories = null;
                                },
                                onFieldSubmitted: (_) async {
                                  if (e.input.trim().isEmpty || e.calories != null) return;
                                  await _estimateGain(i);
                                },
                                decoration: const InputDecoration(hintText: 'e.g. 2 eggs...'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            SizedBox(
                              width: 66,
                              child: Text(
                                e.loading ? '...' : (e.calories != null ? '+${e.calories}' : ''),
                                textAlign: TextAlign.right,
                                style: GoogleFonts.inter(
                                  color: const Color(0xFF4ADE80),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        SizedBox(
                          width: 110,
                          child: DropdownButtonFormField<String>(
                            value: e.meal,
                            dropdownColor: const Color(0xFF111111),
                            style: GoogleFonts.inter(color: Colors.white),
                            decoration: const InputDecoration(isDense: true),
                            items: const ['Breakfast', 'Lunch', 'Dinner', 'Snack']
                                .map((m) => DropdownMenuItem(
                                      value: m,
                                      child: Text(m, style: const TextStyle(fontSize: 12, color: Colors.white)),
                                    ))
                                .toList(),
                            onChanged: _isSummarized
                                ? null
                                : (v) {
                                    setState(() => e.meal = v ?? e.meal);
                                  },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            enabled: !_isSummarized,
                            initialValue: e.input,
                            style: GoogleFonts.inter(color: Colors.white),
                            onChanged: (v) {
                              e.input = v;
                              e.calories = null;
                            },
                            onFieldSubmitted: (_) async {
                              if (e.input.trim().isEmpty || e.calories != null) return;
                              await _estimateGain(i);
                            },
                            decoration: const InputDecoration(hintText: 'e.g. 2 eggs...'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          width: 62,
                          child: Text(
                            e.loading ? '...' : (e.calories != null ? '+${e.calories}' : ''),
                            textAlign: TextAlign.right,
                            style: GoogleFonts.inter(
                              color: const Color(0xFF4ADE80),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
            );
          }),
          if (!_isSummarized)
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton.icon(
                onPressed: () => setState(() => _gains.add(GainEntry(meal: 'Snack', input: ''))),
                icon: const Icon(Icons.add),
                label: const Text('Add Meal Entry'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _lostColumn({required bool isCompact}) {
    const activities = [
      '',
      'Walking',
      'Running',
      'Jumping Jacks',
      'Cycling',
      'Swimming',
      'Yoga',
      'Weightlifting',
      'HIIT',
      'Dancing',
      'Hiking',
      'Pilates',
      'Rowing',
    ];

    return _trackerColumn(
      title: 'Calories Lost',
      icon: Icons.local_fire_department,
      accent: const Color(0xFFEF4444),
      child: Column(
        children: [
          ..._lost.asMap().entries.map((entry) {
            final i = entry.key;
            final e = entry.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: isCompact
                  ? Column(
                      children: [
                        DropdownButtonFormField<String>(
                          value: e.activity,
                          dropdownColor: const Color(0xFF111111),
                          style: GoogleFonts.inter(color: Colors.white),
                          decoration: const InputDecoration(isDense: true),
                          items: activities
                              .map((a) => DropdownMenuItem(
                                    value: a,
                                    child: Text(
                                      a.isEmpty ? 'Select Activity' : a,
                                      style: const TextStyle(fontSize: 12, color: Colors.white),
                                    ),
                                  ))
                              .toList(),
                          onChanged: _isSummarized
                              ? null
                              : (v) {
                                  setState(() {
                                    e.activity = v ?? '';
                                    e.calories = null;
                                  });
                                },
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            SizedBox(
                              width: 86,
                              child: TextFormField(
                                enabled: !_isSummarized,
                                initialValue: e.duration,
                                style: GoogleFonts.inter(color: Colors.white),
                                onChanged: (v) {
                                  e.duration = v;
                                  e.calories = null;
                                },
                                onFieldSubmitted: (_) async {
                                  if (e.activity.trim().isEmpty || e.duration.trim().isEmpty || e.calories != null) {
                                    return;
                                  }
                                  await _estimateLost(i);
                                },
                                decoration: const InputDecoration(hintText: '30m'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                e.loading ? '...' : (e.calories != null ? '-${e.calories}' : ''),
                                textAlign: TextAlign.right,
                                style: GoogleFonts.inter(
                                  color: const Color(0xFFEF4444),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        SizedBox(
                          width: 138,
                          child: DropdownButtonFormField<String>(
                            value: e.activity,
                            dropdownColor: const Color(0xFF111111),
                            style: GoogleFonts.inter(color: Colors.white),
                            decoration: const InputDecoration(isDense: true),
                            items: activities
                                .map((a) => DropdownMenuItem(
                                      value: a,
                                      child: Text(
                                        a.isEmpty ? 'Select' : a,
                                        style: const TextStyle(fontSize: 12, color: Colors.white),
                                      ),
                                    ))
                                .toList(),
                            onChanged: _isSummarized
                                ? null
                                : (v) {
                                    setState(() {
                                      e.activity = v ?? '';
                                      e.calories = null;
                                    });
                                  },
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          width: 78,
                          child: TextFormField(
                            enabled: !_isSummarized,
                            initialValue: e.duration,
                            style: GoogleFonts.inter(color: Colors.white),
                            onChanged: (v) {
                              e.duration = v;
                              e.calories = null;
                            },
                            onFieldSubmitted: (_) async {
                              if (e.activity.trim().isEmpty || e.duration.trim().isEmpty || e.calories != null) {
                                return;
                              }
                              await _estimateLost(i);
                            },
                            decoration: const InputDecoration(hintText: '30m'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            e.loading ? '...' : (e.calories != null ? '-${e.calories}' : ''),
                            textAlign: TextAlign.right,
                            style: GoogleFonts.inter(
                              color: const Color(0xFFEF4444),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
            );
          }),
          if (!_isSummarized)
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton.icon(
                onPressed: () => setState(() => _lost.add(LostEntry(activity: '', duration: ''))),
                icon: const Icon(Icons.add),
                label: const Text('Add Activity Entry'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _otherColumn({required bool isCompact}) {
    const cats = [
      '',
      'Sleep',
      'Stress',
      'Mood',
      'Hydration',
      'Meditation',
      'Screen Time',
      'Caffeine',
      'Alcohol',
      'Supplements',
      'Weight',
    ];

    return _trackerColumn(
      title: 'Other Metrics',
      icon: Icons.monitor_heart,
      accent: const Color(0xFFA855F7),
      child: Column(
        children: [
          ..._others.asMap().entries.map((entry) {
            final e = entry.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: isCompact
                  ? Column(
                      children: [
                        DropdownButtonFormField<String>(
                          value: e.category,
                          dropdownColor: const Color(0xFF111111),
                          style: GoogleFonts.inter(color: Colors.white),
                          decoration: const InputDecoration(isDense: true),
                          items: cats
                              .map((c) => DropdownMenuItem(
                                    value: c,
                                    child: Text(
                                      c.isEmpty ? 'Category' : c,
                                      style: const TextStyle(fontSize: 12, color: Colors.white),
                                    ),
                                  ))
                              .toList(),
                          onChanged: _isSummarized
                              ? null
                              : (v) {
                                  setState(() {
                                    e.category = v ?? '';
                                    e.response = null;
                                  });
                                },
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                enabled: !_isSummarized,
                                initialValue: e.input,
                                style: GoogleFonts.inter(color: Colors.white),
                                onChanged: (v) {
                                  e.input = v;
                                  e.response = null;
                                },
                                onFieldSubmitted: (_) {
                                  if (e.category.trim().isEmpty || e.input.trim().isEmpty) return;
                                  setState(() => e.response = 'recorded');
                                },
                                decoration: const InputDecoration(hintText: 'Value / Note'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            SizedBox(
                              width: 24,
                              child: e.response != null
                                  ? const Icon(Icons.circle, color: Color(0xFFA855F7), size: 10)
                                  : const SizedBox.shrink(),
                            ),
                          ],
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        SizedBox(
                          width: 122,
                          child: DropdownButtonFormField<String>(
                            value: e.category,
                            dropdownColor: const Color(0xFF111111),
                            style: GoogleFonts.inter(color: Colors.white),
                            decoration: const InputDecoration(isDense: true),
                            items: cats
                                .map((c) => DropdownMenuItem(
                                      value: c,
                                      child: Text(
                                        c.isEmpty ? 'Category' : c,
                                        style: const TextStyle(fontSize: 12, color: Colors.white),
                                      ),
                                    ))
                                .toList(),
                            onChanged: _isSummarized
                                ? null
                                : (v) {
                                    setState(() {
                                      e.category = v ?? '';
                                      e.response = null;
                                    });
                                  },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            enabled: !_isSummarized,
                            initialValue: e.input,
                            style: GoogleFonts.inter(color: Colors.white),
                            onChanged: (v) {
                              e.input = v;
                              e.response = null;
                            },
                            onFieldSubmitted: (_) {
                              if (e.category.trim().isEmpty || e.input.trim().isEmpty) return;
                              setState(() => e.response = 'recorded');
                            },
                            decoration: const InputDecoration(hintText: 'Value / Note'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          width: 24,
                          child: e.response != null
                              ? const Icon(Icons.circle, color: Color(0xFFA855F7), size: 10)
                              : const SizedBox.shrink(),
                        ),
                      ],
                    ),
            );
          }),
          if (!_isSummarized)
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton.icon(
                onPressed: () => setState(() => _others.add(OtherEntry(category: '', input: ''))),
                icon: const Icon(Icons.add),
                label: const Text('Add Other Metric'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _backendCard({required bool isCompact}) {
    return _glassCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Backend Configuration', style: GoogleFonts.oswald(fontSize: 22, color: Colors.white)),
          const SizedBox(height: 8),
          Text(
            'Android emulator should use http://10.0.2.2:8000',
            style: GoogleFonts.inter(color: Colors.white60),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _backendController,
            style: GoogleFonts.inter(color: Colors.white),
            decoration: const InputDecoration(labelText: 'Backend URL'),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: isCompact ? double.infinity : null,
            child: FilledButton(
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
              onPressed: () => widget.onSaveBackendUrl(_backendController.text.trim()),
              child: const Text('Save Backend URL'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _actions({required bool isCompact}) {
    return Column(
      children: [
        if (_isSummarized)
          Wrap(
            spacing: 10,
            runSpacing: 10,
            alignment: WrapAlignment.center,
            children: [
              OutlinedButton.icon(
                onPressed: _toggleSummarize,
                icon: const Icon(Icons.lock_open),
                label: const Text('Unlock Entries'),
              ),
              OutlinedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('PDF export is not yet wired in the mobile clone.')),
                  );
                },
                icon: const Icon(Icons.download),
                label: const Text('Download Report'),
              ),
            ],
          )
        else
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 38, vertical: 14),
            ),
            onPressed: _recommendationLoading ? null : _toggleSummarize,
            child: SizedBox(
              width: isCompact ? double.infinity : null,
              child: const Text(
                'Summarize Day',
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }

  Widget _trackerColumn({
    required String title,
    required IconData icon,
    required Color accent,
    required Widget child,
  }) {
    return _glassCard(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: accent, size: 18),
              const SizedBox(width: 8),
              Text(title, style: GoogleFonts.oswald(fontSize: 20, color: Colors.white)),
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }

  Widget _glassCard({
    required Widget child,
    EdgeInsetsGeometry padding = const EdgeInsets.all(12),
    Color borderColor = const Color(0x22FFFFFF),
  }) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: const Color(0xEE0E0E0E),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: child,
    );
  }

  Widget _metricBox(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
      decoration: BoxDecoration(
        color: const Color(0x11FFFFFF),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0x22FFFFFF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: GoogleFonts.inter(fontSize: 11, color: Colors.white54)),
          const SizedBox(height: 3),
          Text(value, style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: Colors.white)),
        ],
      ),
    );
  }

  Widget _pillButton(String text, {required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(100),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(100),
          border: Border.all(color: const Color(0x33FFFFFF)),
          color: const Color(0x11FFFFFF),
        ),
        child: Text(text, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
      ),
    );
  }

  UserProfile _copyProfile({
    String? name,
    String? age,
    String? sex,
    String? heightCm,
    String? heightFt,
    String? heightIn,
    String? weight,
    String? targetWeight,
    String? activityLevel,
    String? fitnessGoal,
    String? workoutFrequency,
  }) {
    return UserProfile(
      name: name ?? _profile.name,
      age: age ?? _profile.age,
      sex: sex ?? _profile.sex,
      heightCm: heightCm ?? _profile.heightCm,
      heightFt: heightFt ?? _profile.heightFt,
      heightIn: heightIn ?? _profile.heightIn,
      weight: weight ?? _profile.weight,
      targetWeight: targetWeight ?? _profile.targetWeight,
      activityLevel: activityLevel ?? _profile.activityLevel,
      fitnessGoal: fitnessGoal ?? _profile.fitnessGoal,
      workoutFrequency: workoutFrequency ?? _profile.workoutFrequency,
      units: _units,
    );
  }

  String _goalLabel(String key) {
    const map = {
      'lose-fat': 'Lose Fat Aggressively',
      'lose-fat-gradual': 'Lose Fat Moderately',
      'lose fat moderately': 'Lose Fat Gradually',
      'maintain': 'Maintain Weight',
      'build-muscle': 'Build Muscle',
      'endurance': 'Improve Endurance',
      'flexibility': 'Increase Flexibility',
      'general': 'General Fitness',
    };
    return map[key] ?? 'General Fitness';
  }

  String _toFeetInches(double cm) {
    final totalInches = cm / 2.54;
    final ft = totalInches ~/ 12;
    final inch = (totalInches % 12).round();
    return '$ft\'$inch"';
  }

  Future<void> _estimateGain(int index) async {
    final e = _gains[index];
    if (e.input.trim().isEmpty) return;
    try {
      final api = BackendService(_backendController.text.trim());
      setState(() => e.loading = true);
      final result = await api.estimateCalories(entryType: 'food', entryText: e.input, weightKg: null);
      setState(() => e.calories = '$result');
    } catch (_) {
      setState(() => e.calories = '0');
    } finally {
      setState(() => e.loading = false);
    }
  }

  Future<void> _estimateLost(int index) async {
    final e = _lost[index];
    if (e.activity.trim().isEmpty || e.duration.trim().isEmpty) return;
    try {
      final api = BackendService(_backendController.text.trim());
      setState(() => e.loading = true);
      final result = await api.estimateCalories(
        entryType: 'activity',
        entryText: '${e.activity} for ${e.duration}',
        weightKg: _toKg(_weight),
      );
      setState(() => e.calories = '$result');
    } catch (_) {
      setState(() => e.calories = '0');
    } finally {
      setState(() => e.loading = false);
    }
  }
}

class RecoveryDashboardScreen extends StatefulWidget {
  const RecoveryDashboardScreen({
    super.key,
    required this.profile,
    required this.healthDays,
    required this.foodDays,
    required this.backendUrl,
    required this.onBack,
  });

  final UserProfile profile;
  final List<HealthDay> healthDays;
  final List<FoodDay> foodDays;
  final String backendUrl;
  final VoidCallback onBack;

  @override
  State<RecoveryDashboardScreen> createState() => _RecoveryDashboardScreenState();
}

class _RecoveryDashboardScreenState extends State<RecoveryDashboardScreen> {
  bool _loadingTips = false;
  Map<String, List<String>>? _tips;

  List<HealthDay> get _last7Health => widget.healthDays.length <= 7
      ? widget.healthDays
      : widget.healthDays.sublist(widget.healthDays.length - 7);

  List<FoodDay> get _last7Food => widget.foodDays.length <= 7
      ? widget.foodDays
      : widget.foodDays.sublist(widget.foodDays.length - 7);

  HealthDay get _latestHealth => widget.healthDays.last;
  HealthDay get _prevHealth => widget.healthDays.length > 1 ? widget.healthDays[widget.healthDays.length - 2] : widget.healthDays.last;

  double get _avgSleepMin => _last7Health.fold<double>(0, (s, d) => s + d.sleep.totalMinutes) / _last7Health.length;
  int get _avgSteps => (_last7Health.fold<int>(0, (s, d) => s + d.steps) / _last7Health.length).round();
  double get _avgEfficiency => _last7Health.fold<double>(0, (s, d) => s + d.sleep.efficiency) / _last7Health.length;

  List<int> get _stressScores => _last7Health.map((d) {
        final score = (45 + (60 - d.hrv) * 0.8 + (d.restingHr - 55) * 1.2 + d.sleep.sleepDebtMinutes * 0.4).round();
        return score.clamp(0, 100);
      }).toList();

  int get _avgStress => (_stressScores.fold<int>(0, (a, b) => a + b) / _stressScores.length).round();

  int _toMin(String hhmm) {
    final p = hhmm.split(':');
    if (p.length != 2) return 0;
    return _toInt(p[0]) * 60 + _toInt(p[1]);
  }

  String _fmtTime(int min) {
    final total = (min + 1440) % 1440;
    final h24 = total ~/ 60;
    final m = total % 60;
    final p = h24 >= 12 ? 'PM' : 'AM';
    final h12 = h24 % 12 == 0 ? 12 : h24 % 12;
    return '$h12:${m.toString().padLeft(2, '0')} $p';
  }

  String _stressLabel(int v) {
    if (v >= 75) return 'High';
    if (v >= 55) return 'Elevated';
    if (v >= 35) return 'Balanced';
    return 'Low';
  }

  List<FlSpot> _energySpots() {
    final sleep = _prevHealth.sleep;
    final wakeMin = _toMin(sleep.wake);
    final base = (78 - sleep.sleepDebtMinutes * 0.35).clamp(45, 88).toDouble();
    final morningDip = (sleep.sleepInertiaMinutes * 0.7).clamp(10, 28).toDouble();

    final spots = <FlSpot>[];
    var idx = 0.0;
    for (var t = wakeMin - 60; t <= 23 * 60; t += 30) {
      final hour = t / 60.0;
      var energy = base;
      if (t <= wakeMin + 180) {
        final progress = ((t - (wakeMin - 60)) / 240).clamp(0, 1).toDouble();
        energy -= morningDip * (1 - progress);
      }
      if (hour >= 13 && hour <= 15.5) energy -= 8;
      if (hour >= 19) energy -= (hour - 19) * 3.2;
      final wave = math.sin(((t - wakeMin + 60) / (16 * 60)) * math.pi) * 11;
      energy = (energy + wave).clamp(25, 95).toDouble();
      spots.add(FlSpot(idx, energy));
      idx += 1;
    }
    return spots;
  }

  Future<void> _fetchTips() async {
    setState(() => _loadingTips = true);
    try {
      final nutritionSummary = _nutritionSummary();
      final payload = {
        'user_profile': {
          'name': widget.profile.name,
          'goal': widget.profile.fitnessGoal,
          'activityLevel': widget.profile.activityLevel,
          'targetWeight': widget.profile.targetWeight,
        },
        'sleep_summary': {
          'last_night': {
            'bedtime': _prevHealth.sleep.bedtime,
            'wake': _prevHealth.sleep.wake,
            'total_min': _prevHealth.sleep.totalMinutes,
            'deep_min': _prevHealth.sleep.deepMinutes,
            'rem_min': _prevHealth.sleep.remMinutes,
            'light_min': _prevHealth.sleep.lightMinutes,
            'awake_min': _prevHealth.sleep.awakeMinutes,
            'efficiency': _prevHealth.sleep.efficiency,
            'sleep_debt_min': _prevHealth.sleep.sleepDebtMinutes,
            'sleep_inertia_min': _prevHealth.sleep.sleepInertiaMinutes,
          },
          'today': {
            'total_min': _latestHealth.sleep.totalMinutes,
            'efficiency': _latestHealth.sleep.efficiency,
          },
          'bedtime': _prevHealth.sleep.bedtime,
          'wake': _prevHealth.sleep.wake,
          'energy_windows': {
            'morning_peak': _fmtTime(_toMin(_prevHealth.sleep.wake) + 180),
            'afternoon_peak': _fmtTime(_toMin(_prevHealth.sleep.wake) + 420),
            'evening_peak': _fmtTime(_toMin(_prevHealth.sleep.wake) + 660),
            'afternoon_dip': _fmtTime(_toMin(_prevHealth.sleep.wake) + 360),
            'evening_dip': _fmtTime(_toMin(_prevHealth.sleep.wake) + 750),
          },
        },
        'recovery_metrics': {
          'hrv_avg': (_last7Health.fold<int>(0, (s, d) => s + d.hrv) / _last7Health.length).round(),
          'resting_hr_avg': (_last7Health.fold<int>(0, (s, d) => s + d.restingHr) / _last7Health.length).round(),
          'sleep_efficiency_avg': (_avgEfficiency * 100).round(),
          'sleep_debt_avg_min': (_last7Health.fold<int>(0, (s, d) => s + d.sleep.sleepDebtMinutes) / _last7Health.length).round(),
        },
        'nutrition': {
          'last_7_days': _last7Food
              .map((d) => {
                    'date': d.date,
                    'calories': d.calories,
                    'target': d.target,
                    'protein_g': d.proteinG,
                    'carbs_g': d.carbsG,
                    'fat_g': d.fatG,
                  })
              .toList(),
          'summary': nutritionSummary,
          'food_log': const [],
        },
        'stress': {
          'last_7_days_scores': _stressScores,
          'average_score': _avgStress,
          'level': _stressLabel(_avgStress),
        },
        'energy_curve': _energySpots().map((e) => {'x': e.x, 'energy': e.y}).toList(),
      };

      final api = BackendService(widget.backendUrl);
      final tips = await api.recoveryTips(payload);
      setState(() => _tips = tips);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to generate recovery tips: $e')),
      );
    } finally {
      if (mounted) setState(() => _loadingTips = false);
    }
  }

  Map<String, int> _nutritionSummary() {
    var surplus = 0;
    var deficit = 0;
    var target = 0;
    for (final d in _last7Food) {
      final diff = d.calories - d.target;
      if (diff > 150) {
        surplus += 1;
      } else if (diff < -150) {
        deficit += 1;
      } else {
        target += 1;
      }
    }
    return {'surplusDays': surplus, 'deficitDays': deficit, 'targetDays': target};
  }

  @override
  Widget build(BuildContext context) {
    final rings = [
      _RingData(
        name: 'Sleep',
        value: ((_latestHealth.sleep.totalMinutes / 480) * 100).clamp(0, 100).toDouble(),
        color: const Color(0xFF00D4FF),
      ),
      _RingData(
        name: 'Steps',
        value: ((_latestHealth.steps / 10000) * 100).clamp(0, 100).toDouble(),
        color: const Color(0xFF00F5A0),
      ),
      _RingData(
        name: 'Consistency',
        value: ((_nutritionSummary()['targetDays']! / 7) * 100).clamp(0, 100).toDouble(),
        color: const Color(0xFFFFB020),
      ),
    ];

    return Scaffold(
      body: Stack(
        children: [
          const _DarkBackground(),
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
                  child: Row(
                    children: [
                      RichText(
                        text: TextSpan(
                          style: GoogleFonts.bebasNeue(fontSize: 32, letterSpacing: 0.8),
                          children: const [
                            TextSpan(text: 'FIT', style: TextStyle(color: Colors.white)),
                            TextSpan(text: 'TRACK', style: TextStyle(color: Color(0xFFEF4444))),
                          ],
                        ),
                      ),
                      const Spacer(),
                      OutlinedButton.icon(
                        onPressed: widget.onBack,
                        icon: const Icon(Icons.arrow_back, size: 16),
                        label: const Text('Back'),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 24),
                    child: Column(
                      children: [
                        _heroSummary(),
                        const SizedBox(height: 12),
                        LayoutBuilder(
                          builder: (context, c) {
                            final isWide = c.maxWidth > 980;
                            if (isWide) {
                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(child: _ringsCard(rings)),
                                  const SizedBox(width: 10),
                                  Expanded(child: _sleepCard()),
                                ],
                              );
                            }
                            return Column(
                              children: [
                                _ringsCard(rings),
                                const SizedBox(height: 10),
                                _sleepCard(),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 10),
                        LayoutBuilder(
                          builder: (context, c) {
                            final isWide = c.maxWidth > 980;
                            if (isWide) {
                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(child: _energyCard()),
                                  const SizedBox(width: 10),
                                  Expanded(child: _nutritionCard()),
                                ],
                              );
                            }
                            return Column(
                              children: [
                                _energyCard(),
                                const SizedBox(height: 10),
                                _nutritionCard(),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 10),
                        _stressCard(),
                        const SizedBox(height: 10),
                        _tipsCard(),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _heroSummary() {
    return _glassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Recovery Dashboard', style: GoogleFonts.inter(color: Colors.white60, letterSpacing: 1.4, fontSize: 12)),
          const SizedBox(height: 4),
          Text('Sleep, Energy, and Recovery Signals', style: GoogleFonts.bebasNeue(fontSize: 42)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _miniCard('7-Day Sleep Avg', '${(_avgSleepMin / 60).toStringAsFixed(1)}h', 'Efficiency ${(100 * _avgEfficiency).round()}%'),
              _miniCard('7-Day Steps Avg', _avgSteps.toString(), 'Daily goal 10k'),
              _miniCard('7-Day Stress Avg', _stressLabel(_avgStress), 'Score $_avgStress/100'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _ringsCard(List<_RingData> rings) {
    final avg = rings.fold<double>(0, (s, r) => s + r.value) / rings.length;

    return _glassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Activity Rings', style: GoogleFonts.oswald(fontSize: 24)),
          Text('At-a-glance goals', style: GoogleFonts.inter(color: Colors.white54)),
          const SizedBox(height: 8),
          SizedBox(
            height: 260,
            child: Stack(
              alignment: Alignment.center,
              children: [
                PieChart(
                  PieChartData(
                    centerSpaceRadius: 62,
                    sectionsSpace: 7,
                    startDegreeOffset: -90,
                    sections: rings
                        .map(
                          (r) => PieChartSectionData(
                            value: r.value,
                            color: r.color,
                            radius: 38,
                            title: '',
                          ),
                        )
                        .toList(),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('${avg.round()}%', style: GoogleFonts.oswald(fontSize: 34)),
                    Text('Overall', style: GoogleFonts.inter(color: Colors.white60)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: rings.map((r) {
              String note = '${r.value.round()}% complete';
              if (r.name == 'Steps') note = '${_latestHealth.steps} / 10k';
              if (r.name == 'Sleep') note = '${(_latestHealth.sleep.totalMinutes / 60).toStringAsFixed(1)}h / 8h';
              return Container(
                width: 180,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0x11FFFFFF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0x22FFFFFF)),
                ),
                child: Row(
                  children: [
                    Container(width: 12, height: 12, decoration: BoxDecoration(color: r.color, shape: BoxShape.circle)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(r.name, style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                          Text(note, style: GoogleFonts.inter(fontSize: 12, color: Colors.white60)),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _sleepCard() {
    final s = _prevHealth.sleep;
    final total = s.totalMinutes == 0 ? 1 : s.totalMinutes;

    return _glassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Sleep Architecture', style: GoogleFonts.oswald(fontSize: 24)),
          Text('Last night', style: GoogleFonts.inter(color: Colors.white54)),
          const SizedBox(height: 8),
          Row(
            children: [
              _smallInfo('Bedtime', _fmtTime(_toMin(s.bedtime))),
              const SizedBox(width: 8),
              _smallInfo('Wake', _fmtTime(_toMin(s.wake))),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: SizedBox(
              height: 14,
              child: Row(
                children: [
                  Expanded(flex: math.max(s.deepMinutes, 1), child: Container(color: const Color(0xFF2563EB))),
                  Expanded(flex: math.max(s.remMinutes, 1), child: Container(color: const Color(0xFFEC4899))),
                  Expanded(flex: math.max(s.lightMinutes, 1), child: Container(color: const Color(0xFF22C55E))),
                  Expanded(flex: math.max(s.awakeMinutes, 1), child: Container(color: const Color(0xFFF59E0B))),
                ],
              ),
            ),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 10,
            runSpacing: 6,
            children: [
              Text('Deep ${s.deepMinutes}m', style: GoogleFonts.inter(fontSize: 12, color: Colors.white70)),
              Text('REM ${s.remMinutes}m', style: GoogleFonts.inter(fontSize: 12, color: Colors.white70)),
              Text('Light ${s.lightMinutes}m', style: GoogleFonts.inter(fontSize: 12, color: Colors.white70)),
              Text('Awake ${s.awakeMinutes}m', style: GoogleFonts.inter(fontSize: 12, color: Colors.white70)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _smallInfo('Sleep debt', '${s.sleepDebtMinutes} min'),
              const SizedBox(width: 8),
              _smallInfo('Sleep inertia', '${s.sleepInertiaMinutes} min'),
              const SizedBox(width: 8),
              _smallInfo('7-day efficiency', '${(_avgEfficiency * 100).round()}%'),
            ],
          ),
          const SizedBox(height: 8),
          Text('Total sleep: ${(total / 60).toStringAsFixed(1)}h', style: GoogleFonts.inter(color: Colors.white60)),
        ],
      ),
    );
  }

  Widget _energyCard() {
    final spots = _energySpots();

    return _glassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Energy Curve', style: GoogleFonts.oswald(fontSize: 24)),
          Text('Based on yesterday\'s sleep', style: GoogleFonts.inter(color: Colors.white54)),
          const SizedBox(height: 8),
          SizedBox(
            height: 220,
            child: LineChart(
              LineChartData(
                minY: 0,
                maxY: 100,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (_) => const FlLine(color: Color(0x22FFFFFF), strokeWidth: 1),
                ),
                borderData: FlBorderData(show: false),
                titlesData: const FlTitlesData(show: false),
                lineTouchData: LineTouchData(
                  touchTooltipData: LineTouchTooltipData(
                    getTooltipColor: (_) => const Color(0xDD111111),
                    tooltipRoundedRadius: 8,
                    getTooltipItems: (spots) => spots
                        .map((s) => LineTooltipItem('${s.y.toStringAsFixed(0)}% energy', const TextStyle(color: Colors.white)))
                        .toList(),
                  ),
                ),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    color: const Color(0xFFFF4FD8),
                    barWidth: 2.5,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: const LinearGradient(
                        colors: [Color(0x66FF4FD8), Color(0x11FFB020)],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _smallInfo('Morning peak', _fmtTime(_toMin(_prevHealth.sleep.wake) + 180)),
              _smallInfo('Afternoon peak', _fmtTime(_toMin(_prevHealth.sleep.wake) + 420)),
              _smallInfo('Evening peak', _fmtTime(_toMin(_prevHealth.sleep.wake) + 660)),
              _smallInfo('Afternoon dip', _fmtTime(_toMin(_prevHealth.sleep.wake) + 360)),
              _smallInfo('Evening dip', _fmtTime(_toMin(_prevHealth.sleep.wake) + 750)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _nutritionCard() {
    final list = _last7Food;

    return _glassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('7-Day Nutrition Trend', style: GoogleFonts.oswald(fontSize: 24)),
          Text('Caloric intake', style: GoogleFonts.inter(color: Colors.white54)),
          const SizedBox(height: 8),
          SizedBox(
            height: 220,
            child: BarChart(
              BarChartData(
                maxY: (list.map((e) => e.calories).reduce(math.max) + 300).toDouble(),
                minY: 0,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (_) => const FlLine(color: Color(0x22FFFFFF), strokeWidth: 1),
                ),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, _) {
                        final i = value.toInt();
                        if (i < 0 || i >= list.length) return const SizedBox.shrink();
                        return Text(
                          _weekdayShort(list[i].date),
                          style: GoogleFonts.inter(fontSize: 10, color: Colors.white60),
                        );
                      },
                    ),
                  ),
                ),
                barGroups: list.asMap().entries.map((entry) {
                  final i = entry.key;
                  final d = entry.value;
                  final delta = d.calories - d.target;
                  final color = delta > 150
                      ? const Color(0xFFFF8C42)
                      : delta < -150
                          ? const Color(0xFF00F5A0)
                          : const Color(0xFF8F9FB5);

                  return BarChartGroupData(
                    x: i,
                    barRods: [
                      BarChartRodData(
                        toY: d.calories.toDouble(),
                        color: color,
                        width: 18,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ],
                  );
                }).toList(),
                extraLinesData: ExtraLinesData(
                  horizontalLines: [
                    HorizontalLine(
                      y: list.last.target.toDouble(),
                      strokeWidth: 1.4,
                      color: const Color(0x88FFB020),
                      dashArray: [6, 6],
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Surplus days: ${_nutritionSummary()['surplusDays']} | Deficit days: ${_nutritionSummary()['deficitDays']} | On-target days: ${_nutritionSummary()['targetDays']}',
            style: GoogleFonts.inter(color: Colors.white70),
          ),
        ],
      ),
    );
  }

  Widget _stressCard() {
    return _glassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Stress Load', style: GoogleFonts.oswald(fontSize: 24)),
          Text('Based on HRV, RHR, and sleep debt', style: GoogleFonts.inter(color: Colors.white54)),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              minHeight: 10,
              value: _avgStress / 100,
              backgroundColor: Colors.white12,
              valueColor: const AlwaysStoppedAnimation(Color(0xFFFFB020)),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                minY: 0,
                maxY: 100,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (_) => const FlLine(color: Color(0x22FFFFFF), strokeWidth: 1),
                ),
                borderData: FlBorderData(show: false),
                titlesData: const FlTitlesData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: _stressScores.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value.toDouble())).toList(),
                    isCurved: true,
                    color: const Color(0xFFFFB020),
                    barWidth: 2,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: const LinearGradient(
                        colors: [Color(0x66FFB020), Color(0x11FF4D6D)],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text('7-day average: $_avgStress / 100 (${_stressLabel(_avgStress)})', style: GoogleFonts.inter(color: Colors.white70)),
          Text(
            'Recent trend: ${_stressScores.last > _avgStress ? 'Rising' : 'Stable'}',
            style: GoogleFonts.inter(color: Colors.white70),
          ),
        ],
      ),
    );
  }

  Widget _tipsCard() {
    return _glassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Recovery Insights', style: GoogleFonts.oswald(fontSize: 24)),
                    Text('AI guided plan', style: GoogleFonts.inter(color: Colors.white54)),
                  ],
                ),
              ),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
                onPressed: _loadingTips ? null : _fetchTips,
                child: Text(_loadingTips ? 'Analyzing...' : 'Generate Tips'),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (_tips == null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0x11FFFFFF),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0x22FFFFFF)),
              ),
              child: Text(
                'Generate personalized recovery recommendations based on your sleep, stress, and nutrition patterns.',
                style: GoogleFonts.inter(color: Colors.white70),
              ),
            )
          else
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: _tips!.entries.map((entry) {
                return Container(
                  width: 360,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0x11FFFFFF),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0x22FFFFFF)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(entry.key, style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: const Color(0xFFEF4444))),
                      const SizedBox(height: 6),
                      ...entry.value.map((tip) => Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Text('• $tip', style: GoogleFonts.inter(color: Colors.white70, height: 1.45)),
                          )),
                    ],
                  ),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }

  Widget _glassCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xEE0F0F0F),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x22FFFFFF)),
      ),
      child: child,
    );
  }

  Widget _miniCard(String title, String value, String subtitle) {
    return Container(
      width: 210,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0x11FFFFFF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x22FFFFFF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.inter(fontSize: 11, color: Colors.white60)),
          const SizedBox(height: 4),
          Text(value, style: GoogleFonts.oswald(fontSize: 30)),
          Text(subtitle, style: GoogleFonts.inter(fontSize: 12, color: Colors.white70)),
        ],
      ),
    );
  }

  Widget _smallInfo(String k, String v) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0x11FFFFFF),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0x22FFFFFF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(k, style: GoogleFonts.inter(fontSize: 11, color: Colors.white54)),
          Text(v, style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  String _weekdayShort(String isoDate) {
    try {
      final dt = DateTime.parse(isoDate);
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days[(dt.weekday - 1).clamp(0, 6)];
    } catch (_) {
      return 'Day';
    }
  }
}

class _RingData {
  const _RingData({required this.name, required this.value, required this.color});
  final String name;
  final double value;
  final Color color;
}

class _DarkBackground extends StatelessWidget {
  const _DarkBackground();

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const DecoratedBox(decoration: BoxDecoration(color: Color(0xFF0A0A0A))),
        Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(-0.7, 0.7),
              radius: 0.9,
              colors: [Color(0x22DC2626), Colors.transparent],
            ),
          ),
        ),
        Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(0.8, -0.7),
              radius: 0.8,
              colors: [Color(0x11F97316), Colors.transparent],
            ),
          ),
        ),
        Positioned.fill(
          child: IgnorePointer(
            child: CustomPaint(
              painter: _LinePainter(),
            ),
          ),
        ),
      ],
    );
  }
}

class _LinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = const Color(0x11FFFFFF)
      ..strokeWidth = 1;

    final x1 = size.width * 0.2;
    final x2 = size.width * 0.5;
    final x3 = size.width * 0.8;

    canvas.drawLine(Offset(x1, 0), Offset(x1, size.height), p);
    canvas.drawLine(Offset(x2, 0), Offset(x2, size.height), p);
    canvas.drawLine(Offset(x3, 0), Offset(x3, size.height), p);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

int _toInt(dynamic v) {
  if (v == null) return 0;
  if (v is int) return v;
  if (v is double) return v.round();
  return int.tryParse(v.toString()) ?? 0;
}

double _toDouble(dynamic v) {
  if (v == null) return 0;
  if (v is double) return v;
  if (v is int) return v.toDouble();
  return double.tryParse(v.toString()) ?? 0;
}
