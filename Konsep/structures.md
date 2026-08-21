TracerConnect/
│
├── backend/                              # Laravel REST API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Auth/
│   │   │   │   ├── Admin/
│   │   │   │   ├── Alumni/
│   │   │   │   ├── Institution/
│   │   │   │   ├── Tracer/
│   │   │   │   ├── Career/
│   │   │   │   ├── Employer/
│   │   │   │   ├── Chat/
│   │   │   │   ├── Networking/
│   │   │   │   ├── Event/
│   │   │   │   ├── Report/
│   │   │   │   └── Notification/
│   │   │   │
│   │   │   ├── Requests/
│   │   │   ├── Resources/
│   │   │   └── Middleware/
│   │   │
│   │   ├── Models/
│   │   ├── Policies/
│   │   ├── Services/
│   │   ├── Actions/
│   │   ├── Notifications/
│   │   └── Support/
│   │
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeders/
│   │   ├── factories/
│   │   └── data/
│   │       └── regions/
│   │           ├── provinces.json
│   │           ├── regencies.json
│   │           ├── districts.json
│   │           └── villages.json
│   │
│   ├── routes/
│   │   ├── api.php
│   │   ├── auth.php
│   │   └── web.php
│   │
│   ├── storage/
│   ├── tests/
│   │   ├── Feature/
│   │   ├── Unit/
│   │   └── Security/
│   │
│   ├── .env
│   └── composer.json
│
├── frontend/                             # React + Tailwind
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── forms/
│   │   │   ├── tables/
│   │   │   ├── charts/
│   │   │   ├── chat/
│   │   │   ├── jobs/
│   │   │   └── tracer/
│   │   │
│   │   ├── layouts/
│   │   │   ├── PublicLayout.jsx
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── AlumniLayout.jsx
│   │   │   └── EmployerLayout.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── landing/
│   │   │   ├── auth/
│   │   │   ├── admin/
│   │   │   ├── alumni/
│   │   │   ├── institution/
│   │   │   ├── tracer/
│   │   │   ├── analytics/
│   │   │   ├── reports/
│   │   │   ├── jobs/
│   │   │   ├── applications/
│   │   │   ├── employer/
│   │   │   ├── networking/
│   │   │   ├── chat/
│   │   │   └── events/
│   │   │
│   │   ├── services/
│   │   │   └── api/
│   │   ├── hooks/
│   │   ├── contexts/
│   │   ├── utils/
│   │   ├── routes/
│   │   └── App.jsx
│   │
│   ├── public/
│   ├── tests/
│   ├── package.json
│   └── vite.config.js
│
├── mobile/                               # Flutter
│   ├── lib/
│   │   ├── core/
│   │   │   ├── config/
│   │   │   ├── constants/
│   │   │   ├── network/
│   │   │   ├── storage/
│   │   │   ├── security/
│   │   │   └── utils/
│   │   │
│   │   ├── data/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   └── datasources/
│   │   │
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── profile/
│   │   │   ├── tracer/
│   │   │   ├── jobs/
│   │   │   ├── applications/
│   │   │   ├── networking/
│   │   │   ├── chat/
│   │   │   ├── events/
│   │   │   └── notifications/
│   │   │
│   │   ├── widgets/
│   │   └── main.dart
│   │
│   ├── test/
│   ├── android/
│   └── pubspec.yaml
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── security/
│   ├── qa/
│   └── deployment/
│
├── .gitignore
├── README.md
└── MASTER_PROMPT.json