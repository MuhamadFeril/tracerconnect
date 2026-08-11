<?php

namespace Database\Seeders;

use App\Models\Institution;
use App\Models\Question;
use App\Models\QuestionCondition;
use App\Models\QuestionOption;
use App\Models\Survey;
use App\Models\SurveySection;
use App\Models\User;
use Illuminate\Database\Seeder;

class SurveySeeder extends Seeder
{
    public function run(): void
    {
        $institution = Institution::where('slug', 'smk-negeri-1-tracer')->first();

        if (! $institution) {
            return;
        }

        $admin = User::where('email', 'admin@smkn1tracer.sch.id')->first();

        $survey = Survey::firstOrCreate(
            ['institution_id' => $institution->id, 'title' => 'Tracer Study Lulusan 2025'],
            [
                'description' => 'Kuesioner penelusuran lulusan untuk mengetahui status kerja dan kepuasan alumni.',
                'status' => 'draft',
                'version' => 1,
                'created_by' => $admin?->id,
            ]
        );

        if ($survey->questions()->exists()) {
            return; // already seeded
        }

        $employmentSection = SurveySection::create([
            'survey_id' => $survey->id,
            'title' => 'Informasi Pekerjaan',
            'description' => 'Bagian ini menanyakan kondisi pekerjaan Anda saat ini.',
            'order' => 1,
        ]);

        $qWorking = Question::create([
            'survey_id' => $survey->id,
            'section_id' => $employmentSection->id,
            'type' => 'single_choice',
            'label' => 'Apakah Anda sudah bekerja?',
            'is_required' => true,
            'order' => 1,
        ]);

        QuestionOption::create(['question_id' => $qWorking->id, 'label' => 'Ya', 'value' => 'yes', 'order' => 1]);
        QuestionOption::create(['question_id' => $qWorking->id, 'label' => 'Tidak', 'value' => 'no', 'order' => 2]);

        // Conditional block: shown only when the answer to qWorking is "yes".
        $qCompany = $this->question($survey, $employmentSection->id, 'text', 'Nama perusahaan tempat Anda bekerja', true, 2);
        $this->condition($qCompany, $qWorking, 'equals', 'yes');

        $qPosition = $this->question($survey, $employmentSection->id, 'text', 'Jabatan / posisi Anda', false, 3);
        $this->condition($qPosition, $qWorking, 'equals', 'yes');

        $qIndustry = $this->question($survey, $employmentSection->id, 'dropdown', 'Bidang industri perusahaan', false, 4);
        $this->condition($qIndustry, $qWorking, 'equals', 'yes');

        foreach (['Teknologi Informasi', 'Pendidikan', 'Manufaktur', 'Perdagangan', 'Kesehatan', 'Lainnya'] as $index => $industry) {
            QuestionOption::create(['question_id' => $qIndustry->id, 'label' => $industry, 'value' => strtolower(str_replace(' ', '-', $industry)), 'order' => $index + 1]);
        }

        $qSalary = $this->question($survey, $employmentSection->id, 'dropdown', 'Rentang gaji per bulan', false, 5);
        $this->condition($qSalary, $qWorking, 'equals', 'yes');

        foreach (['< 1 juta', '1 - 3 juta', '3 - 5 juta', '5 - 10 juta', '> 10 juta'] as $index => $salary) {
            QuestionOption::create(['question_id' => $qSalary->id, 'label' => $salary, 'value' => (string) ($index + 1), 'order' => $index + 1]);
        }

        // Conditional block: shown only when the answer to qWorking is "no".
        $qReason = $this->question($survey, $employmentSection->id, 'textarea', 'Alasan belum bekerja', true, 6);
        $this->condition($qReason, $qWorking, 'equals', 'no');

        $qContinuingStudy = $this->question($survey, $employmentSection->id, 'single_choice', 'Apakah Anda sedang melanjutkan pendidikan?', false, 7);
        $this->condition($qContinuingStudy, $qWorking, 'equals', 'no');

        QuestionOption::create(['question_id' => $qContinuingStudy->id, 'label' => 'Ya', 'value' => 'yes', 'order' => 1]);
        QuestionOption::create(['question_id' => $qContinuingStudy->id, 'label' => 'Tidak', 'value' => 'no', 'order' => 2]);

        $satisfactionSection = SurveySection::create([
            'survey_id' => $survey->id,
            'title' => 'Kepuasan Alumni',
            'description' => 'Penilaian Anda terhadap kualitas pembelajaran di sekolah.',
            'order' => 2,
        ]);

        $this->question($survey, $satisfactionSection->id, 'rating', 'Seberapa puas Anda dengan kualitas pembelajaran di sekolah? (1-5)', true, 1, ['max' => 5]);
        $this->question($survey, $satisfactionSection->id, 'rating', 'Seberapa relevan kompetensi yang diajarkan dengan pekerjaan Anda? (1-5)', true, 2, ['max' => 5]);
        $this->question($survey, $satisfactionSection->id, 'textarea', 'Saran untuk perbaikan sekolah', false, 3);

        // Publish the demo survey.
        $survey->update(['status' => 'published', 'published_at' => now()]);
    }

    private function question(Survey $survey, ?string $sectionId, string $type, string $label, bool $required, int $order, ?array $settings = null): Question
    {
        return Question::create([
            'survey_id' => $survey->id,
            'section_id' => $sectionId,
            'type' => $type,
            'label' => $label,
            'is_required' => $required,
            'order' => $order,
            'settings' => $settings,
        ]);
    }

    private function condition(Question $question, Question $trigger, string $operator, string $value): void
    {
        QuestionCondition::create([
            'question_id' => $question->id,
            'condition_question_id' => $trigger->id,
            'operator' => $operator,
            'value' => $value,
        ]);
    }
}
