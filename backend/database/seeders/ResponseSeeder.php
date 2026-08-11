<?php

namespace Database\Seeders;

use App\Models\Alumni;
use App\Models\Institution;
use App\Models\Question;
use App\Models\Survey;
use App\Models\SurveyAnswer;
use App\Models\SurveyResponse;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

class ResponseSeeder extends Seeder
{
    public function run(): void
    {
        $institution = Institution::where('slug', 'smk-negeri-1-tracer')->first();

        if (! $institution) {
            return;
        }

        $survey = Survey::where('institution_id', $institution->id)
            ->where('title', 'Tracer Study Lulusan 2025')
            ->first();

        if (! $survey) {
            return;
        }

        $this->createAlumniUsers($institution);

        $questions = Question::where('survey_id', $survey->id)->get()->keyBy('label');

        // Working branch (yes).
        $this->seedResponse($institution, $survey, $questions, 'andi.pratama@example.com', [
            'Apakah Anda sudah bekerja?' => 'yes',
            'Nama perusahaan tempat Anda bekerja' => 'PT Teknologi Nusantara',
            'Jabatan / posisi Anda' => 'Software Engineer',
            'Bidang industri perusahaan' => 'teknologi-informasi',
            'Rentang gaji per bulan' => '2',
            'Seberapa puas Anda dengan kualitas pembelajaran di sekolah? (1-5)' => 5,
            'Seberapa relevan kompetensi yang diajarkan dengan pekerjaan Anda? (1-5)' => 4,
            'Saran untuk perbaikan sekolah' => null,
        ], submitted: true);

        // Not-working branch (no).
        $this->seedResponse($institution, $survey, $questions, 'dewi.anggraini@example.com', [
            'Apakah Anda sudah bekerja?' => 'no',
            'Alasan belum bekerja' => 'Melanjutkan kuliah S1 Teknik Informatika',
            'Apakah Anda sedang melanjutkan pendidikan?' => 'yes',
            'Seberapa puas Anda dengan kualitas pembelajaran di sekolah? (1-5)' => 4,
            'Seberapa relevan kompetensi yang diajarkan dengan pekerjaan Anda? (1-5)' => 3,
        ], submitted: true);

        // In-progress draft for completion tracking demo.
        $this->seedResponse($institution, $survey, $questions, 'fitri.handayani@example.com', [
            'Apakah Anda sudah bekerja?' => 'no',
            'Alasan belum bekerja' => 'Sedang mencari pekerjaan pertama',
        ], submitted: false);
    }

    /**
     * Link alumni rows to login accounts with the alumni role.
     */
    private function createAlumniUsers(Institution $institution): void
    {
        foreach (['andi.pratama@example.com', 'dewi.anggraini@example.com', 'fitri.handayani@example.com'] as $email) {
            $alumni = Alumni::where('email', $email)->where('institution_id', $institution->id)->first();

            if (! $alumni) {
                continue;
            }

            $user = User::firstOrCreate(
                ['email' => $alumni->email],
                [
                    'name' => $alumni->name,
                    'password' => 'password',
                    'institution_id' => $institution->id,
                    'is_active' => true,
                ]
            );

            if (! $user->hasRole('alumni')) {
                $user->assignRole('alumni');
            }

            $alumni->update(['user_id' => $user->id]);
        }
    }

    /**
     * @param  Collection<string, Question>  $questions
     * @param  array<string, mixed>  $answers
     */
    private function seedResponse(
        Institution $institution,
        Survey $survey,
        Collection $questions,
        string $email,
        array $answers,
        bool $submitted
    ): void {
        $user = User::where('email', $email)->first();

        if (! $user) {
            return;
        }

        $response = SurveyResponse::firstOrCreate(
            ['survey_id' => $survey->id, 'respondent_id' => $user->id],
            [
                'institution_id' => $institution->id,
                'alumni_id' => Alumni::where('user_id', $user->id)->value('id'),
                'status' => 'in_progress',
                'version' => $survey->version,
                'started_at' => now(),
            ]
        );

        if ($response->status === 'submitted') {
            return;
        }

        foreach ($answers as $label => $value) {
            if ($value === null) {
                continue;
            }

            $question = $questions->get($label);

            if (! $question) {
                continue;
            }

            SurveyAnswer::updateOrCreate(
                ['response_id' => $response->id, 'question_id' => $question->id],
                ['value' => is_array($value) ? json_encode($value, JSON_UNESCAPED_UNICODE) : (string) $value]
            );
        }

        if ($submitted) {
            $response->update(['status' => 'submitted', 'submitted_at' => now()]);
        }
    }
}
