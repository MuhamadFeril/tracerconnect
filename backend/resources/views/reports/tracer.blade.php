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
    <title>Tracer Study Report — {{ $data['institution'] }}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: "DejaVu Sans", sans-serif; font-size: 10.5px; color: #1e293b; margin: 0; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0e7490; padding-bottom: 10px; margin-bottom: 16px; }
        .brand { font-size: 15px; font-weight: bold; color: #0e7490; }
        .subtitle { font-size: 9px; color: #64748b; margin-top: 2px; }
        h1 { font-size: 17px; margin: 0 0 2px; color: #0f172a; }
        h2 { font-size: 12px; margin: 18px 0 8px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.4px; }
        .meta { font-size: 9px; color: #64748b; text-align: right; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e2e8f0; padding: 5px 7px; text-align: left; }
        th { background: #ecfeff; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
        .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; }
        .card .value { font-size: 15px; font-weight: bold; color: #0e7490; }
        .card .label { font-size: 8.5px; color: #64748b; margin-top: 2px; }
        .muted { color: #64748b; }
        .footer { margin-top: 22px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8.5px; color: #94a3b8; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="brand">TracerConnect</div>
            <div class="subtitle">Laporan Tracer Study</div>
        </div>
        <div class="meta">
            Institusi: <strong>{{ $data['institution'] }}</strong><br>
            Dibuat: {{ \Illuminate\Support\Carbon::parse($data['generated_at'])->format('d M Y H:i') }}
        </div>
    </div>

    <h1>Laporan Tracer Study Lulusan</h1>

    <table style="border:none; border-spacing:6px 0; margin:0 -6px;">
        <tr>
            <td style="border:none;"><div class="card"><div class="value">{{ number_format($data['total_alumni']) }}</div><div class="label">Total Alumni</div></div></td>
            <td style="border:none;"><div class="card"><div class="value">{{ number_format($data['total_respondents']) }}</div><div class="label">Responden</div></div></td>
            <td style="border:none;"><div class="card"><div class="value">{{ $data['response_rate'] }}%</div><div class="label">Response Rate</div></div></td>
        </tr>
    </table>

    <h2>Ringkasan Status Pekerjaan</h2>
    <table>
        <tr><th>Status</th><th>Jumlah Alumni</th><th>Persentase</th></tr>
        @foreach (['working', 'entrepreneur', 'continuing_study', 'unemployed'] as $status)
            @php $count = collect($data['distribution'])->firstWhere('status', $status)['count'] ?? 0; @endphp
            <tr>
                <td>{{ $statusLabels[$status] }}</td>
                <td>{{ $count }}</td>
                <td>{{ $data[$status === 'working' ? 'employment_rate' : ($status === 'entrepreneur' ? 'entrepreneurship_rate' : ($status === 'continuing_study' ? 'continuing_study_rate' : 'unemployed_rate'))] }}%</td>
            </tr>
        @endforeach
    </table>

    <h2>Status per Tahun Lulus</h2>
    <table>
        <tr>
            <th>Tahun Lulus</th>
            <th>Bekerja</th>
            <th>Wirausaha</th>
            <th>Melanjutkan Studi</th>
            <th>Belum Bekerja</th>
            <th>Tidak Diketahui</th>
        </tr>
        @forelse ($data['by_year'] as $row)
            <tr>
                <td>{{ $row['year'] }}</td>
                <td>{{ $row['working'] }}</td>
                <td>{{ $row['entrepreneur'] }}</td>
                <td>{{ $row['continuing_study'] }}</td>
                <td>{{ $row['unemployed'] }}</td>
                <td>{{ $row['unknown'] }}</td>
            </tr>
        @empty
            <tr><td colspan="6" class="muted">Belum ada data</td></tr>
        @endforelse
    </table>

    <h2>Status per Jurusan</h2>
    <table>
        <tr>
            <th>Jurusan</th>
            <th>Bekerja</th>
            <th>Wirausaha</th>
            <th>Melanjutkan Studi</th>
            <th>Belum Bekerja</th>
            <th>Tidak Diketahui</th>
        </tr>
        @forelse ($data['by_department'] as $row)
            <tr>
                <td>{{ $row['department'] }}</td>
                <td>{{ $row['working'] }}</td>
                <td>{{ $row['entrepreneur'] }}</td>
                <td>{{ $row['continuing_study'] }}</td>
                <td>{{ $row['unemployed'] }}</td>
                <td>{{ $row['unknown'] }}</td>
            </tr>
        @empty
            <tr><td colspan="6" class="muted">Belum ada data</td></tr>
        @endforelse
    </table>

    <div class="footer">Dokumen ini dibuat otomatis oleh TracerConnect pada {{ \Illuminate\Support\Carbon::parse($data['generated_at'])->format('d M Y H:i') }}</div>
</body>
</html>
