/// Admin survey item from `/surveys` (paginated, with status).
class AdminSurveyItem {
  final String id;
  final String title;
  final String? description;
  final String status; // draft | published
  final int version;
  final String? startsAt;
  final String? expiresAt;
  final String? publishedAt;
  final int sectionsCount;
  final int questionsCount;
  final String? createdAt;
  final String? updatedAt;

  const AdminSurveyItem({
    required this.id,
    required this.title,
    this.description,
    required this.status,
    required this.version,
    this.startsAt,
    this.expiresAt,
    this.publishedAt,
    this.sectionsCount = 0,
    this.questionsCount = 0,
    this.createdAt,
    this.updatedAt,
  });

  bool get isPublished => status == 'published';
  bool get isDraft => status == 'draft';

  factory AdminSurveyItem.fromJson(Map<String, dynamic> json) {
    return AdminSurveyItem(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      status: json['status'] as String? ?? 'draft',
      version: json['version'] as int? ?? 1,
      startsAt: json['starts_at'] as String?,
      expiresAt: json['expires_at'] as String?,
      publishedAt: json['published_at'] as String?,
      sectionsCount: json['sections_count'] as int? ?? 0,
      questionsCount: json['questions_count'] as int? ?? 0,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }
}

/// Survey yang tersedia untuk alumni (`/alumni/surveys`).
class SurveyItem {
  final String id;
  final String title;
  final String? description;
  final int version;
  final String? expiresAt;
  final int questionsCount;

  /// Ringkasan respons responden: status & persentase kelengkapan.
  final String? responseId;
  final String? responseStatus;
  final int? completion;

  const SurveyItem({
    required this.id,
    required this.title,
    this.description,
    required this.version,
    this.expiresAt,
    required this.questionsCount,
    this.responseId,
    this.responseStatus,
    this.completion,
  });

  factory SurveyItem.fromJson(Map<String, dynamic> json) {
    final response = json['response'] is Map<String, dynamic>
        ? json['response'] as Map<String, dynamic>
        : null;
    return SurveyItem(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Kuisioner',
      description: json['description'] as String?,
      version: json['version'] as int? ?? 1,
      expiresAt: json['expires_at'] as String?,
      questionsCount: json['questions_count'] as int? ?? 0,
      responseId: response?['id'] as String?,
      responseStatus: response?['status'] as String?,
      completion: (response?['completion'] as num?)?.toInt(),
    );
  }
}

class QuestionOption {
  final String? id;
  final String label;
  final String? value;
  final int? order;

  const QuestionOption({this.id, required this.label, this.value, this.order});

  /// Nilai yang dikirim ke backend; backend default ke label bila kosong.
  String get effectiveValue => value ?? label;

  factory QuestionOption.fromJson(Map<String, dynamic> json) {
    return QuestionOption(
      id: json['id'] as String?,
      label: json['label'] as String? ?? '',
      value: json['value'] as String?,
      order: (json['order'] as num?)?.toInt(),
    );
  }
}

class QuestionCondition {
  final String conditionQuestionId;
  final String operator;
  final String? value;

  const QuestionCondition({
    required this.conditionQuestionId,
    required this.operator,
    this.value,
  });

  factory QuestionCondition.fromJson(Map<String, dynamic> json) {
    return QuestionCondition(
      conditionQuestionId: json['condition_question_id'] as String? ?? '',
      operator: json['operator'] as String? ?? 'equals',
      value: json['value'] as String?,
    );
  }
}

class Question {
  final String id;
  final String surveyId;
  final String? sectionId;
  final String type;
  final String label;
  final String? helpText;
  final bool isRequired;
  final int order;
  final Map<String, dynamic>? settings;
  final List<QuestionOption> options;
  final List<QuestionCondition> conditions;

  const Question({
    required this.id,
    required this.surveyId,
    this.sectionId,
    required this.type,
    required this.label,
    this.helpText,
    this.isRequired = false,
    this.order = 0,
    this.settings,
    this.options = const [],
    this.conditions = const [],
  });

  int get ratingMax {
    final max = settings?['max'];
    if (max is num && max > 0) return max.toInt();
    return 5;
  }

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['id'] as String? ?? '',
      surveyId: json['survey_id'] as String? ?? '',
      sectionId: json['section_id'] as String?,
      type: json['type'] as String? ?? 'short_text',
      label: json['label'] as String? ?? '',
      helpText: json['help_text'] as String?,
      isRequired: json['is_required'] as bool? ?? false,
      order: json['order'] as int? ?? 0,
      settings: json['settings'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['settings'] as Map)
          : null,
      options: (json['options'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(QuestionOption.fromJson)
              .toList() ??
          const [],
      conditions: (json['conditions'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(QuestionCondition.fromJson)
              .toList() ??
          const [],
    );
  }
}

class SurveySection {
  final String id;
  final String surveyId;
  final String? title;
  final String? description;
  final int order;
  final List<Question> questions;

  const SurveySection({
    required this.id,
    required this.surveyId,
    this.title,
    this.description,
    this.order = 0,
    this.questions = const [],
  });

  factory SurveySection.fromJson(Map<String, dynamic> json) {
    return SurveySection(
      id: json['id'] as String? ?? '',
      surveyId: json['survey_id'] as String? ?? '',
      title: json['title'] as String?,
      description: json['description'] as String?,
      order: json['order'] as int? ?? 0,
      questions: (json['questions'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(Question.fromJson)
              .toList() ??
          const [],
    );
  }
}

class SurveyDetail {
  final String id;
  final String title;
  final String? description;
  final int version;
  final String? startsAt;
  final String? expiresAt;
  final List<SurveySection> sections;

  /// Pertanyaan tanpa section (tidak berkelompok).
  final List<Question> questions;

  const SurveyDetail({
    required this.id,
    required this.title,
    this.description,
    this.version = 1,
    this.startsAt,
    this.expiresAt,
    this.sections = const [],
    this.questions = const [],
  });

  /// Semua pertanyaan: ber-section dulu, lalu yang tanpa section.
  List<Question> get allQuestions => [
        ...sections.expand((s) => s.questions),
        ...questions,
      ];

  factory SurveyDetail.fromJson(Map<String, dynamic> json) {
    return SurveyDetail(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Kuisioner',
      description: json['description'] as String?,
      version: json['version'] as int? ?? 1,
      startsAt: json['starts_at'] as String?,
      expiresAt: json['expires_at'] as String?,
      sections: (json['sections'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(SurveySection.fromJson)
              .toList() ??
          const [],
      questions: (json['questions'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(Question.fromJson)
              .toList() ??
          const [],
    );
  }
}

/// Payload pengisian survey (`SurveyFillResource`): struktur survey + jawaban.
class SurveyFill {
  final String id;
  final String surveyId;
  final String status;
  final int version;
  final String? startedAt;
  final String? submittedAt;
  final SurveyDetail survey;
  final Map<String, dynamic> answers;

  const SurveyFill({
    required this.id,
    required this.surveyId,
    required this.status,
    required this.version,
    this.startedAt,
    this.submittedAt,
    required this.survey,
    this.answers = const {},
  });

  bool get isSubmitted => status == 'submitted';

  factory SurveyFill.fromJson(Map<String, dynamic> json) {
    final answersJson = json['answers'] is Map<String, dynamic>
        ? json['answers'] as Map<String, dynamic>
        : const <String, dynamic>{};
    return SurveyFill(
      id: json['id'] as String? ?? '',
      surveyId: json['survey_id'] as String? ?? '',
      status: json['status'] as String? ?? 'in_progress',
      version: json['version'] as int? ?? 1,
      startedAt: json['started_at'] as String?,
      submittedAt: json['submitted_at'] as String?,
      survey: json['survey'] is Map<String, dynamic>
          ? SurveyDetail.fromJson(json['survey'] as Map<String, dynamic>)
          : const SurveyDetail(id: '', title: 'Kuisioner'),
      answers: Map<String, dynamic>.from(answersJson),
    );
  }
}
