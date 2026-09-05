<?php
// Hapus menyeluruh SMK Negeri 1 Tracer + seluruh data terkait (dev cleanup).
$pdo = new PDO('mysql:host=127.0.0.1;dbname=tracerconnect;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$inst = '01a04d83-3451-73b7-ab49-7f47534bacfb';

function ids(PDO $pdo, string $sql, string $param): array
{
    $st = $pdo->prepare($sql);
    $st->execute([$param]);
    return $st->fetchAll(PDO::FETCH_COLUMN);
}

function del(PDO $pdo, string $table, string $col, array $vals): int
{
    if (!$vals) {
        return 0;
    }
    $chunks = array_chunk($vals, 400);
    $n = 0;
    foreach ($chunks as $chunk) {
        $ph = implode(',', array_fill(0, count($chunk), '?'));
        $st = $pdo->prepare("DELETE FROM `$table` WHERE `$col` IN ($ph)");
        $st->execute(array_values($chunk));
        $n += $st->rowCount();
    }
    return $n;
}

// --- kumpulkan id target -------------------------------------------------------
$U = ids($pdo, 'SELECT id FROM users WHERE institution_id = ?', $inst);
$A = ids($pdo, 'SELECT id FROM alumni WHERE institution_id = ?', $inst);
$D = ids($pdo, 'SELECT id FROM departments WHERE institution_id = ?', $inst);
$G = ids($pdo, 'SELECT id FROM graduation_years WHERE institution_id = ?', $inst);
$S = ids($pdo, 'SELECT id FROM surveys WHERE institution_id = ?', $inst);
$V = ids($pdo, 'SELECT id FROM job_vacancies WHERE institution_id = ?', $inst);
$E = ids($pdo, 'SELECT id FROM events WHERE institution_id = ?', $inst);
$AN = ids($pdo, 'SELECT id FROM announcements WHERE institution_id = ?', $inst);
$ST = ids($pdo, 'SELECT id FROM success_stories WHERE institution_id = ?', $inst);
$R = ids($pdo, 'SELECT id FROM survey_responses WHERE institution_id = ?', $inst);
$Q = $S ? ids($pdo, 'SELECT id FROM questions WHERE survey_id IN (SELECT id FROM surveys WHERE institution_id = ?)', $inst) : [];
$APP = $V ? ids($pdo, 'SELECT id FROM job_applications WHERE job_vacancy_id IN (SELECT id FROM job_vacancies WHERE institution_id = ?)', $inst) : [];

echo 'users=' . count($U) . ' alumni=' . count($A) . ' dept=' . count($D) . ' grad=' . count($G)
    . ' surveys=' . count($S) . ' vacancies=' . count($V) . ' events=' . count($E)
    . ' responses=' . count($R) . ' apps=' . count($APP) . PHP_EOL;

// --- matikan FK sementara -------------------------------------------------------
$pdo->exec('SET FOREIGN_KEY_CHECKS = 0');

$total = 0;
$report = [];

// child/relasi berdasarkan kolom & keluarga id
$families = [
    ['user_id', $U],
    ['created_by', $U],
    ['sender_id', $U],
    ['receiver_id', $U],
    ['blocked_id', $U],
    ['reported_id', $U],
    ['institution_id', [$inst]],
    ['alumni_id', $A],
    ['survey_id', $S],
    ['question_id', $Q],
    ['job_vacancy_id', $V],
    ['job_application_id', $APP],
    ['event_id', $E],
    ['announcement_id', $AN],
];

$tables = $pdo->query('SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()')->fetchAll(PDO::FETCH_COLUMN);
foreach ($tables as $table) {
    if ($table === 'institutions') {
        continue; // simpan terakhir
    }
    $cols = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = " . $pdo->quote($table))->fetchAll(PDO::FETCH_COLUMN);
    foreach ($families as [$col, $vals]) {
        if (in_array($col, $cols, true) && $vals) {
            $n = del($pdo, $table, $col, $vals);
            if ($n > 0) {
                $report[] = "$table ($col): -$n";
                $total += $n;
            }
        }
    }
}

// tabel khusus user (tanpa kolom di atas)
$Uemails = $pdo->prepare('SELECT email FROM users WHERE id IN (' . implode(',', array_fill(0, count($U), '?')) . ')');
$Uemails->execute($U);
$emails = $Uemails->fetchAll(PDO::FETCH_COLUMN);
foreach ($emails as $em) {
    $n = del($pdo, 'password_reset_tokens', 'email', [$em]);
    if ($n) {
        $report[] = "password_reset_tokens: -$n";
        $total += $n;
    }
}
$n = del($pdo, 'model_has_roles', 'model_id', $U);
$report[] = "model_has_roles: -$n";
$total += $n;
$n = del($pdo, 'personal_access_tokens', 'tokenable_id', $U);
if ($n) {
    $report[] = "personal_access_tokens: -$n";
    $total += $n;
}
$n = del($pdo, 'sessions', 'user_id', $U);
if ($n) {
    $report[] = "sessions: -$n";
    $total += $n;
}

// institusi terakhir
$n = del($pdo, 'institutions', 'id', [$inst]);
$report[] = "institutions: -$n";
$total += $n;

$pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

echo implode(PHP_EOL, $report) . PHP_EOL;
echo 'TOTAL deleted rows: ' . $total . PHP_EOL;
