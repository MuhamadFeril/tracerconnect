{
  "meta": {
    "name": "TracerConnect Master Blueprint",
    "version": "MASTER-QA-FINAL-3.0.0",
    "purpose": "Single source of truth untuk vibe coding backend, frontend, mobile, database, UX, deployment, testing, dan fitur bisnis.",
    "language": "id-ID",
    "status": "QA_AND_SECURITY_RELEASE_GATE"
  },
  "ai_instructions": {
    "role": "Senior Full Stack Architect + Laravel + React + Flutter + Database + QA",
    "workflow": [
      "Inspect repository.",
      "Compare existing code dengan blueprint.",
      "Identify gaps.",
      "Implement per phase.",
      "Run migration, seeder, test, lint, analyze, dan build.",
      "Fix root cause.",
      "Jangan melakukan refactor tidak terkait."
    ],
    "must_not_create": [
      "Chat",
      "Messaging",
      "Direct Message",
      "Follower system",
      "WebSocket chat"
    ],
    "security_rules": [
      "Never hardcode secrets.",
      "Never trust frontend authorization.",
      "Never expose private alumni data without authorization.",
      "Never use fake production data."
    ]
  },
  "product": {
    "name": "TracerConnect",
    "category": "Digital Alumni Intelligence & Engagement Platform",
    "target_clients": [
      "SMK",
      "SMA",
      "Perguruan Tinggi",
      "Lembaga Pendidikan",
      "Dinas Pendidikan"
    ],
    "positioning": "Mengubah data alumni menjadi insight, laporan, career ecosystem, dan alumni engagement.",
    "core_value": [
      "Centralized alumni database",
      "Tracer study",
      "Response monitoring",
      "Analytics",
      "Automated reports",
      "Career center",
      "Alumni networking",
      "Events"
    ],
    "commercial_scope": {
      "subscription": false,
      "packages": false,
      "billing": false,
      "invoice": false,
      "payment_gateway": false,
      "renewal": false,
      "expired_subscription": false,
      "note": "Pricing hanya informasi pada landing page. Tidak ada sistem subscription, paket, billing, atau pembayaran di dalam aplikasi."
    }
  },
  "technology": {
    "backend": {
      "framework": "Laravel 13",
      "php": "PHP 8.3+",
      "database": "MySQL",
      "api": "REST API /api/v1",
      "authentication": "Laravel Sanctum",
      "authorization": "Spatie Laravel Permission",
      "architecture": [
        "MVC",
        "Form Request",
        "API Resource",
        "Service Layer",
        "Policy"
      ],
      "principles": [
        "Thin controller.",
        "Business logic di Service.",
        "Validation di Form Request.",
        "Output melalui API Resource.",
        "Authorization melalui Policy/Permission."
      ],
      "services": [
        "AuthService",
        "ProfileService",
        "AvatarService",
        "RegionService",
        "AlumniService",
        "QuestionnaireService",
        "TracerResponseService",
        "AnalyticsService",
        "ReportService",
        "CareerService",
        "NetworkingService",
        "EventService",
        "ImportService",
        "NotificationService",
        "AuditLogService"
      ],
      "middleware": [
        "api",
        "auth:sanctum",
        "throttle",
        "role/permission middleware"
      ]
    },
    "frontend": {
      "framework": "React",
      "bundler": "Vite",
      "css": "Tailwind CSS",
      "libraries": [
        "React Router",
        "Axios",
        "TanStack Query",
        "React Hook Form",
        "Zod",
        "Lucide React",
        "Recharts"
      ]
    },
    "mobile": {
      "framework": "Flutter",
      "libraries": [
        "Riverpod",
        "GoRouter",
        "Dio",
        "flutter_secure_storage",
        "image_picker"
      ],
      "design": "Material 3"
    }
  },
  "deployment": {
    "development": "Local computer + Laragon + MySQL",
    "production": "Shared hosting",
    "vps_required": false,
    "docker_required": false,
    "redis_required": false,
    "websocket_required": false,
    "production_rules": [
      "HTTPS",
      "APP_ENV=production",
      "APP_DEBUG=false",
      "Correct Laravel document root",
      "Writable storage",
      "Protected .env"
    ]
  },
  "architecture": {
    "backend": [
      "app/Http/Controllers/Auth/",
      "app/Http/Controllers/Admin/",
      "app/Http/Controllers/Alumni/",
      "app/Http/Controllers/Region/",
      "app/Http/Controllers/Questionnaire/",
      "app/Http/Controllers/Analytics/",
      "app/Http/Controllers/Reports/",
      "app/Http/Controllers/Career/",
      "app/Http/Controllers/Networking/",
      "app/Http/Controllers/Messaging/",
      "app/Http/Controllers/Events/",
      "app/Http/Controllers/Profile/",
      "app/Http/Requests/",
      "app/Http/Resources/",
      "app/Models/",
      "app/Services/",
      "app/Policies/",
      "database/migrations/",
      "database/seeders/",
      "database/data/regions/",
      "routes/api.php",
      "tests/Feature/",
      "tests/Unit/"
    ],
    "frontend": [
      "src/assets/",
      "src/components/common/",
      "src/components/landing/",
      "src/components/auth/",
      "src/components/dashboard/",
      "src/components/alumni/",
      "src/components/region/",
      "src/components/questionnaire/",
      "src/components/analytics/",
      "src/components/reports/",
      "src/components/career/",
      "src/components/networking/",
      "src/components/messaging/",
      "src/components/events/",
      "src/components/profile/",
      "src/layouts/",
      "src/pages/",
      "src/hooks/",
      "src/services/",
      "src/lib/",
      "src/routes/",
      "src/context/",
      "src/App.jsx",
      "src/main.jsx"
    ],
    "mobile": [
      "lib/core/constants/",
      "lib/core/network/",
      "lib/core/storage/",
      "lib/core/theme/",
      "lib/core/router/",
      "lib/shared/widgets/",
      "lib/shared/buttons/",
      "lib/shared/cards/",
      "lib/shared/inputs/",
      "lib/features/auth/",
      "lib/features/home/",
      "lib/features/profile/",
      "lib/features/region/",
      "lib/features/questionnaire/",
      "lib/features/career/",
      "lib/features/networking/",
      "lib/features/messaging/",
      "lib/features/events/",
      "lib/features/notifications/",
      "lib/main.dart"
    ],
    "docs": [
      "architecture",
      "api",
      "database",
      "deployment",
      "user-guide"
    ],
    "patterns": [
      "MVC",
      "Form Request",
      "API Resource",
      "Service Layer",
      "Policy",
      "Eloquent"
    ],
    "final_structure": {
      "root": "Tracerconnect/",
      "backend": "backend/",
      "frontend": "frontend/",
      "mobile": "mobile/",
      "docs": "docs/",
      "database_data": "backend/database/data/",
      "rule": "Backend, frontend, dan mobile dipisahkan dengan tanggung jawab yang jelas."
    }
  },
  "access_control": {
    "roles": {
      "super_admin": "Full platform access",
      "institution_admin": "Institution-scoped management",
      "operator": "Operational alumni/tracer management",
      "alumni": "Profile, tracer, career, networking, events",
      "employer": "Company and job management"
    },
    "permissions": [
      "dashboard",
      "institution",
      "alumni",
      "questionnaire",
      "responses",
      "analytics",
      "reports",
      "career",
      "networking",
      "events",
      "notifications",
      "settings",
      "audit"
    ]
  },
  "multi_tenancy": {
    "enabled": true,
    "scope": "institution_id",
    "rules": [
      "Institution admin hanya dapat melihat institusinya.",
      "Super admin dapat melihat seluruh institusi.",
      "Frontend filtering bukan security boundary.",
      "Backend wajib melakukan institution scoping."
    ]
  },
  "database": {
    "entities": {
      "auth": [
        "users",
        "roles",
        "permissions",
        "model_has_roles",
        "model_has_permissions"
      ],
      "institution": [
        "institutions",
        "campuses",
        "departments",
        "programs",
        "cohorts"
      ],
      "regions": [
        "provinces",
        "regencies",
        "districts",
        "villages"
      ],
      "alumni": [
        "alumni_profiles",
        "employment_histories",
        "education_histories"
      ],
      "tracer": [
        "questionnaires",
        "questionnaire_sections",
        "questions",
        "question_options",
        "question_conditions",
        "tracer_responses",
        "tracer_answers"
      ],
      "career": [
        "employers",
        "employer_verifications",
        "jobs",
        "job_categories",
        "job_skills",
        "job_bookmarks",
        "job_applications",
        "application_status_histories",
        "application_attachments"
      ],
      "events": [
        "events",
        "event_registrations",
        "event_attendances"
      ],
      "system": [
        "notifications",
        "audit_logs"
      ],
      "networking": [
        "connections",
        "blocked_users",
        "reports"
      ],
      "chat": [
        "conversations",
        "conversation_participants",
        "messages",
        "message_attachments",
        "message_reads",
        "conversation_reports"
      ]
    },
    "rules": [
      "UUID sesuai kebutuhan.",
      "Foreign key.",
      "Indexes.",
      "Unique constraints.",
      "Timestamps.",
      "Soft delete hanya jika diperlukan.",
      "Jangan gunakan JSON untuk data yang membutuhkan relational analytics."
    ]
  },
  "regions": {
    "required": true,
    "hierarchy": [
      "Provinsi",
      "Kabupaten/Kota",
      "Kecamatan",
      "Desa/Kelurahan"
    ],
    "tables": {
      "provinces": [
        "id UUID",
        "code UNIQUE",
        "name",
        "created_at",
        "updated_at"
      ],
      "regencies": [
        "id UUID",
        "province_id UUID FK",
        "code UNIQUE",
        "name",
        "type",
        "created_at",
        "updated_at"
      ],
      "districts": [
        "id UUID",
        "regency_id UUID FK",
        "code UNIQUE",
        "name",
        "created_at",
        "updated_at"
      ],
      "villages": [
        "id UUID",
        "district_id UUID FK",
        "code UNIQUE",
        "name",
        "type",
        "postal_code",
        "created_at",
        "updated_at"
      ]
    },
    "models": [
      "Province",
      "Regency",
      "District",
      "Village"
    ],
    "seeders": {
      "files": [
        "ProvinceSeeder.php",
        "RegencySeeder.php",
        "DistrictSeeder.php",
        "VillageSeeder.php"
      ],
      "order": [
        "ProvinceSeeder",
        "RegencySeeder",
        "DistrictSeeder",
        "VillageSeeder"
      ],
      "dataset_directory": "database/data/regions/",
      "dataset_files": [
        "provinces.json",
        "regencies.json",
        "districts.json",
        "villages.json"
      ],
      "rules": [
        "Seeder wajib berurutan.",
        "Seeder harus idempotent.",
        "Gunakan upsert/updateOrCreate.",
        "Gunakan batch insert/upsert untuk dataset besar.",
        "Jangan membuat data wilayah palsu.",
        "Gunakan code wilayah sebagai unique business key."
      ]
    },
    "api": [
      "GET /api/v1/regions/provinces",
      "GET /api/v1/regions/provinces/{province}/regencies",
      "GET /api/v1/regions/regencies/{regency}/districts",
      "GET /api/v1/regions/districts/{district}/villages"
    ],
    "ui": {
      "react": "RegionSelector",
      "flutter": "RegionSelector",
      "behavior": [
        "Dependent dropdown",
        "Reset child when parent changes",
        "Loading",
        "Empty",
        "Error",
        "Search"
      ]
    }
  },
  "modules": {
    "P0_core": {
      "landing_page": {
        "required": true,
        "route": "/",
        "sections": [
          "Navbar",
          "Hero",
          "Problem",
          "Solution",
          "Core Features",
          "Tracer Study Workflow",
          "Analytics Preview",
          "Career Center",
          "Alumni Networking",
          "Mobile App Preview",
          "Pricing",
          "FAQ",
          "Final CTA",
          "Footer"
        ],
        "requirements": [
          "Responsive",
          "SEO-friendly",
          "Accessible",
          "Fast loading",
          "CTA Login",
          "CTA Register/Demo"
        ],
        "rules": [
          "Tidak ada testimonial palsu",
          "Tidak ada logo partner palsu",
          "Landing dapat dibuka tanpa authentication"
        ]
      },
      "authentication": {
        "flows": [
          "Register",
          "Login",
          "Logout",
          "Forgot Password",
          "Reset Password",
          "Current User",
          "Protected Route"
        ],
        "endpoints": [
          "POST /api/v1/auth/register",
          "POST /api/v1/auth/login",
          "POST /api/v1/auth/logout",
          "POST /api/v1/auth/forgot-password",
          "POST /api/v1/auth/reset-password",
          "GET /api/v1/me"
        ],
        "profile_endpoints": [
          "PUT /api/v1/me/profile",
          "POST /api/v1/me/avatar",
          "DELETE /api/v1/me/avatar",
          "PUT /api/v1/me/password"
        ],
        "avatar": {
          "formats": [
            "jpg",
            "jpeg",
            "png",
            "webp"
          ],
          "max_size_mb": 2,
          "features": [
            "Preview",
            "Upload",
            "Replace",
            "Delete",
            "Fallback initials"
          ],
          "rules": [
            "Validate MIME",
            "Validate size",
            "Safe filename",
            "Delete old avatar after successful replacement"
          ]
        }
      },
      "alumni": {
        "fields": [
          "id",
          "user_id",
          "institution_id",
          "program_id",
          "cohort_id",
          "graduation_year",
          "phone",
          "province_id",
          "regency_id",
          "district_id",
          "village_id",
          "address",
          "postal_code",
          "employment_status",
          "company",
          "position",
          "industry"
        ],
        "region_validation": [
          "regency_id harus milik province_id",
          "district_id harus milik regency_id",
          "village_id harus milik district_id"
        ]
      },
      "questionnaire": {
        "question_types": [
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
          "location"
        ],
        "features": [
          "Sections",
          "Drag and drop",
          "Required question",
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
      "analytics": {
        "metrics": [
          "Total alumni",
          "Total respondents",
          "Response rate",
          "Employment rate",
          "Unemployment rate",
          "Further study rate",
          "Waiting period",
          "Job relevance",
          "Salary distribution",
          "Industry distribution",
          "Company distribution",
          "Position distribution",
          "Geographical distribution",
          "Cohort comparison",
          "Program comparison"
        ],
        "charts": [
          "KPI cards",
          "Bar",
          "Line",
          "Pie",
          "Donut",
          "Area",
          "Geographical"
        ]
      },
      "reports": {
        "features": [
          "PDF",
          "Excel",
          "CSV",
          "Summary report",
          "Detailed report",
          "Period filter",
          "Cohort filter",
          "Program filter",
          "Region filter"
        ]
      }
    },
    "P1_client_value": {
      "strategy": {
        "core_principle": "Jangan menjual aplikasi sebagai CRUD alumni. Jual hasil: data rapi, response naik, laporan cepat, keputusan berbasis data, dan alumni tetap aktif setelah lulus.",
        "demo_rule": "Setiap fitur yang terlihat client harus menghasilkan nilai yang dapat didemokan dalam 1-3 menit.",
        "priority": [
          "WOW",
          "ROI",
          "Automation",
          "Professional appearance",
          "Ease of use"
        ]
      },
      "wow_dashboard": {
        "name": "Executive Command Center",
        "purpose": "Dashboard yang langsung menunjukkan kondisi alumni dan hasil tracer study.",
        "features": [
          "KPI total alumni",
          "Response rate real-time",
          "Employment rate",
          "Further study rate",
          "Unemployment rate",
          "Average waiting period",
          "Job relevance",
          "Top industries",
          "Top companies",
          "Top provinces",
          "Cohort comparison",
          "Program comparison",
          "Response trend",
          "Quick actions"
        ],
        "client_value": "Pimpinan dapat memahami kondisi alumni tanpa membuka spreadsheet."
      },
      "smart_tracer": {
        "name": "Smart Tracer Study",
        "features": [
          "Questionnaire builder drag-and-drop",
          "Template tracer study siap pakai",
          "Question bank",
          "Conditional questions",
          "Auto-save",
          "Resume later",
          "Progress indicator",
          "Mobile-friendly questionnaire",
          "Preview sebelum publish",
          "Schedule questionnaire",
          "Open/close questionnaire",
          "Response monitoring"
        ],
        "client_value": "Admin tidak perlu membuat sistem kuisioner dari nol setiap periode."
      },
      "response_booster": {
        "name": "Response Booster",
        "features": [
          "Dashboard alumni yang belum mengisi",
          "Progress response",
          "Reminder campaign",
          "Segment berdasarkan angkatan/program",
          "Reminder schedule",
          "Unique questionnaire link",
          "Completion tracking",
          "Response rate target",
          "Campaign performance"
        ],
        "client_value": "Membantu institusi meningkatkan jumlah alumni yang mengisi tracer."
      },
      "one_click_report": {
        "name": "One-Click Tracer Report",
        "features": [
          "Generate laporan otomatis",
          "PDF professional",
          "Excel",
          "CSV",
          "Executive summary",
          "Charts",
          "Tables",
          "Filter periode",
          "Filter angkatan",
          "Filter program",
          "Filter wilayah",
          "Cover institusi",
          "Logo institusi",
          "Tanggal laporan",
          "Generated-by information"
        ],
        "client_value": "Mengurangi pekerjaan manual saat membuat laporan untuk pimpinan, sekolah, kampus, atau dinas."
      },
      "executive_summary": {
        "name": "AI-Ready Executive Summary",
        "implementation_rule": "Jangan mengklaim AI jika belum ada integrasi model. Sediakan structured summary engine terlebih dahulu.",
        "features": [
          "Automatic KPI summary",
          "Top findings",
          "Positive trends",
          "Risk indicators",
          "Areas needing attention",
          "Recommended follow-up actions",
          "Export summary"
        ],
        "example_output": "Response rate periode ini 82%. Program X memiliki employment rate tertinggi. Alumni pada wilayah Y memiliki response rate rendah dan membutuhkan campaign tambahan.",
        "client_value": "Pimpinan mendapatkan ringkasan yang mudah dibaca, bukan sekadar grafik."
      },
      "alumni_360": {
        "name": "Alumni 360 Profile",
        "features": [
          "Biodata",
          "Pendidikan",
          "Riwayat pekerjaan",
          "Status pekerjaan",
          "Industri",
          "Jabatan",
          "Lokasi",
          "Riwayat tracer",
          "Event participation",
          "Job applications",
          "Connection status",
          "Profile completeness"
        ],
        "client_value": "Institusi memiliki satu profil alumni yang jauh lebih berguna daripada data spreadsheet."
      },
      "data_quality_center": {
        "name": "Data Quality Center",
        "features": [
          "Duplicate alumni detection",
          "Incomplete profile detection",
          "Invalid region detection",
          "Missing email detection",
          "Missing graduation year",
          "Data freshness indicator",
          "Validation summary",
          "Import error report",
          "Data cleanup suggestions"
        ],
        "client_value": "Client dapat melihat kualitas database mereka sebelum data digunakan untuk laporan."
      },
      "alumni_engagement": {
        "name": "Alumni Engagement Center",
        "features": [
          "Active alumni count",
          "Inactive alumni count",
          "Last activity",
          "Tracer participation",
          "Event participation",
          "Career activity",
          "Profile completion",
          "Engagement score"
        ],
        "client_value": "Institusi dapat mengetahui apakah hubungan dengan alumni benar-benar berjalan."
      },
      "career_center": {
        "name": "Career Center",
        "features": [
          "Job board",
          "Employer profile",
          "Job posting",
          "Job search",
          "Job filter",
          "Bookmark",
          "Apply",
          "Application status",
          "Application history",
          "Career articles",
          "Recommended jobs based on profile"
        ],
        "client_value": "TracerConnect tidak berhenti setelah kuisioner selesai; alumni mendapatkan manfaat nyata."
      },
      "alumni_network": {
        "name": "Alumni Network",
        "features": [
          "Search alumni",
          "Filter by cohort",
          "Filter by program",
          "Filter by industry",
          "Filter by company",
          "Filter by province/city",
          "View public alumni profile",
          "Connection request",
          "Accept/reject connection",
          "Block",
          "Report"
        ],
        "excluded": [
          "Chat",
          "Direct messaging",
          "Follower system"
        ],
        "client_value": "Membangun jejaring alumni tanpa kompleksitas fitur chat."
      },
      "event_center": {
        "name": "Alumni Event Center",
        "features": [
          "Create event",
          "Event landing page",
          "Registration",
          "Attendance",
          "QR attendance",
          "Participant list",
          "Event reminder",
          "Event history",
          "Certificate-ready attendance export"
        ],
        "client_value": "Institusi dapat menghidupkan kembali komunitas alumni."
      },
      "branding": {
        "name": "White-Label Institution Branding",
        "features": [
          "Institution logo",
          "Institution name",
          "Brand color",
          "Favicon",
          "Report branding",
          "Email branding",
          "Custom landing content",
          "Custom footer"
        ],
        "client_value": "Produk terasa seperti sistem milik client sendiri."
      },
      "smart_search": {
        "name": "Global Alumni Search",
        "features": [
          "Search name",
          "Search email",
          "Search cohort",
          "Search program",
          "Search company",
          "Search position",
          "Search industry",
          "Search region"
        ],
        "client_value": "Data alumni dapat ditemukan dalam hitungan detik."
      },
      "campaign_center": {
        "name": "Tracer Campaign Center",
        "features": [
          "Create campaign",
          "Select target cohort",
          "Select target program",
          "Select alumni segment",
          "Campaign start/end",
          "Progress tracking",
          "Response rate",
          "Incomplete response list",
          "Reminder scheduling",
          "Campaign comparison"
        ],
        "client_value": "Admin dapat mengelola tracer seperti campaign, bukan sekadar membagikan link kuisioner."
      },
      "automation": {
        "name": "Operational Automation",
        "features": [
          "Automatic questionnaire status",
          "Automatic response calculation",
          "Automatic dashboard aggregation",
          "Automatic report generation",
          "Automatic reminder scheduling",
          "Automatic notification",
          "Automatic profile completeness calculation",
          "Automatic data quality checks"
        ],
        "shared_hosting_rule": "Automation harus tetap dapat berjalan pada shared hosting menggunakan Laravel Scheduler/cron bila tersedia; jangan membuat VPS sebagai requirement."
      },
      "security_trust": {
        "name": "Institution Security Center",
        "features": [
          "Role permission",
          "Audit log",
          "Login history",
          "Session management",
          "Export activity log",
          "Data access log",
          "Password security",
          "Rate limiting"
        ],
        "client_value": "Client melihat bahwa aplikasi serius terhadap data alumni."
      },
      "demo_mode": {
        "name": "Client Demo Mode",
        "purpose": "Membantu penjualan tanpa memalsukan data produksi.",
        "features": [
          "Seeded demo institution",
          "Demo alumni",
          "Demo questionnaires",
          "Demo responses",
          "Demo analytics",
          "Demo jobs",
          "Demo events",
          "Reset demo data"
        ],
        "rules": [
          "Data demo diberi label DEMO.",
          "Tidak boleh bercampur dengan production tenant.",
          "Tidak menggunakan identitas orang nyata."
        ]
      },
      "onboarding": {
        "name": "Institution Setup Wizard",
        "steps": [
          "Create institution",
          "Upload logo",
          "Set branding",
          "Import alumni",
          "Configure cohorts/programs",
          "Create tracer template",
          "Preview",
          "Publish"
        ],
        "client_value": "Client dapat melihat proses setup yang sederhana dan terarah."
      },
      "health_score": {
        "name": "Institution Tracer Health Score",
        "metrics": [
          "Data completeness",
          "Response rate",
          "Profile completeness",
          "Alumni engagement",
          "Report readiness"
        ],
        "output": [
          "Score",
          "Status",
          "Main issues",
          "Recommended actions"
        ],
        "client_value": "Pimpinan mendapatkan indikator sederhana tentang kondisi sistem."
      }
    },
    "career": {
      "priority": "P1",
      "purpose": "Career ecosystem untuk alumni dan employer.",
      "employer_features": [
        "Register/login employer",
        "Company profile",
        "Company verification",
        "Create/edit/publish/close job",
        "Job requirements",
        "Manage applicants",
        "View applicant profile",
        "Shortlist/reject applicant",
        "Update application status"
      ],
      "alumni_features": [
        "Job search",
        "Keyword/location/industry/employment filters",
        "Job detail",
        "Bookmark job",
        "Apply job",
        "Upload CV",
        "Upload portfolio",
        "Cover letter",
        "Application history",
        "Application status",
        "Withdraw application",
        "Job recommendations"
      ],
      "application_statuses": [
        "submitted",
        "reviewing",
        "shortlisted",
        "interview",
        "accepted",
        "rejected",
        "withdrawn"
      ]
    },
    "networking": {
      "name": "Alumni Networking",
      "concept": "Connection-based networking, bukan follower-based.",
      "features": [
        "Search alumni",
        "Filter alumni",
        "View profile",
        "Connection request",
        "Accept",
        "Reject",
        "Cancel",
        "Remove connection",
        "Block",
        "Report",
        "Start chat after connection accepted"
      ],
      "rules": [
        "Networking menggunakan sistem connection, bukan follower.",
        "Connection hanya digunakan untuk membangun jejaring alumni.",
        "Tidak ada fitur chat atau direct messaging.",
        "Semua aturan connection dipaksa oleh backend."
      ]
    },
    "events": {
      "features": [
        "Create event",
        "Event detail",
        "Registration",
        "Attendance",
        "Reminder",
        "Announcement",
        "Event history"
      ]
    },
    "notifications": {
      "channels": [
        "In-app",
        "Email",
        "Push mobile"
      ],
      "events": [
        "Tracer published",
        "Tracer reminder",
        "Connection request",
        "Connection accepted",
        "New job",
        "Application update",
        "New event",
        "Event reminder",
        "System announcement"
      ]
    },
    "commercial": {
      "status": "excluded",
      "features": [],
      "landing_page_only": [
        "Pricing information",
        "Request demo",
        "Contact sales"
      ]
    },
    "chat": {
      "priority": "P1",
      "purpose": "Komunikasi terkontrol antara alumni, employer, dan institution.",
      "supported_conversations": [
        "Alumni-Alumni setelah connection accepted",
        "Alumni-Employer terkait job/application",
        "Institution Admin-Alumni",
        "Employer-Applicant"
      ],
      "features": [
        "Conversation list",
        "Create conversation",
        "Send/receive message",
        "Timestamp",
        "Read status",
        "Unread count",
        "Pagination",
        "Delete own message",
        "Block",
        "Report",
        "Mute conversation",
        "Search conversation"
      ],
      "message_types": [
        "text",
        "image",
        "file",
        "system"
      ],
      "security": [
        "Authorization per conversation",
        "Blocked users cannot initiate messages",
        "Secure file validation",
        "Rate limiting",
        "Message ownership validation",
        "Report abuse mechanism"
      ],
      "transport": {
        "initial": "REST API polling",
        "future_optional": "WebSocket/Pusher-compatible realtime",
        "shared_hosting_rule": "WebSocket bukan requirement versi awal."
      }
    }
  },
  "frontend": {
    "pages": {
      "public_pages": [
        "/",
        "/features",
        "/pricing",
        "/faq",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password"
      ],
      "admin_pages": [
        "/dashboard",
        "/institution",
        "/alumni",
        "/alumni/import",
        "/questionnaires",
        "/questionnaires/create",
        "/questionnaires/:id/edit",
        "/questionnaires/:id/responses",
        "/analytics",
        "/reports",
        "/career/jobs",
        "/career/employers",
        "/networking",
        "/events",
        "/notifications",
        "/settings",
        "/audit-logs"
      ],
      "alumni_pages": [
        "/home",
        "/profile",
        "/profile/edit",
        "/tracer",
        "/tracer/:id",
        "/career",
        "/career/jobs/:id",
        "/applications",
        "/networking",
        "/networking/:id",
        "/events",
        "/events/:id",
        "/notifications",
        "/settings"
      ],
      "components_required": [
        "Button",
        "Input",
        "Textarea",
        "Select",
        "Combobox",
        "Modal",
        "Drawer",
        "Toast",
        "Alert",
        "Badge",
        "Avatar",
        "Table",
        "Pagination",
        "Skeleton",
        "EmptyState",
        "ErrorState",
        "ConfirmDialog",
        "DatePicker",
        "FileUploader",
        "RegionSelector",
        "StatCard",
        "ChartCard",
        "FilterBar"
      ],
      "rules": [
        "TanStack Query untuk server state.",
        "React Hook Form untuk form.",
        "Axios instance terpusat.",
        "API URL dari environment.",
        "Semua API state memiliki loading, error, empty, success."
      ],
      "career": [
        "/jobs",
        "/jobs/{id}",
        "/applications",
        "/applications/{id}",
        "/employer",
        "/employer/jobs",
        "/employer/jobs/create",
        "/employer/jobs/{id}/edit",
        "/employer/jobs/{id}/applications"
      ],
      "chat": [
        "/chat",
        "/chat/{conversationId}"
      ]
    },
    "components": [
      "Button",
      "Input",
      "Textarea",
      "Select",
      "Combobox",
      "Modal",
      "Drawer",
      "Toast",
      "Alert",
      "Badge",
      "Avatar",
      "Table",
      "Pagination",
      "Skeleton",
      "EmptyState",
      "ErrorState",
      "ConfirmDialog",
      "DatePicker",
      "FileUploader",
      "RegionSelector",
      "StatCard",
      "ChartCard",
      "FilterBar"
    ],
    "rules": [
      "TanStack Query untuk server state.",
      "React Hook Form untuk form.",
      "Axios instance terpusat.",
      "API URL dari environment.",
      "Semua API state memiliki loading, error, empty, success."
    ]
  },
  "mobile": {
    "architecture": "Feature-first + repository/service separation",
    "layers": [
      "presentation",
      "providers",
      "domain",
      "data",
      "network"
    ],
    "components_required": [
      "AppButton",
      "AppTextField",
      "AppDropdown",
      "AppCard",
      "AppAvatar",
      "AppLoading",
      "AppError",
      "AppEmpty",
      "RegionSelector",
      "QuestionRenderer",
      "QuestionProgress",
      "JobCard",
      "EventCard",
      "ConnectionCard"
    ],
    "rules": [
      "Token menggunakan secure storage.",
      "Dio client terpusat.",
      "Handle 401 secara global.",
      "API URL configurable.",
      "Tidak menggunakan localhost untuk production."
    ],
    "career_features": [
      "Job List",
      "Job Detail",
      "Apply Job",
      "My Applications",
      "Application Detail",
      "Employer Jobs"
    ],
    "chat_features": [
      "Conversation List",
      "Chat Detail",
      "New Conversation"
    ]
  },
  "api": {
    "prefix": "/api/v1",
    "response": {
      "success": "boolean",
      "message": "string",
      "data": "object|array|null",
      "errors": "object|null",
      "meta": "object|null"
    },
    "domains": {
      "auth": [
        "POST /auth/register",
        "POST /auth/login",
        "POST /auth/logout",
        "POST /auth/forgot-password",
        "POST /auth/reset-password",
        "GET /me"
      ],
      "profile": [
        "GET /me/profile",
        "PUT /me/profile",
        "POST /me/avatar",
        "DELETE /me/avatar",
        "PUT /me/password"
      ],
      "regions": [
        "GET /regions/provinces",
        "GET /regions/provinces/{id}/regencies",
        "GET /regions/regencies/{id}/districts",
        "GET /regions/districts/{id}/villages"
      ],
      "alumni": [
        "GET /alumni",
        "GET /alumni/{id}",
        "POST /alumni",
        "PUT /alumni/{id}",
        "DELETE /alumni/{id}",
        "POST /alumni/import",
        "GET /alumni/export"
      ],
      "questionnaires": [
        "GET /questionnaires",
        "POST /questionnaires",
        "GET /questionnaires/{id}",
        "PUT /questionnaires/{id}",
        "DELETE /questionnaires/{id}",
        "POST /questionnaires/{id}/publish",
        "POST /questionnaires/{id}/close"
      ],
      "responses": [
        "GET /questionnaires/{id}/responses",
        "POST /questionnaires/{id}/responses",
        "PUT /responses/{id}"
      ],
      "analytics": [
        "GET /analytics/overview",
        "GET /analytics/employment",
        "GET /analytics/programs",
        "GET /analytics/cohorts",
        "GET /analytics/regions"
      ],
      "reports": [
        "GET /reports/tracer",
        "GET /reports/alumni",
        "GET /reports/analytics"
      ],
      "career": [
        "GET /jobs",
        "POST /jobs",
        "GET /jobs/{id}",
        "PUT /jobs/{id}",
        "DELETE /jobs/{id}",
        "POST /jobs/{id}/publish",
        "POST /jobs/{id}/close",
        "POST /jobs/{id}/bookmark",
        "DELETE /jobs/{id}/bookmark",
        "POST /jobs/{id}/apply",
        "GET /applications",
        "GET /applications/{id}",
        "PUT /applications/{id}/withdraw",
        "GET /employer/jobs",
        "GET /employer/jobs/{id}/applications",
        "PUT /applications/{id}/status",
        "GET /employers/profile",
        "PUT /employers/profile"
      ],
      "networking": [
        "GET /networking/alumni",
        "GET /networking/alumni/{id}",
        "POST /networking/connections",
        "POST /networking/connections/{id}/accept",
        "POST /networking/connections/{id}/reject",
        "DELETE /networking/connections/{id}",
        "POST /networking/block",
        "POST /networking/report"
      ],
      "events": [
        "GET /events",
        "GET /events/{id}",
        "POST /events",
        "PUT /events/{id}",
        "DELETE /events/{id}",
        "POST /events/{id}/register",
        "DELETE /events/{id}/register"
      ],
      "chat": [
        "GET /conversations",
        "POST /conversations",
        "GET /conversations/{id}",
        "GET /conversations/{id}/messages",
        "POST /conversations/{id}/messages",
        "DELETE /messages/{id}",
        "POST /conversations/{id}/read",
        "POST /conversations/{id}/mute",
        "POST /conversations/{id}/report"
      ]
    }
  },
  "file_management": {
    "avatar": {
      "max_mb": 2,
      "extensions": [
        "jpg",
        "jpeg",
        "png",
        "webp"
      ]
    },
    "documents": {
      "max_mb": 5,
      "extensions": [
        "pdf",
        "jpg",
        "jpeg",
        "png"
      ]
    },
    "rules": [
      "MIME validation server-side.",
      "Size validation server-side.",
      "Safe generated filename.",
      "Jangan percaya original filename.",
      "Reject executable extensions.",
      "Private files harus melalui authorization."
    ]
  },
  "import_export": {
    "flow": [
      "Upload",
      "Validate extension",
      "Validate header",
      "Preview",
      "Validate rows",
      "Show errors",
      "Confirm",
      "Process",
      "Summary"
    ],
    "formats": [
      "xlsx",
      "csv"
    ],
    "duplicate_strategy": [
      "Detect duplicate.",
      "Jangan silently overwrite data penting.",
      "Tampilkan created, updated, skipped, failed."
    ],
    "exports": [
      "Alumni",
      "Tracer responses",
      "Analytics",
      "Career",
      "Event attendance"
    ]
  },
  "audit": {
    "fields": [
      "id",
      "user_id",
      "institution_id",
      "action",
      "entity_type",
      "entity_id",
      "old_values",
      "new_values",
      "ip_address",
      "user_agent",
      "created_at"
    ],
    "actions": [
      "login",
      "logout",
      "create",
      "update",
      "delete",
      "publish",
      "export",
      "import",
      "permission_change"
    ]
  },
  "security": {
    "mandatory": [
      "Sanctum",
      "Spatie Permission",
      "Policies",
      "Form Requests",
      "Rate limiting",
      "Secure file upload",
      "UUID",
      "Audit logs",
      "HTTPS in production",
      "No secrets in repository",
      "No password logging"
    ],
    "privacy": [
      "Do not expose alumni contact data unnecessarily.",
      "Backend controls connection permissions.",
      "Backend controls message permissions.",
      "Profile visibility should be configurable where appropriate."
    ],
    "pre_deployment_external_security_audit": {
      "mandatory": true,
      "timing": "Setelah semua fitur berjalan tanpa error dan sebelum deploy ke shared hosting.",
      "deployment_gate": "BLOCKED jika terdapat temuan Critical atau High yang belum diperbaiki.",
      "checks": {
        "sql_injection": [
          "Audit Eloquent, Query Builder, DB::raw, whereRaw, orderByRaw, selectRaw, dan raw SQL.",
          "Pastikan input user tidak digabung langsung ke query.",
          "Uji search, filter, sort, pagination, login, import, dan endpoint ID."
        ],
        "cors": [
          "Whitelist origin frontend.",
          "Jangan gunakan wildcard untuk endpoint authenticated.",
          "Audit credentials, preflight OPTIONS, dan origin validation."
        ],
        "xss": [
          "Escape seluruh user-generated content.",
          "Audit dangerouslySetInnerHTML dan HTML mentah.",
          "Uji profil, bio, chat, job description, nama perusahaan, dan tracer."
        ],
        "dos_ddos": [
          "Rate limit login, register, password reset, API sensitif, chat, upload, import, dan report generation.",
          "Batasi request body, file size, pagination, dan endpoint mahal.",
          "Gunakan proteksi hosting/CDN/WAF bila tersedia."
        ],
        "mitm": [
          "Production wajib HTTPS/TLS valid.",
          "Jangan kirim credential/token melalui HTTP.",
          "Gunakan Secure, HttpOnly, dan SameSite cookie sesuai arsitektur."
        ],
        "url_interpretation": [
          "Audit open redirect pada redirect, next, return, callback, dan URL sejenis.",
          "Allowlist destination URL.",
          "Validasi URL dari user sebelum digunakan."
        ],
        "session_hijacking": [
          "Regenerate session setelah login dan perubahan privilege.",
          "Invalidate session/token saat logout.",
          "Gunakan expiration/rotation.",
          "Audit token leakage di URL, log, error, dan frontend."
        ],
        "brute_force": [
          "Rate limit login dan password reset.",
          "Gunakan throttling/backoff.",
          "Jangan membocorkan apakah account/email terdaftar.",
          "Monitor percobaan login berulang."
        ],
        "authorization_idor_bola": [
          "Uji IDOR/BOLA pada semua endpoint.",
          "Institution admin tidak boleh mengakses institution lain.",
          "Employer hanya boleh mengakses lowongannya sendiri.",
          "Alumni hanya boleh mengakses application dan conversation yang berhak diakses."
        ],
        "csrf": [
          "Audit seluruh state-changing request.",
          "Pastikan CSRF protection sesuai arsitektur authentication."
        ],
        "file_upload": [
          "Whitelist MIME dan extension.",
          "Batasi ukuran.",
          "Generate nama file server-side.",
          "Pastikan upload tidak dapat dieksekusi sebagai script.",
          "Audit foto profile, CV, portfolio, chat attachment, import, dan report."
        ],
        "security_headers": [
          "CSP jika kompatibel.",
          "X-Content-Type-Options.",
          "Referrer-Policy.",
          "Frame protection/frame-ancestors.",
          "Permissions-Policy.",
          "HSTS setelah HTTPS production siap."
        ],
        "secrets": [
          ".env tidak public.",
          "APP_KEY dan secret tidak masuk Git.",
          "API key tidak hardcode di React/Flutter.",
          "Credential production berbeda dari local."
        ],
        "information_disclosure": [
          "APP_DEBUG=false.",
          "Jangan expose stack trace, SQL query, internal path, token, atau credential."
        ],
        "dependencies": [
          "Audit Composer dependencies.",
          "Audit npm dependencies.",
          "Audit Flutter packages.",
          "Perbaiki vulnerability yang relevan sebelum production."
        ],
        "database": [
          "Database user menggunakan least privilege.",
          "Backup tersedia.",
          "Backup tidak berada di public directory."
        ]
      },
      "testing": {
        "environment": "Hanya test pada localhost, staging, atau sistem yang memang memiliki izin.",
        "methods": [
          "Static code review",
          "Dependency audit",
          "API security testing",
          "Authentication testing",
          "Authorization/IDOR testing",
          "Input validation testing",
          "File upload testing",
          "Rate-limit testing",
          "Browser security testing",
          "Production configuration review"
        ],
        "optional_tools": [
          "OWASP ZAP",
          "Burp Suite",
          "Browser DevTools",
          "composer audit",
          "npm audit",
          "flutter analyze"
        ]
      },
      "final_checklist": [
        "SQL Injection PASS",
        "CORS PASS",
        "XSS PASS",
        "DoS/DDoS controls PASS",
        "MITM/TLS PASS",
        "URL interpretation/open redirect PASS",
        "Session hijacking PASS",
        "Brute force PASS",
        "Authentication/Authorization/IDOR PASS",
        "CSRF PASS",
        "File upload security PASS",
        "Security headers PASS",
        "Secrets/.env PASS",
        "Dependency audit PASS",
        "Production configuration PASS",
        "No unresolved Critical/High findings"
      ]
    }
  },
  "testing": {
    "backend": [
      "Clean migration",
      "Clean seeding",
      "Seeder rerun",
      "Auth",
      "Profile",
      "Avatar",
      "Regions",
      "Alumni",
      "Questionnaire",
      "Tracer response",
      "Analytics",
      "Reports",
      "Career",
      "Networking",
      "Events",
      "Permissions"
    ],
    "frontend": [
      "Build",
      "Route guard",
      "Auth forms",
      "RegionSelector",
      "Questionnaire",
      "Analytics",
      "Responsive UI",
      "API errors"
    ],
    "mobile": [
      "flutter analyze",
      "Auth",
      "Profile",
      "RegionSelector",
      "Questionnaire",
      "Career",
      "Networking",
      "Events",
      "API errors"
    ]
  },
  "business": {
    "sales_positioning": {
      "avoid": [
        "Aplikasi CRUD alumni.",
        "Aplikasi kuisioner online biasa.",
        "Aplikasi database alumni."
      ],
      "position_as": [
        "Digital Alumni Intelligence Platform.",
        "Tracer Study Management System.",
        "Alumni Engagement Platform.",
        "Career and Alumni Ecosystem."
      ],
      "main_promise": "Dari data alumni yang tersebar menjadi sistem terpusat yang menghasilkan insight, laporan, engagement, dan manfaat karier."
    },
    "demo_flow": [
      "1. Buka Landing Page.",
      "2. Tunjukkan branding institusi.",
      "3. Login sebagai admin.",
      "4. Tampilkan Executive Command Center.",
      "5. Buka Alumni 360.",
      "6. Tunjukkan Data Quality Center.",
      "7. Buat questionnaire dari template.",
      "8. Tampilkan preview questionnaire.",
      "9. Tunjukkan Response Booster.",
      "10. Tampilkan analytics setelah response masuk.",
      "11. Klik One-Click Report.",
      "12. Buka Career Center.",
      "13. Buka Alumni Network.",
      "14. Tampilkan Event Center.",
      "15. Tunjukkan Audit Log.",
      "16. Tunjukkan Institution Branding."
    ],
    "product_modules": [
      "Tracer Study",
      "Alumni Management",
      "Analytics",
      "Automated Reports",
      "Career Center",
      "Job Board",
      "Job Application",
      "Alumni Networking",
      "Chat",
      "Event Center",
      "Data Quality",
      "Institution Branding"
    ]
  },
  "development_phases": [
    {
      "phase": 1,
      "name": "Foundation",
      "priority": "P0"
    },
    {
      "phase": 2,
      "name": "Landing Page + Branding",
      "priority": "P0"
    },
    {
      "phase": 3,
      "name": "Authentication + Profile",
      "priority": "P0"
    },
    {
      "phase": 4,
      "name": "Region + Institution + Alumni",
      "priority": "P0"
    },
    {
      "phase": 5,
      "name": "Tracer Study + Questionnaire Builder",
      "priority": "P0"
    },
    {
      "phase": 6,
      "name": "Response Booster + Analytics + Reports",
      "priority": "P0"
    },
    {
      "phase": 7,
      "name": "Career Center + Employer + Job Board",
      "priority": "P1"
    },
    {
      "phase": 8,
      "name": "Job Application + Applicant Management",
      "priority": "P1"
    },
    {
      "phase": 9,
      "name": "Networking + Chat",
      "priority": "P1"
    },
    {
      "phase": 10,
      "name": "Events + Notifications + Engagement",
      "priority": "P1"
    },
    {
      "phase": 11,
      "name": "Flutter Mobile Completion",
      "priority": "P1"
    },
    {
      "phase": 12,
      "name": "Security + Testing + Shared Hosting",
      "priority": "P0"
    },
    {
      "phase": 13,
      "name": "Mandatory Pre-Deployment External Security Audit",
      "priority": "P0",
      "gate": true
    }
  ],
  "definition_of_done": {
    "backend": [
      "Clean migration works.",
      "Seeders work and are rerunnable.",
      "Authorization tested.",
      "Validation tested."
    ],
    "frontend": [
      "Production build succeeds.",
      "Routes work.",
      "Loading/error/empty/success states exist.",
      "Responsive."
    ],
    "mobile": [
      "flutter analyze passes.",
      "Authentication works.",
      "API errors handled.",
      "Production API is configurable."
    ],
    "deployment": [
      "Local setup documented.",
      "Shared hosting setup documented.",
      "Environment variables documented.",
      "Storage strategy documented."
    ]
  },
  "excluded_features": {
    "subscription": false,
    "package_management": false,
    "billing": false,
    "invoice": false,
    "payment_gateway": false,
    "renewal": false
  },
  "features_final": {
    "public": [
      "Landing page",
      "Feature showcase",
      "Tracer workflow explanation",
      "Analytics preview",
      "Career preview",
      "Alumni networking preview",
      "Event preview",
      "FAQ",
      "Request demo",
      "Contact"
    ],
    "admin": [
      "Dashboard",
      "Institution management",
      "Institution branding",
      "Admin/operator management",
      "Alumni management",
      "Import CSV/XLSX",
      "Export data",
      "Region management through seeded master data",
      "Questionnaire builder",
      "Question bank",
      "Conditional questions",
      "Tracer campaign",
      "Response booster",
      "Response monitoring",
      "Analytics",
      "Executive summary",
      "One-click PDF report",
      "Excel/CSV reports",
      "Data quality center",
      "Audit logs",
      "Notifications",
      "Career center management",
      "Employer management",
      "Job management",
      "Event management",
      "Attendance management",
      "Demo mode"
    ],
    "alumni": [
      "Register",
      "Login",
      "Forgot/reset password",
      "Profile",
      "Profile photo upload/update/delete",
      "Profile completeness",
      "Region selector",
      "Tracer study",
      "Auto-save",
      "Resume questionnaire",
      "Questionnaire progress",
      "Submit tracer",
      "Career center",
      "Job search",
      "Bookmark job",
      "Apply job",
      "Application status",
      "Alumni discovery",
      "Connection request",
      "Accept/reject connection",
      "Remove connection",
      "Block/report",
      "Events",
      "Event registration",
      "QR attendance",
      "Notifications"
    ],
    "employer": [
      "Register/login",
      "Company profile",
      "Job posting",
      "Edit/close job",
      "Applicant list",
      "Application status"
    ],
    "excluded": [
      "Chat",
      "Direct messaging",
      "Follower system",
      "Subscription",
      "Package management",
      "Billing",
      "Invoice",
      "Payment gateway",
      "Renewal system"
    ]
  },
  "final_business_flow": [
    "Landing Page",
    "Client Onboarding",
    "Create Institution",
    "Institution Setup Wizard",
    "Import Alumni",
    "Configure Program/Cohort/Region",
    "Build Questionnaire",
    "Publish Tracer",
    "Alumni Register/Login",
    "Complete Profile",
    "Fill Tracer",
    "Response Booster",
    "Analytics",
    "Executive Dashboard",
    "One-Click Reports",
    "Career Center",
    "Employer Publishes Job",
    "Alumni Finds Job",
    "Alumni Applies",
    "Employer Reviews Application",
    "Application Status Updates",
    "Networking",
    "Connection Accepted",
    "Chat",
    "Events",
    "Continuous Alumni Engagement"
  ],
  "master_rules": [
    "No subscription, package, billing, invoice, or payment gateway.",
    "Chat is active.",
    "Job board and job application are active.",
    "Employer module is active.",
    "Backend enforces all chat and application authorization.",
    "Initial chat transport uses REST polling for shared hosting.",
    "WebSocket is optional future enhancement.",
    "Laravel is the central REST API.",
    "React + Tailwind is the web frontend.",
    "Flutter is the mobile app.",
    "MySQL is the primary database.",
    "Region Indonesia is seeded from structured data.",
    "Shared hosting is the initial production target.",
    "WAJIB melakukan security audit sebelum shared-hosting deployment; jika ada Critical/High yang belum diperbaiki, deployment harus diblokir.",
    "QA dan security audit adalah release gate wajib.",
    "Jangan mengklaim aplikasi 100% tidak dapat diretas.",
    "Jangan melewati test hanya agar status PASS.",
    "Setiap fix wajib diretest dan menjalani regression test.",
    "Authorization data wajib ditegakkan backend.",
    "Critical/High unresolved memblokir deployment.",
    "Clean install, migration, seeding, build, dan critical workflows wajib berhasil."
  ],
  "qa_release_gate": {
    "mandatory": true,
    "goal": "Verifikasi fungsionalitas, keamanan, stabilitas, dan kesiapan release sebelum deployment.",
    "principles": [
      "Jangan menyatakan PASS atau FIXED tanpa verifikasi.",
      "Setiap bug diperbaiki lalu diretest.",
      "Regression test wajib setelah perubahan.",
      "Security testing hanya pada sistem sendiri atau yang memiliki izin.",
      "Tidak ada sistem yang dapat dijamin 100% bebas serangan; target release adalah tidak ada Critical/High unresolved dan attack surface diminimalkan."
    ],
    "release_states": [
      "DISCOVERY",
      "IMPLEMENTATION",
      "QA",
      "SECURITY_AUDIT",
      "RETEST",
      "REGRESSION",
      "RELEASE_CANDIDATE",
      "READY_FOR_DEPLOYMENT"
    ],
    "block_release_if": [
      "Critical vulnerability ditemukan.",
      "High vulnerability belum diperbaiki atau dimitigasi.",
      "Authentication bypass.",
      "Authorization/IDOR/BOLA memungkinkan akses data tidak sah.",
      "SQL injection exploitable.",
      "Arbitrary file upload atau remote code execution.",
      "Production secret terekspos.",
      "Data sensitif dapat diakses tanpa authorization.",
      "Production build gagal.",
      "Clean database migration/seeding gagal.",
      "Critical workflow gagal."
    ]
  },
  "qa_matrix": {
    "frontend_react_tailwind": [
      "Landing page",
      "Responsive layout",
      "Register/login/logout",
      "Forgot/reset password",
      "Profile",
      "Profile photo",
      "Institution dashboard",
      "Alumni management",
      "Region selector",
      "Questionnaire builder",
      "Tracer filling",
      "Analytics",
      "Reports",
      "Jobs",
      "Job apply",
      "Application tracking",
      "Employer dashboard",
      "Networking",
      "Chat",
      "Events",
      "Notifications",
      "Loading/error/empty/success states",
      "Validation",
      "Pagination/filter/search"
    ],
    "backend_laravel_api": [
      "Routes",
      "Controllers",
      "Form Requests",
      "Policies/Gates",
      "Middleware",
      "Models",
      "Migrations",
      "Seeders",
      "Factories",
      "Services",
      "Storage",
      "Authentication",
      "Authorization",
      "Validation",
      "Pagination",
      "Filtering",
      "Search",
      "Import/export",
      "Reports",
      "Notifications",
      "Chat",
      "Job applications",
      "Audit logs"
    ],
    "mobile_flutter": [
      "Authentication",
      "Token lifecycle",
      "Profile",
      "Photo upload",
      "Region selection",
      "Tracer",
      "Auto-save/resume",
      "Submit",
      "Jobs",
      "Job apply",
      "Applications",
      "Networking",
      "Chat",
      "Notifications",
      "Events",
      "Error handling",
      "Secure storage",
      "Release build"
    ]
  },
  "security_release_audit": {
    "mandatory": true,
    "scope": [
      "SQL Injection",
      "XSS",
      "CSRF",
      "CORS",
      "SSRF",
      "Path Traversal",
      "Local/Remote File Inclusion",
      "Arbitrary File Upload",
      "Command Injection",
      "Template Injection",
      "Open Redirect",
      "URL Interpretation",
      "Session Hijacking",
      "Session Fixation",
      "Token Leakage",
      "Brute Force",
      "Credential Stuffing",
      "Rate Limiting",
      "DoS/Resource Exhaustion",
      "DDoS exposure review",
      "IDOR/BOLA",
      "Broken Authentication",
      "Broken Authorization",
      "Privilege Escalation",
      "Mass Assignment",
      "Sensitive Data Exposure",
      "Security Headers",
      "HTTPS/TLS",
      "Cookie Security",
      "Secrets Exposure",
      "Dependency Vulnerabilities",
      "Database Exposure",
      "Backup Exposure",
      "Debug/Error Disclosure",
      "Race Conditions",
      "File Access Control",
      "Chat Authorization",
      "Job Application Privacy"
    ],
    "tests": {
      "authentication": [
        "Rate limiting",
        "Password policy",
        "Reset-token expiry and single-use",
        "Session regeneration after login",
        "Logout invalidation",
        "Account-enumeration resistance",
        "No token/credential in URL or logs"
      ],
      "authorization": [
        "Horizontal privilege escalation",
        "Vertical privilege escalation",
        "Cross-institution access",
        "Cross-employer application access",
        "Cross-user profile modification",
        "Cross-conversation access",
        "Unauthorized report download",
        "Unauthorized file download"
      ],
      "input_output": [
        "Validate every external input",
        "Context-appropriate output encoding",
        "Sanitize rich text if enabled",
        "Reject unexpected content types",
        "Limit oversized payloads"
      ],
      "files": [
        "MIME validation",
        "Extension validation",
        "File size limit",
        "Server-generated filenames",
        "Executable upload prevention",
        "Private-file authorization",
        "CV/portfolio/chat/photo isolation"
      ],
      "api": [
        "Authentication on protected endpoints",
        "Authorization on every object",
        "Rate limits",
        "Pagination maximums",
        "Mass-assignment protection",
        "No accidental sensitive-field serialization"
      ]
    }
  },
  "test_strategy": {
    "levels": [
      "Unit tests",
      "Feature/API tests",
      "Integration tests",
      "End-to-end critical workflow tests",
      "Mobile integration tests",
      "Security tests",
      "Regression tests",
      "Production build tests"
    ],
    "critical_workflows": [
      "Register → Login → Profile",
      "Login → Questionnaire → Submit",
      "Admin → Questionnaire → Publish",
      "Admin → Analytics → Report",
      "Alumni → Job → Apply → Track Application",
      "Employer → Job → Review Application → Update Status",
      "Alumni → Connection → Accept → Chat",
      "Admin → Import Alumni → Validate → Persist",
      "Profile → Upload/Update/Delete Photo"
    ],
    "definition_of_done": [
      "Expected behavior passes",
      "Invalid input is safely rejected",
      "Unauthorized access is denied",
      "Error states are handled",
      "No critical API/console errors remain",
      "Security regression passes",
      "Relevant automated tests pass",
      "Manual acceptance checks pass"
    ]
  },
  "data_protection": {
    "principles": [
      "Least privilege",
      "Data minimization",
      "Server-side authorization",
      "Secure defaults",
      "Private-by-default sensitive files",
      "No secrets in source control",
      "No sensitive data in client logs",
      "No sensitive data in error messages"
    ],
    "sensitive_data": [
      "Passwords",
      "Authentication tokens",
      "Reset tokens",
      "CV",
      "Portfolio",
      "Private chat messages",
      "Private applicant data",
      "Institution-private analytics",
      "Private reports"
    ]
  },
  "production_hardening": {
    "shared_hosting": [
      "HTTPS enabled",
      "APP_ENV=production",
      "APP_DEBUG=false",
      "Secure APP_KEY",
      ".env inaccessible publicly",
      "Correct Laravel public directory",
      "Storage configured correctly",
      "Minimal writable directories",
      "Protected database credentials",
      "Protected logs",
      "Protected backups"
    ],
    "web": [
      "Secure cookies",
      "HttpOnly where appropriate",
      "SameSite configured",
      "Restricted CORS",
      "Security headers",
      "Rate limiting",
      "Request size limits",
      "File upload limits"
    ]
  },
  "qa_artifacts_required": {
    "bug_register": "ID, severity, reproduction, expected, actual, fix, retest.",
    "security_register": "ID, severity, affected component, evidence, remediation, retest.",
    "release_checklist": "Final PASS/FAIL checklist.",
    "test_report": "Automated and manual test results.",
    "deployment_report": "Production configuration verification."
  },
  "final_release_certificate": {
    "status": "NOT_READY_UNTIL_VERIFIED",
    "required": [
      "Functional QA PASS",
      "Security Audit PASS",
      "Regression PASS",
      "Production Build PASS",
      "Clean Database Migration PASS",
      "Critical Workflows PASS",
      "No Critical Findings",
      "No Unresolved High Findings",
      "Secrets Audit PASS",
      "Shared Hosting Hardening PASS"
    ],
    "final_rule": "Status READY_FOR_DEPLOYMENT hanya boleh diberikan setelah seluruh gate PASS."
  }
} 