@php
    $statusLabels = [
        'working' => 'Bekerja',
        'unemployed' => 'Belum Bekerja',
        'entrepreneur' => 'Wirausaha',
        'continuing_study' => 'Melanjutkan Studi',
        'unknown' => 'Tidak Diketahui',
    ];
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Executive Summary — {{ $data['institution'] }}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: "DejaVu Sans", sans-serif; font-size: 10.5px; color: #1e293b; margin: 0; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; margin-bottom: 16px; }
        .brand { font-size: 15px; font-weight: bold; color: #4f46e5; }
        .subtitle { font-size: 9px; color: #64748b; margin-top: 2px; }
        h1 { font-size: 17px; margin: 0 0 2px; color: #0f172a; }
        h2 { font-size: 12px; margin: 18px 0 8px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.4px; }
        .meta { font-size: 9px; color: #64748b; text-align: right; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e2e8f0; padding: 5px 7px; text-align: left; }
        th { background: #eef2ff; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
        .cards { width: 100%; border-collapse: separate; border-spacing: 6px 0; margin: 0 -6px; }
        .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; }
        .card .value { font-size: 16px; font-weight: bold; color: #4f46e5; }
        .card .label { font-size: 8.5px; color: #64748b; margin-top: 2px; }
        .muted { color: #64748b; }
        .footer { margin-top: 22px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8.5px; color: #94a3b8; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="brand">TracerConnect</div>
            <div class="subtitle">Laporan Tracer Study &amp; Alumni</div>
        </div>
        <div class="meta">
            Institusi: <strong>{{ $data['institution'] }}</strong><br>
            Dibuat: {{ \Illuminate\Support\Carbon::parse($data['generated_at'])->format('d M Y H:i') }}
        </div>
    </div>

    <h1>Executive Summary</h1>

    <table class="cards" style="border:none;">
        <tr>
            <td style="border:none;"><div class="card"><div class="value">{{ number_format($data['total_alumni']) }}</div><div class="label">Total Alumni</div></div></td>
            <td style="border:none;"><div class="card"><div class="value">{{ number_format($data['total_respondents']) }}</div><div class="label">Responden</div></div></td>
            <td style="border:none;"><div class="card"><div class="value">{{ $data['response_rate'] }}%</div><div class="label">Response Rate</div></div></td>
            <td style="border:none;"><div class="card"><div class="value">{{ number_format($data['total_surveys']) }}</div><div class="label">Total Survey</div></div></td>
        </tr>
    </table>

    <h2>Status Pekerjaan Lulusan</h2>
    <table>
        <tr><th>Status</th><th>Jumlah</th><th>Persentase</th></tr>
        <tr><td>Bekerja</td><td>{{ collect($data['employment_distribution'])->firstWhere('status', 'working')['count'] ?? 0 }}</td><td>{{ $data['employment_rate'] }}%</td></tr>
        <tr><td>Wirausaha</td><td>{{ collect($data['employment_distribution'])->firstWhere('status', 'entrepreneur')['count'] ?? 0 }}</td><td>{{ $data['entrepreneurship_rate'] }}%</td></tr>
        <tr><td>Melanjutkan Studi</td><td>{{ collect($data['employment_distribution'])->firstWhere('status', 'continuing_study')['count'] ?? 0 }}</td><td>{{ $data['continuing_study_rate'] }}%</td></tr>
        <tr><td>Belum Bekerja</td><td>{{ collect($data['employment_distribution'])->firstWhere('status', 'unemployed')['count'] ?? 0 }}</td><td>{{ $data['unemployed_rate'] }}%</td></tr>
    </table>

    <h2>Alumni per Tahun Lulus</h2>
    <table>
        <tr><th>Tahun Lulus</th><th>Jumlah Alumni</th></tr>
        @forelse ($data['alumni_per_year'] as $row)
            <tr><td>{{ $row['year'] }}</td><td>{{ $row['count'] }}</td></tr>
        @empty
            <tr><td colspan="2" class="muted">Belum ada data</td></tr>
        @endforelse
    </table>

    <h2>Respons per Survey</h2>
    <table>
        <tr><th>Survey</th><th>Jumlah Respons</th></tr>
        @forelse ($data['responses_per_survey'] as $row)
            <tr><td>{{ $row['title'] }}</td><td>{{ $row['count'] }}</td></tr>
        @empty
            <tr><td colspan="2" class="muted">Belum ada respons</td></tr>
        @endforelse
    </table>

    <h2>Respons Terbaru</h2>
    <table>
        <tr><th>Responden</th><th>Survey</th><th>Waktu</th></tr>
        @forelse ($data['recent_responses'] as $row)
            <tr>
                <td>{{ $row['respondent'] }}</td>
                <td>{{ $row['survey'] }}</td>
                <td>{{ $row['submitted_at'] ? \Illuminate\Support\Carbon::parse($row['submitted_at'])->format('d M Y H:i') : '—' }}</td>
            </tr>
        @empty
            <tr><td colspan="3" class="muted">Belum ada respons</td></tr>
        @endforelse
    </table>

    <div class="footer">Dokumen ini dibuat otomatis oleh TracerConnect pada {{ \Illuminate\Support\Carbon::parse($data['generated_at'])->format('d M Y H:i') }}</div>
</body>
</html>
