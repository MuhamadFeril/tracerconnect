// Types mirroring the TracerAlumni backend API (api/v1).

export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
  meta?: PaginationMeta
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  // Cursor pagination for chat (oldest/newest message ids + more flag).
  oldest_cursor?: string | null
  newest_cursor?: string | null
  has_more_older?: boolean
}

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

export interface User {
  id: string
  name: string
  email: string
  institution_id: string | null
  /** Company (PT) name — HRD accounts post vacancies under this name. */
  company_name?: string | null
  institution?: { id: string; name: string } | null
  roles: string[]
  has_password: boolean
  is_active: boolean
  avatar_url?: string | null
  /** Linked alumni profile summary (present for alumni accounts). */
  alumni?: AlumniProfileSummary | null
  // User-level biodata (used when there is no linked alumni record, e.g.
  // admin accounts). Alumni accounts read these from `alumni`.
  gender?: 'male' | 'female' | null
  phone?: string | null
  birth_date?: string | null
  birthplace?: string | null
  birthplace_regency?: string | null
  birthplace_province?: string | null
  address?: string | null
  created_at?: string
  updated_at?: string
}

export interface Role {
  id: string
  name: string
  guard_name: string
  permissions: string[]
}

export interface Permission {
  id: string
  name: string
  guard_name: string
}

export interface LoginResponse {
  token: string
  token_type: string
  expires_in: number
  new_google_user?: boolean
  user: User
}

export interface RegisterResponse {
  requires_verification: boolean
  email: string
}

export interface OtpSentResponse {
  sent: boolean
}

export interface InstitutionOption {
  id: string
  name: string
  code: string | null
  logo_path: string | null
  website: string | null
}

export interface Province {
  id: string
  code: string
  name: string
}

export interface Regency {
  id: string
  code: string
  name: string
}

export interface District {
  id: string
  code: string
  name: string
}

export interface University {
  id: string
  code: string
  name: string
  type: string | null
  province: string | null
  city: string | null
}

export interface StudyProgram {
  id: string
  university_id: string
  name: string
}

export interface SocialLink {
  platform: string
  url: string
}

export interface AlumniProfileSummary {
  id: string
  name: string
  nis_nim: string | null
  nisn: string | null
  socials: SocialLink[] | null
  skills: string[] | null
  gender: 'male' | 'female' | null
  phone: string | null
  birth_date: string | null
  birthplace: string | null
  birthplace_regency: string | null
  birthplace_province: string | null
  address: string | null
  department: string | null
  graduation_year: number | null
  birthplace_label: string | null
  employment_status: string | null
  company_name: string | null
  position: string | null
  business_field: string | null
  business_start_year: number | null
  location: string | null
  work_province: string | null
  work_city: string | null
  study_institution: string | null
  study_program: string | null
  study_entry_year: number | null
  business_name: string | null
  business_address: string | null
  business_province: string | null
  business_city: string | null
}

export interface AlumniHome {
  institution: { id: string; name: string } | null
  alumni: AlumniProfileSummary | null
  announcements: Announcement[]
  events: EventItem[]
  jobs: JobVacancy[]
}

export interface NotificationItem {
  id: string
  title: string
  body: string
  url: string | null
  kind: string
  read_at: string | null
  created_at?: string
}

export type AlumniSurveyResponseStatus = 'not_started' | 'in_progress' | 'submitted' | 'expired'

export interface AlumniSurveyItem {
  id: string
  title: string
  description: string | null
  version: number
  expires_at: string | null
  questions_count: number
  response: {
    id: string | null
    status: AlumniSurveyResponseStatus
    completion: number | null
  }
}

/** Payload returned when starting/resuming/saving/submitting a survey. */
export interface SurveyFill {
  id: string
  survey_id: string
  status: 'in_progress' | 'submitted'
  version: number
  started_at: string | null
  submitted_at: string | null
  survey: SurveyDetail
  answers: Record<string, unknown>
}

export interface Department {
  id: string
  institution_id?: string | null
  name: string
  code: string | null
  alumni_count?: number
}

export interface GraduationYear {
  id: string
  year: number
}

export type EmploymentStatus = 'working' | 'unemployed' | 'entrepreneur' | 'continuing_study'

export interface Alumni {
  id: string
  institution_id: string
  user_id: string | null
  nis_nim: string | null
  name: string
  gender: 'male' | 'female' | null
  birth_date: string | null
  birthplace: string | null
  birthplace_regency: string | null
  birthplace_province: string | null
  birthplace_label: string | null
  email: string | null
  phone: string | null
  address: string | null
  department_id: string | null
  department: string | null
  graduation_year_id: string | null
  graduation_year: number | null
  employment_status: EmploymentStatus | null
  company_name: string | null
  position: string | null
  business_field: string | null
  business_start_year: number | null
  location: string | null
  work_province: string | null
  work_city: string | null
  study_institution: string | null
  study_program: string | null
  study_entry_year: number | null
  business_name: string | null
  business_address: string | null
  business_province: string | null
  business_city: string | null
  created_at?: string
  updated_at?: string
}

export interface Survey {
  id: string
  institution_id: string
  title: string
  description: string | null
  status: 'draft' | 'published'
  version: number
  starts_at: string | null
  expires_at: string | null
  published_at: string | null
  sections_count?: number
  questions_count?: number
  created_at?: string
  updated_at?: string
}

export interface QuestionOption {
  id?: string
  label: string
  value?: string | null
  order?: number
}

export interface QuestionCondition {
  id?: string
  question_id?: string
  condition_question_id: string
  operator: 'equals' | 'not_equals'
  value?: string | null
}

export interface QuestionPayload {
  section_id?: string | null
  type: string
  label: string
  help_text?: string | null
  is_required?: boolean
  order?: number
  settings?: { max?: number } | null
  options?: { label: string; value?: string | null }[]
  conditions?: {
    condition_question_id: string
    operator: 'equals' | 'not_equals'
    value?: string | null
  }[]
}

export interface Question {
  id: string
  survey_id: string
  section_id: string | null
  type: string
  label: string
  help_text: string | null
  is_required: boolean
  order: number
  validation_rules: Record<string, unknown> | null
  settings: { max?: number } | null
  options: QuestionOption[]
  conditions: QuestionCondition[]
}

export interface SurveySection {
  id: string
  survey_id: string
  title: string | null
  description: string | null
  order: number
  questions: Question[]
}

export interface SurveyDetail extends Survey {
  sections: SurveySection[]
  questions: Question[]
}

export type ResponseStatus = 'in_progress' | 'submitted' | 'expired'

export interface SurveyResponseItem {
  id: string
  survey: { id: string; title: string; version: number; expires_at: string | null } | null
  respondent: { id: string; name: string; email: string } | null
  alumni: { id: string; name: string; nis_nim: string | null } | null
  status: ResponseStatus
  version: number
  started_at: string | null
  submitted_at: string | null
  answers_count?: number
  completion?: number | null
}

export interface ResponseAnswer {
  question_id: string
  question: { id: string; label: string; type: string; section_id: string | null } | null
  value: unknown
}

export interface SurveyResponseDetail {
  id: string
  survey: { id: string; title: string; version: number } | null
  respondent: { id: string; name: string; email: string } | null
  alumni: { id: string; name: string; nis_nim: string | null } | null
  status: ResponseStatus
  version: number
  started_at: string | null
  submitted_at: string | null
  answers: ResponseAnswer[]
}

export interface AnalyticsOverview {
  total_alumni: number
  total_respondents: number
  response_rate: number
  employment_rate: number
  entrepreneurship_rate: number
  continuing_study_rate: number
  unemployed_rate: number
  employment_distribution: { status: string; count: number }[]
  alumni_per_year: { year: number; count: number }[]
  responses_per_survey: { title: string; count: number }[]
  recent_responses: {
    id: string
    respondent: string
    survey: string
    submitted_at: string | null
  }[]
}

export type EmploymentStatusKey = 'working' | 'unemployed' | 'entrepreneur' | 'continuing_study' | 'unknown'

export type StatusCounts = { [key in EmploymentStatusKey]: number }

export interface EmploymentAnalytics {
  distribution: { status: string; count: number }[]
  by_year: ({ year: number } & StatusCounts)[]
  by_department: ({ department: string } & StatusCounts)[]
}

export interface SurveyQuestionStat {
  question_id: string
  label: string
  type: string
  response_count: number
  option_counts: { label: string; value: string; count: number }[]
  average: number | null
}

export interface SurveyResults {
  survey: { id: string; title: string }
  total_responses: number
  question_stats: SurveyQuestionStat[]
}

export interface ExecutiveSummary extends AnalyticsOverview {
  institution: string
  generated_at: string
  total_surveys: number
  total_responses: number
}

export type ContentStatus = 'draft' | 'published'

export interface Announcement {
  id: string
  institution_id: string
  title: string
  body: string
  status: ContentStatus
  published_at: string | null
  created_at?: string
  updated_at?: string
}

export interface EventItem {
  id: string
  institution_id: string
  title: string
  description: string | null
  location: string | null
  starts_at: string | null
  ends_at: string | null
  status: ContentStatus
  /** Alumni-facing registration state. */
  registered?: boolean | null
  attended?: boolean | null
  participants_count?: number | null
  created_at?: string
  updated_at?: string
}

export type EmploymentType = 'full_time' | 'part_time' | 'internship' | 'contract' | 'freelance'
export type JobStatus = 'draft' | 'published' | 'closed'

export interface JobVacancy {
  id: string
  institution_id: string
  title: string
  company_name: string
  description: string | null
  location: string | null
  employment_type: EmploymentType | null
  application_link: string | null
  status: JobStatus
  posted_at: string | null
  /** HRD (job creator) user id — enables the chat entry point. */
  created_by?: string | null
  /** Alumni-facing flags (null for staff). */
  bookmarked?: boolean | null
  has_applied?: boolean | null
  my_application?: string | null
  created_at?: string
  updated_at?: string
}

export type JobApplicationStatus =
  | 'submitted'
  | 'reviewing'
  | 'shortlisted'
  | 'interview'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'

export type AcceptanceContractType = 'permanent' | 'full_time' | 'part_time' | 'contract' | 'internship'

/** Hiring result recorded by the hrd when an application is accepted. */
export interface JobAcceptance {
  id: string
  position_offered: string | null
  contract_type: AcceptanceContractType | null
  start_date: string | null
  salary: string | null
  notes: string | null
  decided_by: string | null
  decided_at: string | null
}

export interface CvFormData {
  full_name: string | null
  email: string | null
  phone: string | null
  gender: 'male' | 'female' | null
  birth_date: string | null
  birthplace: string | null
  address: string | null
  department: string | null
  graduation_year: string | null
  education: string | null
  skills: string[] | null
  experience: string | null
  interests: string | null
}

export interface JobApplication {
  id: string
  job_vacancy_id: string
  user_id: string
  status: JobApplicationStatus
  cover_letter: string | null
  cv_data: CvFormData | null
  cv_path: string | null
  portfolio_path: string | null
  applied_at: string | null
  vacancy?: {
    id: string
    title: string
    company_name: string
    employment_type: EmploymentType | null
    location: string | null
  } | null
  alumni?: {
    id: string
    name: string
    department: string | null
    graduation_year: number | null
    employment_status: string | null
    position?: string | null
    company_name?: string | null
  } | null
  acceptance?: JobAcceptance | null
  created_at?: string
  updated_at?: string
}

export interface EventParticipant {
  id: string
  attended: boolean
  registered_at: string | null
  user: { id: string; name: string } | null
  alumni: {
    id: string
    name: string
    department: string | null
    graduation_year: number | null
  } | null
}

/** HRD portal dashboard summary (own vacancies + applicant funnel). */
export interface HrdDashboard {
  vacancies: {
    total: number
    published: number
    draft: number
    closed: number
  }
  applications: {
    total: number
    new: number
    reviewing: number
    shortlisted: number
    interview: number
    accepted: number
    rejected: number
  }
  recent_applications: JobApplication[]
  my_vacancies: (JobVacancy & { applicants_count?: number })[]
}

export type ConnectionStatus = 'none' | 'pending_outgoing' | 'pending_incoming' | 'connected'

export type ConnectionDirection = 'incoming' | 'outgoing'

export interface BlockedUserItem {
  id: string
  created_at: string | null
  user: { id: string; name: string; avatar_url: string | null } | null
}

/** One entry in the alumni networking directory, with the viewer's connection status. */
export interface NetworkingAlumni {
  id: string
  user_id: string
  name: string
  avatar_url: string | null
  department: string | null
  graduation_year: number | null
  employment_status: EmploymentStatus | null
  company_name: string | null
  position: string | null
  business_field: string | null
  business_start_year: number | null
  location: string | null
  work_province: string | null
  work_city: string | null
  study_institution: string | null
  study_program: string | null
  study_entry_year: number | null
  business_name: string | null
  business_address: string | null
  business_province: string | null
  business_city: string | null
  connection: {
    status: ConnectionStatus
    connection_id: string | null
  }
}

/** A connection/request as seen by the current user (other party pre-resolved). */
export interface ConnectionItem {
  id: string
  status: 'pending' | 'connected'
  direction: ConnectionDirection
  created_at: string | null
  user: { id: string; name: string; avatar_url: string | null } | null
  alumni: {
    id: string
    department: string | null
    graduation_year: number | null
    employment_status: EmploymentStatus | null
    company_name: string | null
    position: string | null
    business_field: string | null
    business_start_year: number | null
    location: string | null
    work_province: string | null
    work_city: string | null
    study_institution: string | null
    study_program: string | null
    study_entry_year: number | null
    business_name: string | null
    business_address: string | null
    business_province: string | null
    business_city: string | null
  } | null
}

export type ChatMessageType = 'text' | 'image' | 'file' | 'system'

export interface ChatAttachment {
  name: string
  mime: string
  size: number
  url: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string | null
  type: ChatMessageType
  body: string | null
  attachment: ChatAttachment | null
  is_deleted: boolean
  is_mine: boolean
  created_at: string
  // Local-only optimistic UI state (not sent by the server).
  status?: 'sending' | 'failed'
}

export interface Conversation {
  id: string
  type: string
  subject: string | null
  job_vacancy_id: string | null
  created_at: string
  updated_at: string
  last_message_at: string | null
  other: { id: string; name: string; avatar_url: string | null } | null
  job: { id: string; title: string; company_name: string } | null
  last_message: ChatMessage | null
  unread_count: number
  muted: boolean
}

export interface TracerReport {
  institution: string
  generated_at: string
  total_alumni: number
  total_respondents: number
  response_rate: number
  employment_rate: number
  entrepreneurship_rate: number
  continuing_study_rate: number
  unemployed_rate: number
  distribution: { status: string; count: number }[]
  by_year: ({ year: number } & StatusCounts)[]
  by_department: ({ department: string } & StatusCounts)[]
}

// --- HRD Alumni Directory ---

export interface InstitutionBranding {
  id: string
  name: string
  logo_path: string | null
  logo_url: string | null
  primary_color: string | null
  favicon_path: string | null
  cover_image_path: string | null
  cover_image_url: string | null
  report_header: string | null
  report_footer: string | null
  custom_footer: string | null
  contact_email: string | null
  contact_phone: string | null
  about: string | null
}

export interface DataQualityReport {
  total_alumni: number
  health_score: number
  health_status: string
  missing_fields: {
    email: number
    phone: number
    graduation_year: number
    department: number
    address: number
    employment_status: number
    gender: number
    birth_date: number
  }
  duplicates: {
    total_groups: number
    total_duplicates: number
    groups: { name: string; graduation_year_id: string | null; count: number }[]
  }
  profile_issues: {
    without_user_account: number
    unreachable: number
    incomplete_profiles: number
    stale_profiles: number
  }
  recommendations: {
    priority: 'high' | 'medium' | 'low'
    message: string
  }[]
}
