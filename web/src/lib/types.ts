// Types mirroring the TracerConnect backend API (api/v1).

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
  institution?: { id: string; name: string } | null
  roles: string[]
  is_active: boolean
  avatar_url?: string | null
  /** Linked alumni profile summary (present for alumni accounts). */
  alumni?: AlumniProfileSummary | null
  created_at?: string
  updated_at?: string
}

export type InstitutionStatus = 'active' | 'trial' | 'suspended'

export interface Institution {
  id: string
  name: string
  slug: string
  code: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  logo_path: string | null
  description: string | null
  status: InstitutionStatus
  users_count?: number
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
  user: User
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

export interface AlumniProfileSummary {
  id: string
  name: string
  nis_nim: string | null
  department: string | null
  graduation_year: number | null
  birthplace_label: string | null
  employment_status: string | null
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
  location: string | null
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
  created_at?: string
  updated_at?: string
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
