




Klaim penawaran
48509c69-eef1-4ae8-a472-46bb64344a2a.png

Memproses selama 12s
Analisis dihentikan sebentar

Analisis dihentikan sebentar
Sudah. Karena struktur kamu sekarang:

Tracerconnect/
├── backend/     ← Laravel sudah benar
├── frontend/    ← akan dibuat React + Tailwind
└── mobile/      ← akan dibuat Flutter
Saya buatkan script bootstrap untuk menyiapkan frontend + mobile sekaligus, termasuk dependency, struktur dasar, Axios, routing React, Tailwind, Dio, Riverpod, secure storage, dan pengecekan build/analyze.

Download setup_tracerconnect_frontend_mobile.ps1

Cara menjalankan
Buka PowerShell:

cd D:\laragon\www\Tracerconnect
Lalu izinkan script untuk sesi tersebut:

Set-ExecutionPolicy -Scope Process Bypass
Jalankan:

.\setup_tracerconnect_frontend_mobile.ps1
Script akan membuat:

Tracerconnect/
│
├── backend/
│   └── Laravel 13
│
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── api.js
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── routes/
│   │   │   └── AppRouter.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   ├── .env
│   ├── vite.config.js
│   └── package.json
│
└── mobile/
    ├── lib/
    │   ├── core/
    │   │   ├── network/
    │   │   │   └── api_client.dart
    │   │   └── storage/
    │   │       └── token_storage.dart
    │   ├── features/
    │   │   ├── auth/
    │   │   │   └── login_page.dart
    │   │   └── dashboard/
    │   │       └── dashboard_page.dart
    │   └── main.dart
    └── pubspec.yaml
Setelah selesai, gunakan 3 terminal.

Terminal 1 — Laravel
cd D:\laragon\www\Tracerconnect\backend
php artisan serve
API:

http://127.0.0.1:8000
Terminal 2 — React
cd D:\laragon\www\Tracerconnect\frontend
npm run dev
Buka:

http://localhost:5173
Terminal 3 — Flutter
cd D:\laragon\www\Tracerconnect\mobile
flutter run
Untuk Android Emulator, Flutter sudah diarahkan ke:

http://10.0.2.2:8000/api/v1
10.0.2.2 berarti localhost komputer dari sudut pandang Android Emulator.

Urutan pengerjaan setelah ini
Jangan langsung membuat semua halaman.

Kita lanjut dengan urutan:

1. Laravel
   ↓
2. MySQL + .env
   ↓
3. Sanctum
   ↓
4. Spatie Permission
   ↓
5. UUID
   ↓
6. User + Role
   ↓
7. Institution
   ↓
8. Alumni
   ↓
9. API Authentication
   ↓
10. React Login
   ↓
11. React Dashboard
   ↓
12. Flutter Login
   ↓
13. Flutter Dashboard
   ↓
14. Questionnaire Engine
   ↓
15. Tracer Response
   ↓
16. Analytics
   ↓
17. Career Center / Job Board
Untuk TracerConnect, Career Center/job board tetap masuk roadmap, sehingga alumni nantinya bukan cuma mengisi kuesioner, tetapi juga bisa mencari, menyimpan, dan melamar lowongan serta melihat status lamaran.


setup_tracerconnect_frontend_mobile.ps1
File


hari ini 19.35
buatkan json prompt super lengkap semua instruksi di data pada file tersendiri .     frontend backend dan mobile    ini masih belum ada untuk tampilan landing page nya

Sudah. Saya buatkan JSON Master Prompt super lengkap untuk seluruh TracerConnect:

Backend Laravel 13 + MySQL + Sanctum + Spatie Permission

Frontend React + Vite + Tailwind

Landing Page lengkap

Admin dashboard

Questionnaire Builder

Tracer Study

Alumni Management

Analytics

Report

Career Center

Job Board

Event Alumni

Notification

Flutter Mobile

Authentication

RBAC

UUID

Multi-institution/tenant isolation

Shared hosting deployment

Testing

Vibe-coding protocol

Development phases

Acceptance criteria

VPS tidak dijadikan requirement.

File
Download TracerConnect_Master_Prompt.json

Struktur utamanya:

TracerConnect_Master_Prompt.json
│
├── project
├── master_ai_instruction
├── repository
├── stack
├── product
│
├── landing_page              ← sudah dimasukkan
│   ├── navbar
│   ├── hero
│   ├── trust
│   ├── problem
│   ├── solution
│   ├── features
│   ├── workflow
│   ├── analytics
│   ├── mobile
│   ├── career center
│   ├── pricing
│   ├── testimonial
│   ├── FAQ
│   ├── CTA
│   └── footer
│
├── backend
│   ├── modules
│   ├── roles
│   ├── entities
│   ├── database rules
│   ├── API
│   ├── questionnaire engine
│   ├── analytics
│   └── security
│
├── frontend
│   ├── public routes
│   ├── authenticated routes
│   ├── components
│   ├── dashboard
│   └── questionnaire builder
│
├── mobile
│   ├── screens
│   ├── alumni home
│   ├── survey UX
│   ├── architecture
│   └── networking
│
├── authentication
├── shared_hosting
├── testing
├── phases
├── commands
└── final_acceptance
Jadi file ini bisa dijadikan context/master instruction utama untuk AI coding sebelum mulai melakukan vibecoding TracerConnect. 


TracerConnect_Master_Prompt.json
Kode


ohyah ini msaih belum bisa update foto profile lalu belum menggunakan register login

Betul. Itu memang harus masuk requirement inti, bukan sekadar tambahan UI.

Saya sudah update master JSON menjadi v2, khusus menambahkan:

Authentication
Landing
   ↓
Register
   ↓
Login
   ↓
Dashboard
Termasuk:

Register alumni

Login

Logout

Forgot password

Reset password

Current user /me

Role dari backend

Password hashing

Secure token storage Flutter

Protected routes

Auth error handling

Profile
Sekarang ada requirement:

Profile
├── Nama
├── Email
├── No. HP
├── Alamat
├── Bio
├── Data alumni
├── Foto profile
│   ├── Upload
│   ├── Preview
│   ├── Ganti
│   ├── Hapus
│   └── Fallback initials
└── Ganti password
API yang direncanakan:

POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/logout

GET    /api/v1/me
PUT    /api/v1/me/profile
POST   /api/v1/me/avatar
DELETE /api/v1/me/avatar
PUT    /api/v1/me/password
Upload foto menggunakan:

multipart/form-data
dengan validasi:

jpg
jpeg
png
webp
max 2 MB
MIME validation
extension validation
safe filename
Dan sudah dimasukkan juga requirement supaya benar-benar kompatibel dengan shared hosting, termasuk Laravel filesystem/storage.

Untuk React:

/register
/login
/forgot-password
/reset-password
/profile
/settings/profile
Untuk Flutter:

Register
Login
Forgot Password
Reset Password
Profile
Edit Profile
Change Password
Upload Avatar
File terbaru
Download TracerConnect Master Prompt v2 — Auth & Profile

Ini yang sebaiknya kamu gunakan sebagai master context untuk vibecoding, bukan file JSON versi sebelumnya. 


TracerConnect_Master_Prompt_v2_AUTH_PROFILE.json
Kode


Perpustakaan
/
TracerConnect_Master_Prompt_v2_AUTH_PROFILE.json


{
  "project": {
    "name": "TracerConnect",
    "type": "Tracer Study & Alumni Engagement SaaS",
    "goal": "Membangun platform tracer study untuk sekolah, kampus, dan lembaga pendidikan yang mengelola alumni, kuisioner dinamis, respons, analitik, laporan, career center, dan engagement alumni.",
    "current_environment": "Local computer",
    "deployment_target": "Shared hosting",
    "vps": "Future optional only; never make VPS infrastructure a mandatory dependency"
  },
  "master_ai_instruction": {
    "role": "Senior full-stack architect, Laravel developer, React developer, Flutter developer, UI/UX designer, database architect, API designer, security engineer, QA engineer, and technical writer.",
    "rules": [
      "Baca struktur project sebelum mengubah kode.",
      "Backend adalah source of truth; frontend dan mobile hanya client.",
      "Jangan membuat endpoint, database field, role, atau business rule palsu tanpa menandainya sebagai planned.",
      "Sebelum membuat file baru, cek apakah fungsi serupa sudah ada.",
      "Gunakan reusable components dan service/repository yang masuk akal.",
      "Jangan hardcode secret, password, token, API key, atau production URL.",
      "Semua input harus divalidasi di backend.",
      "Semua protected resource harus memiliki authorization.",
      "Jangan mengandalkan frontend untuk security atau tenant isolation.",
      "Setelah perubahan penting jalankan lint, build, analyze, test, atau command validasi yang relevan.",
      "Jangan mengklaim test/build berhasil jika belum benar-benar dijalankan.",
      "Prioritaskan kompatibilitas shared hosting.",
      "Jangan mewajibkan Docker, Redis, Supervisor, VPS, atau persistent worker.",
      "Jika error muncul, cari root cause sebelum membuat workaround.",
      "Jangan menghapus kode yang masih dipakai tanpa alasan yang jelas.",
      "Jaga backward compatibility API jika endpoint sudah digunakan client."
    ],
    "vibe_coding_protocol": [
      "Inspect project.",
      "Identify affected modules/files.",
      "State implementation plan.",
      "Implement minimal complete change.",
      "Validate/build/test.",
      "Fix errors.",
      "Summarize changed files and remaining issues."
    ]
  },
  "repository": {
    "root": "Tracerconnect/",
    "structure": {
      "backend": "Laravel REST API",
      "frontend": "React + Vite + Tailwind CSS",
      "mobile": "Flutter Android-first",
      "docs": "Architecture/API/Database/Deployment documentation"
    },
    "target_tree": [
      "Tracerconnect/backend/",
      "Tracerconnect/frontend/",
      "Tracerconnect/mobile/",
      "Tracerconnect/docs/architecture/",
      "Tracerconnect/docs/api/",
      "Tracerconnect/docs/database/",
      "Tracerconnect/docs/deployment/"
    ]
  },
  "stack": {
    "backend": {
      "framework": "Laravel 13",
      "php": "8.3+",
      "database": "MySQL",
      "api": "REST /api/v1",
      "authentication": "Laravel Sanctum",
      "authorization": "Spatie Laravel Permission",
      "ids": "UUID for major entities",
      "architecture": "MVC + Form Request + API Resource + Service Layer + Policy",
      "pdf": "Dompdf or shared-hosting-compatible PDF library",
      "cache": "file/database cache; Redis optional only",
      "queue": "database queue only when needed; core system must work without persistent workers"
    },
    "frontend": {
      "framework": "React",
      "bundler": "Vite",
      "styling": "Tailwind CSS",
      "routing": "React Router",
      "http": "Axios",
      "server_state": "TanStack Query",
      "forms": "React Hook Form",
      "validation": "Zod where useful",
      "icons": "Lucide React",
      "charts": "Recharts or equivalent",
      "language": "Prefer TypeScript for new code if migration cost is reasonable"
    },
    "mobile": {
      "framework": "Flutter",
      "state": "Riverpod",
      "routing": "GoRouter",
      "http": "Dio",
      "secure_storage": "flutter_secure_storage",
      "design": "Material 3 + TracerConnect design system",
      "priority": "Android first"
    }
  },
  "product": {
    "target_customers": [
      "SMK",
      "SMA",
      "Universitas",
      "Politeknik",
      "Lembaga pendidikan",
      "Organisasi alumni",
      "Training center"
    ],
    "core_value": [
      "Database alumni terpusat",
      "Kuisioner dinamis tanpa coding",
      "Tracer study digital",
      "Response tracking",
      "Dashboard analytics",
      "Laporan otomatis",
      "Import/export alumni",
      "Career center",
      "Alumni engagement"
    ],
    "premium_features": [
      "Custom branding",
      "Advanced analytics",
      "Advanced reports",
      "Career center",
      "Job board",
      "Event alumni",
      "Notification/broadcast",
      "Survey scheduling",
      "Multiple survey templates",
      "Institution comparison",
      "API access",
      "Audit log",
      "Usage limits and subscription plans"
    ]
  },
  "landing_page": {
    "required": true,
    "route": "/",
    "purpose": "Marketing website yang menjual TracerConnect, menjelaskan manfaat, membangun trust, dan mengarahkan visitor ke demo, pricing, contact, atau login.",
    "design": {
      "style": "Modern SaaS, clean, premium, professional, education technology",
      "theme": "Light-first, optional dark mode",
      "responsive": true,
      "accessibility": true,
      "animation": "Subtle only; no excessive animation",
      "visual_language": "Blue/indigo primary, slate neutrals, cards with soft borders/shadows, generous whitespace"
    },
    "sections": [
      {
        "name": "Navbar",
        "items": [
          "Logo",
          "Fitur",
          "Cara Kerja",
          "Keunggulan",
          "Harga",
          "FAQ",
          "Login",
          "Demo"
        ]
      },
      {
        "name": "Hero",
        "headline": "Kelola Tracer Study Alumni Lebih Mudah, Cepat, dan Terukur.",
        "description": "TracerConnect membantu institusi mengelola data alumni, membuat kuisioner, memantau respons, menganalisis hasil, dan menghasilkan laporan dalam satu platform.",
        "primary_cta": "Coba Demo",
        "secondary_cta": "Lihat Fitur",
        "visual": "Dashboard analytics mockup"
      },
      {
        "name": "Trust/Benefits",
        "items": [
          "Data alumni terpusat",
          "Kuisioner dinamis",
          "Dashboard analytics",
          "Laporan siap digunakan"
        ]
      },
      {
        "name": "Problem",
        "title": "Masih Mengelola Tracer Study Secara Manual?",
        "items": [
          "Data tersebar",
          "Rekap manual",
          "Sulit memantau responden",
          "Laporan memakan waktu",
          "Sulit melihat kondisi alumni"
        ]
      },
      {
        "name": "Solution",
        "title": "Satu Platform untuk Seluruh Proses Tracer Study",
        "items": [
          "Alumni management",
          "Questionnaire builder",
          "Survey publishing",
          "Response tracking",
          "Analytics",
          "Reports",
          "Career center",
          "Engagement"
        ]
      },
      {
        "name": "Feature Showcase",
        "items": [
          "Dashboard Statistik",
          "Questionnaire Builder",
          "Alumni Management",
          "Tracer Response",
          "Report Generator",
          "Career Center",
          "Events",
          "Notifications"
        ]
      },
      {
        "name": "Workflow",
        "steps": [
          "Buat akun institusi",
          "Import data alumni",
          "Buat kuisioner",
          "Publish survey",
          "Alumni mengisi",
          "Sistem menghitung statistik",
          "Download laporan"
        ]
      },
      {
        "name": "Analytics Preview",
        "metrics": [
          "Total alumni",
          "Response rate",
          "Employment rate",
          "Further study rate",
          "Waiting period",
          "Job relevance",
          "Industry distribution",
          "Program comparison"
        ]
      },
      {
        "name": "Mobile",
        "title": "Alumni Mengisi dari Mana Saja",
        "items": [
          "Login",
          "Profile",
          "Tracer questionnaire",
          "Save draft",
          "Resume survey",
          "Jobs",
          "Events",
          "Notifications"
        ]
      },
      {
        "name": "Career Center",
        "title": "Lebih dari Sekadar Tracer Study",
        "items": [
          "Lowongan kerja",
          "Bookmark",
          "Lamaran",
          "Status lamaran",
          "Event alumni",
          "Networking foundation"
        ]
      },
      {
        "name": "Pricing",
        "plans": [
          {
            "name": "Starter",
            "target": "Institusi kecil",
            "features": [
              "Alumni management",
              "Basic questionnaire",
              "Basic analytics",
              "CSV export"
            ]
          },
          {
            "name": "Professional",
            "target": "Institusi berkembang",
            "features": [
              "Advanced questionnaire",
              "Advanced analytics",
              "PDF report",
              "Career center",
              "Custom branding"
            ]
          },
          {
            "name": "Enterprise",
            "target": "Institusi besar",
            "features": [
              "Multi-campus",
              "Advanced reporting",
              "API access",
              "Custom domain readiness",
              "Priority support"
            ]
          }
        ],
        "rule": "Harga production harus configurable dari backend jika diperlukan; jangan hardcode data bisnis permanen."
      },
      {
        "name": "Testimonial",
        "rule": "Gunakan placeholder yang jelas; jangan membuat testimonial atau logo partner palsu."
      },
      {
        "name": "FAQ",
        "questions": [
          "Apa itu TracerConnect?",
          "Siapa yang dapat menggunakan?",
          "Apakah alumni perlu mobile app?",
          "Apakah kuisioner dapat dibuat sendiri?",
          "Apakah data dapat diekspor?",
          "Apakah multi-institution?",
          "Apakah dapat di-deploy ke shared hosting?"
        ]
      },
      {
        "name": "Final CTA",
        "headline": "Mulai Kelola Tracer Study dengan Lebih Terstruktur.",
        "actions": [
          "Minta Demo",
          "Login"
        ]
      },
      {
        "name": "Footer",
        "items": [
          "Logo",
          "Deskripsi",
          "Product links",
          "Company links",
          "Privacy",
          "Terms",
          "Contact",
          "Copyright"
        ]
      }
    ],
    "technical": [
      "Gunakan semantic HTML.",
      "SEO metadata tersedia.",
      "Responsive dari mobile sampai desktop.",
      "Optimalkan asset dan Core Web Vitals.",
      "Landing page utama tidak boleh membutuhkan API untuk konten statis inti.",
      "CTA harus menuju route nyata.",
      "Navbar mobile menggunakan drawer/menu.",
      "Tidak ada lorem ipsum pada production UI."
    ]
  },
  "backend": {
    "modules": [
      "Authentication",
      "User Management",
      "Role & Permission",
      "Institution",
      "Campus",
      "Department",
      "Program",
      "Cohort",
      "Alumni",
      "Questionnaire",
      "Questionnaire Section",
      "Question",
      "Question Option",
      "Questionnaire Publishing",
      "Survey Invitation",
      "Tracer Response",
      "Answer",
      "Analytics",
      "Reports",
      "Import/Export",
      "Career Center",
      "Jobs",
      "Job Applications",
      "Events",
      "Event Registration",
      "Notifications",
      "Audit Logs",
      "Subscription",
      "Settings",
      "Registration & Password Recovery",
      "Profile & Avatar Management"
    ],
    "roles": [
      {
        "name": "super_admin",
        "scope": "platform"
      },
      {
        "name": "institution_admin",
        "scope": "institution"
      },
      {
        "name": "operator",
        "scope": "institution"
      },
      {
        "name": "survey_manager",
        "scope": "institution"
      },
      {
        "name": "alumni",
        "scope": "self"
      },
      {
        "name": "employer",
        "scope": "career"
      }
    ],
    "entities": [
      "User",
      "Institution",
      "Campus",
      "Department",
      "Program",
      "Cohort",
      "Alumni",
      "Questionnaire",
      "QuestionnaireSection",
      "Question",
      "QuestionOption",
      "SurveyInvitation",
      "QuestionnaireResponse",
      "Answer",
      "Job",
      "JobApplication",
      "Event",
      "EventRegistration",
      "Notification",
      "Report",
      "AuditLog",
      "Subscription",
      "Setting",
      "PasswordResetToken",
      "Media"
    ],
    "database_rules": [
      "UUID untuk entity utama.",
      "Foreign key dan index harus benar.",
      "Index institution_id, cohort_id, program_id, status, email, slug, dan kolom filter yang sering digunakan.",
      "Timestamps pada entity yang relevan.",
      "Soft delete hanya jika recovery diperlukan.",
      "Gunakan relational tables untuk data inti survey; JSON hanya untuk metadata/configuration yang benar-benar fleksibel.",
      "Tenant isolation wajib di backend."
    ],
    "api": {
      "prefix": "/api/v1",
      "groups": [
        "auth",
        "users",
        "institutions",
        "campuses",
        "departments",
        "programs",
        "cohorts",
        "alumni",
        "questionnaires",
        "questions",
        "responses",
        "analytics",
        "reports",
        "imports",
        "exports",
        "jobs",
        "applications",
        "events",
        "notifications",
        "settings"
      ],
      "response": {
        "success": {
          "success": true,
          "message": "Human readable message",
          "data": {}
        },
        "error": {
          "success": false,
          "message": "Human readable message",
          "errors": {}
        }
      },
      "rules": [
        "Form Request validation",
        "API Resources",
        "Policies/permissions",
        "Pagination",
        "Controlled filter/search/sort",
        "Correct HTTP status codes",
        "Rate limiting for sensitive endpoints",
        "Transactions for atomic multi-table operations"
      ]
    },
    "questionnaire_engine": {
      "types": [
        "short_text",
        "long_text",
        "single_choice",
        "multiple_choice",
        "dropdown",
        "rating",
        "number",
        "date",
        "year",
        "boolean",
        "employment_status",
        "salary_range",
        "location",
        "file"
      ],
      "features": [
        "Sections",
        "Ordering",
        "Required/optional",
        "Options",
        "Conditional logic",
        "Draft",
        "Preview",
        "Publish",
        "Close",
        "Schedule",
        "Save progress",
        "Resume later"
      ]
    },
    "analytics": [
      "Total alumni",
      "Eligible respondents",
      "Responses",
      "Response rate",
      "Employment rate",
      "Unemployment rate",
      "Further study rate",
      "Average waiting period",
      "Job relevance",
      "Industry distribution",
      "Position distribution",
      "Location distribution",
      "Cohort comparison",
      "Program comparison"
    ],
    "security": [
      "Sanctum",
      "Password hashing",
      "Spatie permissions",
      "Policies",
      "Tenant isolation",
      "Validation",
      "Rate limiting",
      "Secure upload validation",
      "Audit logs",
      "No secret exposure",
      "Minimize sensitive logs"
    ],
    "profile": {
      "features": [
        "View profile",
        "Update profile",
        "Change password",
        "Upload profile photo",
        "Replace profile photo",
        "Delete profile photo"
      ],
      "avatar": {
        "field": "avatar",
        "formats": [
          "jpg",
          "jpeg",
          "png",
          "webp"
        ],
        "max_size_mb": 2,
        "storage": "Laravel filesystem public disk",
        "validation": [
          "MIME",
          "extension",
          "size",
          "safe filename",
          "reject executable files"
        ],
        "shared_hosting": [
          "support storage:link when available",
          "provide hosting-safe fallback if symlink unavailable"
        ]
      }
    },
    "auth_api_contract": {
      "public": [
        "POST /api/v1/auth/register",
        "POST /api/v1/auth/login",
        "POST /api/v1/auth/forgot-password",
        "POST /api/v1/auth/reset-password"
      ],
      "protected": [
        "POST /api/v1/auth/logout",
        "GET /api/v1/me",
        "PUT /api/v1/me/profile",
        "POST /api/v1/me/avatar",
        "DELETE /api/v1/me/avatar",
        "PUT /api/v1/me/password"
      ],
      "requirements": [
        "422 validation",
        "401 invalid credentials",
        "409 duplicate registration where applicable",
        "never return password hash or raw secrets"
      ]
    }
  },
  "frontend": {
    "public_routes": [
      "/",
      "/features",
      "/pricing",
      "/faq",
      "/contact",
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password"
    ],
    "authenticated_routes": [
      "/dashboard",
      "/alumni",
      "/alumni/:id",
      "/cohorts",
      "/programs",
      "/questionnaires",
      "/questionnaires/create",
      "/questionnaires/:id/edit",
      "/questionnaires/:id/preview",
      "/responses",
      "/analytics",
      "/reports",
      "/jobs",
      "/applications",
      "/events",
      "/notifications",
      "/settings",
      "/profile",
      "/settings/profile"
    ],
    "components": [
      "LandingNavbar",
      "Navbar",
      "Footer",
      "Hero",
      "FeatureCard",
      "PricingCard",
      "FAQAccordion",
      "CTASection",
      "Sidebar",
      "Topbar",
      "StatCard",
      "DataTable",
      "Pagination",
      "FilterBar",
      "Modal",
      "Drawer",
      "ConfirmDialog",
      "Toast",
      "FormField",
      "Select",
      "DatePicker",
      "EmptyState",
      "LoadingState",
      "ErrorState",
      "ChartCard"
    ],
    "dashboard": [
      "Stat cards",
      "Response rate chart",
      "Employment chart",
      "Cohort chart",
      "Recent responses",
      "Survey status",
      "Quick actions"
    ],
    "questionnaire_builder": [
      "Create",
      "Sections",
      "Question types",
      "Edit",
      "Reorder",
      "Required toggle",
      "Conditional logic",
      "Preview",
      "Save draft",
      "Publish"
    ],
    "ux_rules": [
      "Responsive admin",
      "Mobile-first public pages",
      "Loading states",
      "Empty states",
      "Actionable errors",
      "Form validation",
      "Responsive tables",
      "Confirmation for destructive actions",
      "No browser alert for production UX when toast/dialog is appropriate"
    ],
    "authentication": {
      "pages": [
        "Login",
        "Register",
        "ForgotPassword",
        "ResetPassword",
        "Profile"
      ],
      "profile_photo": [
        "Current avatar",
        "Upload",
        "Preview",
        "Replace",
        "Remove",
        "Fallback initials",
        "multipart/form-data",
        "refresh profile after upload"
      ],
      "rules": [
        "No fake success",
        "Handle 413/422",
        "Loading/error/success states"
      ]
    }
  },
  "mobile": {
    "screens": [
      "Splash",
      "Onboarding",
      "Login",
      "Register",
      "Forgot Password",
      "Home",
      "Profile",
      "Edit Profile",
      "Available Surveys",
      "Survey Detail",
      "Questionnaire",
      "Save Draft",
      "Resume Survey",
      "Survey Success",
      "Job Board",
      "Job Detail",
      "Apply Job",
      "My Applications",
      "Events",
      "Event Detail",
      "Notifications",
      "Settings",
      "Register",
      "Forgot Password",
      "Reset Password",
      "Profile",
      "Edit Profile",
      "Change Password"
    ],
    "home": [
      "Unfinished surveys",
      "Tracer progress",
      "Profile completion",
      "Recommended jobs",
      "Upcoming events",
      "Notification summary"
    ],
    "survey_ux": [
      "Progress indicator",
      "Back/next",
      "Validation before next",
      "Local draft where appropriate",
      "Backend sync",
      "Resume",
      "Network failure handling",
      "Prevent answer loss"
    ],
    "architecture": [
      "Riverpod",
      "GoRouter",
      "Dio",
      "Repository/service separation",
      "No direct HTTP calls inside presentation widgets"
    ],
    "network": [
      "Android emulator: http://10.0.2.2:8000",
      "Physical device: computer LAN IP",
      "Production: HTTPS domain",
      "Production URL configurable by environment"
    ],
    "authentication": {
      "required": true,
      "avatar": [
        "Gallery",
        "Optional camera",
        "Preview",
        "Multipart upload",
        "Progress",
        "Remove",
        "Initial fallback"
      ],
      "packages": [
        "image_picker",
        "flutter_secure_storage",
        "dio"
      ],
      "rules": [
        "Never store password",
        "Secure token storage",
        "Handle expired token",
        "Reload profile after avatar upload"
      ]
    }
  },
  "authentication": {
    "web": [
      "Login",
      "Authenticate",
      "Fetch current user",
      "Resolve role/permissions from backend",
      "Redirect to correct area",
      "Logout and clear client state"
    ],
    "mobile": [
      "Login",
      "Receive token",
      "Store in secure storage",
      "Dio interceptor adds Bearer token",
      "Fetch current user",
      "Logout and clear token"
    ],
    "rule": "Frontend/mobile must never determine authorization by itself. Backend permission is authoritative.",
    "required_flows": {
      "public": [
        "Landing page",
        "Register",
        "Login",
        "Forgot password",
        "Reset password"
      ],
      "protected": [
        "Logout",
        "Current user",
        "Update profile",
        "Upload profile photo",
        "Replace profile photo",
        "Delete profile photo",
        "Change password"
      ],
      "rules": [
        "Register dan login wajib terhubung ke Laravel API, bukan mock UI.",
        "Password di-hash backend.",
        "Backend menentukan role.",
        "Mobile token hanya secure storage.",
        "Public registration tidak boleh memberikan role admin."
      ]
    }
  },
  "shared_hosting": {
    "backend": [
      "PHP compatible with Laravel",
      "MySQL",
      "Document root should target backend/public when hosting permits",
      "APP_ENV=production",
      "APP_DEBUG=false",
      "APP_URL configured",
      "Secure .env",
      "Composer production install",
      "Migrations carefully",
      "Storage link if supported",
      "Cache config/routes/views as appropriate",
      "Test avatar upload on actual shared hosting",
      "Ensure upload_max_filesize and post_max_size are adequate",
      "Configure writable Laravel storage",
      "Do not expose private uploads"
    ],
    "frontend": [
      "npm run build",
      "Deploy dist as static files",
      "Set VITE_API_URL at build time",
      "Configure SPA fallback to index.html where supported",
      "No Node runtime required after build"
    ],
    "mobile": [
      "Build APK/AAB",
      "Production API HTTPS",
      "No local URL in release build"
    ],
    "prohibited_as_requirement": [
      "VPS",
      "Docker",
      "Redis",
      "Supervisor",
      "Persistent worker"
    ]
  },
  "testing": {
    "backend": [
      "Auth feature tests",
      "Authorization tests",
      "Tenant isolation tests",
      "Alumni CRUD",
      "Questionnaire",
      "Response submission",
      "Analytics",
      "Import validation",
      "Registration",
      "Login",
      "Password reset",
      "Profile update",
      "Avatar upload validation",
      "Avatar replace/delete",
      "Profile authorization"
    ],
    "frontend": [
      "npm run build",
      "Route checks",
      "Form validation",
      "API error handling",
      "Responsive checks",
      "Register",
      "Login",
      "Password recovery",
      "Avatar preview/upload/remove",
      "Auth redirect"
    ],
    "mobile": [
      "flutter analyze",
      "Unit tests",
      "Widget tests for critical screens",
      "Login flow",
      "Survey flow",
      "Register",
      "Login",
      "Password recovery",
      "Profile",
      "Avatar picker/upload/remove",
      "Token persistence"
    ],
    "definition_of_done": [
      "No obvious compile errors",
      "Validation exists",
      "Authorization exists",
      "Loading/error/empty states",
      "Responsive UI",
      "API contract respected",
      "Relevant tests pass",
      "No secrets committed"
    ]
  },
  "phases": [
    {
      "id": 0,
      "name": "Foundation",
      "tasks": [
        "Verify backend",
        "Verify frontend",
        "Verify Flutter",
        "Configure env",
        "Configure MySQL"
      ]
    },
    {
      "id": 1,
      "name": "Landing Page",
      "tasks": [
        "Navbar",
        "Hero",
        "Problem",
        "Solution",
        "Features",
        "Workflow",
        "Analytics preview",
        "Mobile preview",
        "Career center",
        "Pricing",
        "FAQ",
        "CTA",
        "Footer",
        "Responsive",
        "SEO"
      ]
    },
    {
      "id": 2.5,
      "name": "Authentication & Profile",
      "tasks": [
        "Register API",
        "Login API",
        "Logout API",
        "Forgot/reset password",
        "Current user",
        "Profile update",
        "Change password",
        "Avatar upload/replace/delete",
        "React auth pages",
        "React profile",
        "Flutter auth",
        "Flutter profile",
        "Secure token storage",
        "Integration tests"
      ]
    },
    {
      "id": 2,
      "name": "Backend Foundation",
      "tasks": [
        "Sanctum",
        "UUID",
        "RBAC",
        "API response standard",
        "Exception handling",
        "Form Requests",
        "Resources",
        "Policies",
        "Audit foundation"
      ]
    },
    {
      "id": 3,
      "name": "Institution & Alumni",
      "tasks": [
        "Institution",
        "Campus",
        "Department",
        "Program",
        "Cohort",
        "Alumni",
        "Import",
        "Profile"
      ]
    },
    {
      "id": 4,
      "name": "Questionnaire Engine",
      "tasks": [
        "Questionnaire",
        "Sections",
        "Questions",
        "Options",
        "Conditional logic",
        "Draft",
        "Preview",
        "Publish",
        "Close",
        "Schedule"
      ]
    },
    {
      "id": 5,
      "name": "Tracer Response",
      "tasks": [
        "Invitation",
        "Response",
        "Answer",
        "Save draft",
        "Resume",
        "Submit",
        "Validation"
      ]
    },
    {
      "id": 6,
      "name": "Analytics & Reports",
      "tasks": [
        "Dashboard metrics",
        "Charts",
        "Filters",
        "Cohort comparison",
        "Program comparison",
        "CSV",
        "Excel",
        "PDF"
      ]
    },
    {
      "id": 7,
      "name": "React Admin",
      "tasks": [
        "Auth",
        "Dashboard",
        "Alumni",
        "Questionnaire builder",
        "Responses",
        "Analytics",
        "Reports",
        "Settings"
      ]
    },
    {
      "id": 8,
      "name": "Flutter Alumni",
      "tasks": [
        "Auth",
        "Profile",
        "Survey",
        "Draft/resume",
        "Notifications",
        "Jobs",
        "Applications",
        "Events"
      ]
    },
    {
      "id": 9,
      "name": "Engagement",
      "tasks": [
        "Career center",
        "Job board",
        "Applications",
        "Events",
        "Notifications",
        "Networking foundation"
      ]
    },
    {
      "id": 10,
      "name": "Commercialization",
      "tasks": [
        "Plans",
        "Limits",
        "Custom branding",
        "Usage metrics",
        "Feature gating"
      ]
    },
    {
      "id": 11,
      "name": "Production Hardening",
      "tasks": [
        "Security review",
        "Performance",
        "Indexes",
        "Rate limiting",
        "Backup strategy",
        "Error logging",
        "Shared hosting deployment"
      ]
    }
  ],
  "commands": {
    "backend": [
      "cd D:\\laragon\\www\\Tracerconnect\\backend",
      "composer install",
      "php artisan key:generate",
      "php artisan migrate",
      "php artisan serve"
    ],
    "frontend": [
      "cd D:\\laragon\\www\\Tracerconnect\\frontend",
      "npm install",
      "npm run dev",
      "npm run build"
    ],
    "mobile": [
      "cd D:\\laragon\\www\\Tracerconnect\\mobile",
      "flutter pub get",
      "flutter analyze",
      "flutter run"
    ]
  },
  "final_acceptance": [
    "Landing page profesional, responsive, dan menjual produk.",
    "React terhubung ke Laravel API.",
    "Flutter terhubung ke Laravel API.",
    "Authentication terintegrasi.",
    "RBAC dan permission backend berjalan.",
    "Tenant/institution isolation aman.",
    "Questionnaire dinamis dapat dibuat.",
    "Alumni dapat mengisi, menyimpan, dan melanjutkan tracer.",
    "Analytics tersedia.",
    "Report export tersedia.",
    "Career center dapat dikembangkan tanpa merombak core tracer.",
    "Frontend dapat dibuild ke static hosting/shared hosting.",
    "Backend dapat berjalan pada shared hosting tanpa VPS-specific dependency.",
    "Tidak ada secret hardcoded.",
    "Error handling tersedia di semua client.",
    "Project dapat dikembangkan secara bertahap tanpa merusak modul sebelumnya.",
    "Register benar-benar bekerja melalui API.",
    "Login benar-benar bekerja melalui API.",
    "Logout bekerja.",
    "Password recovery tersedia.",
    "Profile dapat diedit.",
    "Foto profile dapat upload/ganti/hapus.",
    "React dan Flutter menggunakan multipart upload untuk avatar.",
    "Avatar kompatibel shared hosting.",
    "Tidak ada authentication mock pada production flow."
  ]
}
