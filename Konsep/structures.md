Tracerconnect/
│
├── backend/                         # Laravel REST API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Auth/
│   │   │   │   ├── Admin/
│   │   │   │   ├── Alumni/
│   │   │   │   ├── Questionnaire/
│   │   │   │   ├── Analytics/
│   │   │   │   ├── Report/
│   │   │   │   ├── Career/
│   │   │   │   └── Profile/
│   │   │   │
│   │   │   ├── Requests/
│   │   │   │   ├── Auth/
│   │   │   │   ├── Alumni/
│   │   │   │   ├── Questionnaire/
│   │   │   │   ├── Profile/
│   │   │   │   └── Career/
│   │   │   │
│   │   │   └── Resources/
│   │   │
│   │   ├── Models/
│   │   ├── Services/
│   │   ├── Repositories/
│   │   ├── Policies/
│   │   ├── Actions/
│   │   └── Exceptions/
│   │
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeders/
│   │   └── factories/
│   │
│   ├── routes/
│   │   ├── api.php
│   │   └── web.php
│   │
│   ├── storage/
│   │   └── app/
│   │       └── public/
│   │           └── avatars/
│   │
│   ├── tests/
│   │   ├── Feature/
│   │   └── Unit/
│   │
│   ├── .env
│   └── composer.json
│
├── frontend/                        # React Admin + Landing Page
│   ├── public/
│   │   ├── logo/
│   │   ├── images/
│   │   └── favicon/
│   │
│   ├── src/
│   │   ├── assets/
│   │   │
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── landing/
│   │   │   ├── dashboard/
│   │   │   ├── alumni/
│   │   │   ├── questionnaire/
│   │   │   ├── analytics/
│   │   │   ├── reports/
│   │   │   ├── career/
│   │   │   └── profile/
│   │   │
│   │   ├── layouts/
│   │   │   ├── LandingLayout.jsx
│   │   │   ├── AuthLayout.jsx
│   │   │   └── DashboardLayout.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── landing/
│   │   │   │   ├── LandingPage.jsx
│   │   │   │   ├── Features.jsx
│   │   │   │   ├── Pricing.jsx
│   │   │   │   ├── FAQ.jsx
│   │   │   │   └── Contact.jsx
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   ├── ForgotPassword.jsx
│   │   │   │   └── ResetPassword.jsx
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   ├── alumni/
│   │   │   ├── questionnaire/
│   │   │   ├── analytics/
│   │   │   ├── reports/
│   │   │   ├── career/
│   │   │   └── profile/
│   │   │
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   ├── auth.js
│   │   │   └── utils.js
│   │   │
│   │   ├── routes/
│   │   ├── context/
│   │   ├── types/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── .env
│   ├── package.json
│   └── vite.config.js
│
├── mobile/                         # Flutter Alumni App
│   ├── lib/
│   │   ├── core/
│   │   │   ├── constants/
│   │   │   ├── network/
│   │   │   ├── storage/
│   │   │   ├── theme/
│   │   │   ├── router/
│   │   │   └── utils/
│   │   │
│   │   ├── shared/
│   │   │   ├── widgets/
│   │   │   ├── buttons/
│   │   │   ├── cards/
│   │   │   ├── inputs/
│   │   │   └── dialogs/
│   │   │
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── home/
│   │   │   ├── profile/
│   │   │   ├── questionnaire/
│   │   │   ├── career/
│   │   │   ├── applications/
│   │   │   ├── events/
│   │   │   └── notifications/
│   │   │
│   │   └── main.dart
│   │
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── test/
│   └── pubspec.yaml
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── deployment/
│   └── user-guide/
│
└── README.md