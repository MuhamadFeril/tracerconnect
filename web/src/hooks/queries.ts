import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { api, unwrap, unwrapPage } from '../lib/api'
import { clearSession, setUser } from '../lib/auth'
import type {
  Alumni,
  DataQualityReport,
  InstitutionBranding,
  AlumniHome,
  AlumniSurveyItem,
  AnalyticsOverview,
  BlockedUserItem,
  ChatMessage,
  ConnectionItem,
  Conversation,
  District,
  Announcement,
  Department,
  EmployerAlumniDetail,
  EmployerAlumniListItem,
  EmploymentAnalytics,
  EventItem,
  EventParticipant,
  ExecutiveSummary,
  GraduationYear,
  Institution,
  InstitutionOption,
  EmployerDashboard,
  JobApplication,
  JobVacancy,
  LoginResponse,
  NetworkingAlumni,
  NotificationItem,
  OtpSentResponse,
  Permission,
  Province,
  RegisterResponse,
  Question,
  QuestionPayload,
  Regency,
  Role,
  SocialLink,
  StudyProgram,
  Survey,
  SurveyDetail,
  SurveyFill,
  SurveyResponseDetail,
  SurveyResponseItem,
  SurveyResults,
  SurveySection,
  University,
  User,
} from '../lib/types'

export const qk = {
  analytics: ['analytics'] as const,
  alumni: (params: Record<string, unknown>) => ['alumni', params] as const,
  departments: ['departments'] as const,
  graduationYears: ['graduation-years'] as const,
  institutions: (params: Record<string, unknown>) => ['institutions', params] as const,
  users: (params: Record<string, unknown>) => ['users', params] as const,
  roles: ['roles'] as const,
  permissions: ['permissions'] as const,
  surveys: (params: Record<string, unknown>) => ['surveys', params] as const,
  survey: (id: string) => ['surveys', id] as const,
  responses: (params: Record<string, unknown>) => ['responses', params] as const,
  response: (id: string) => ['responses', id] as const,
  announcements: (params: Record<string, unknown>) => ['announcements', params] as const,
  events: (params: Record<string, unknown>) => ['events', params] as const,
  jobVacancies: (params: Record<string, unknown>) => ['job-vacancies', params] as const,
}

// --- Auth ------------------------------------------------------------------

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      unwrap<LoginResponse>(api.post('/auth/login', { email, password })),
  })
}

/** Check whether Google OAuth login is configured on the server. */
export function useGoogleEnabled() {
  return useQuery({
    queryKey: ['auth', 'google-status'],
    queryFn: () => unwrap<{ enabled: boolean }>(api.get('/auth/google/status')),
    staleTime: 5 * 60_000,
  })
}

export function useGoogleLogin() {
  return useMutation({
    mutationFn: (idToken: string) =>
      unwrap<LoginResponse>(api.post('/auth/google', { id_token: idToken })),
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      unwrap<RegisterResponse>(api.post('/auth/register', payload)),
  })
}

export function useCompleteGoogleRegistration() {
  // `name`/`email` are already known from the Google account, so they are
  // optional here; the rest of the biodata mirrors RegisterPayload.
  type CompleteGooglePayload = Omit<
    RegisterPayload,
    'password' | 'password_confirmation' | 'name' | 'email'
  > & { name?: string; email?: string }
  return useMutation({
    mutationFn: (payload: CompleteGooglePayload) =>
      unwrap<RegisterResponse>(api.post('/auth/google/complete-registration', payload)),
  })
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ email, otp }: { email: string; otp: string }) =>
      unwrap<LoginResponse>(api.post('/auth/verify-otp', { email, otp })),
  })
}

export function useResendOtp() {
  return useMutation({
    mutationFn: ({ email, purpose }: { email: string; purpose?: string }) =>
      unwrap<OtpSentResponse>(api.post('/auth/resend-otp', { email, purpose })),
  })
}

/**
 * Fresh authenticated-user data (including the linked alumni summary with
 * birthplace_label). Mutations like useUpdateProfile/useUploadAvatar already
 * sync the stored session; this hook covers users signed in before the
 * alumni summary was introduced.
 */
export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => unwrap<User>(api.get('/auth/me')),
    staleTime: 60_000,
  })
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
  institution_id?: string
  gender?: string
  phone?: string
  nis?: string
  nisn?: string
  entry_year?: number
  graduation_year?: number
  birthplace?: string
  birthplace_regency?: string
  birthplace_province?: string
  birth_date?: string
  address?: string
  department?: string
  socials?: { platform: string; url: string }[]
  skills?: string[]
  employment_status?: string
  company_name?: string
  position?: string
  business_field?: string
  business_start_year?: number
  work_province?: string
  work_city?: string
  study_institution?: string
  study_program?: string
  study_entry_year?: number
  business_name?: string
  business_address?: string
  business_province?: string
  business_city?: string
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('avatar', file)
      return unwrap<User>(api.post('/auth/me/avatar', form))
    },
    onSuccess: (user) => setUser(user),
  })
}

export function useDeleteAvatar() {
  return useMutation({
    mutationFn: () => unwrap<User>(api.delete('/auth/me/avatar')),
    onSuccess: (user) => setUser(user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      clearSession()
      queryClient.clear()
      window.location.assign('/login')
    },
  })
}

// --- Public data & alumni portal ---------------------------------------------

export function useInstitutionOptions() {
  return useQuery({
    queryKey: ['institutions', 'options'],
    queryFn: () => unwrap<InstitutionOption[]>(api.get('/institutions/options')),
    staleTime: 5 * 60_000,
  })
}

export function useDepartmentOptions(institutionId: string | null) {
  return useQuery({
    queryKey: ['institutions', institutionId, 'departments'],
    queryFn: () =>
      unwrap<{ id: string; name: string; code: string | null }[]>(
        api.get(`/institutions/${institutionId}/departments`),
      ),
    enabled: Boolean(institutionId),
    staleTime: 5 * 60_000,
  })
}

export function useUniversities(search?: string) {
  return useQuery({
    queryKey: ['universities', search ?? ''],
    queryFn: () => unwrap<University[]>(api.get('/universities', { params: search ? { search } : {} })),
    staleTime: 60 * 60_000,
  })
}

export function useStudyPrograms(universityId: string | null) {
  return useQuery({
    queryKey: ['universities', universityId, 'study-programs'],
    queryFn: () => unwrap<StudyProgram[]>(api.get(`/universities/${universityId}/study-programs`)),
    enabled: Boolean(universityId),
    staleTime: 60 * 60_000,
  })
}

export function useProvinces() {
  return useQuery({
    queryKey: ['regions', 'provinces'],
    queryFn: () => unwrap<Province[]>(api.get('/regions/provinces')),
    staleTime: 60 * 60_000,
  })
}

export function useRegencies(provinceId: string | null) {
  return useQuery({
    queryKey: ['regions', 'regencies', provinceId],
    queryFn: () => unwrap<Regency[]>(api.get(`/regions/provinces/${provinceId}/regencies`)),
    enabled: Boolean(provinceId),
    staleTime: 60 * 60_000,
  })
}

export function useDistricts(regencyId: string | null) {
  return useQuery({
    queryKey: ['regions', 'districts', regencyId],
    queryFn: () => unwrap<District[]>(api.get(`/regions/regencies/${regencyId}/districts`)),
    enabled: Boolean(regencyId),
    staleTime: 60 * 60_000,
  })
}

export function useAlumniHome() {
  return useQuery({
    queryKey: ['alumni', 'home'],
    queryFn: () => unwrap<AlumniHome>(api.get('/alumni/home')),
  })
}

// --- Notifications -----------------------------------------------------------

export function useNotifications(params: { page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => unwrapPage<NotificationItem>(api.get('/notifications', { params })),
    placeholderData: keepPreviousData,
    // Lightweight polling so the alumni portal surfaces new notifications
    // (announcements, events, jobs, survey reminders) without a manual refresh.
    refetchInterval: 30_000,
  })
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => unwrap<{ count: number }>(api.get('/notifications/unread-count')),
    // Polled fairly frequently so the bell badge reflects new chat messages
    // and other notifications without waiting for a manual refresh.
    refetchInterval: 10_000,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}

// --- Alumni surveys -----------------------------------------------------------

export function useAlumniSurveys() {
  return useQuery({
    queryKey: ['alumni', 'surveys'],
    queryFn: () => unwrap<AlumniSurveyItem[]>(api.get('/alumni/surveys')),
  })
}

export function useStartSurvey(surveyId: string) {
  return useQuery({
    queryKey: ['alumni', 'survey-fill', surveyId],
    // POST is idempotent server-side: starting resumes an existing draft.
    // Avoid refetch/retry so the start request only fires on mount.
    queryFn: () => unwrap<SurveyFill>(api.post(`/surveys/${surveyId}/start`)),
    enabled: Boolean(surveyId),
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useSaveAnswers(surveyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (answers: { question_id: string; value: unknown }[]) =>
      unwrap<SurveyFill>(api.post(`/surveys/${surveyId}/responses/save`, { answers })),
    onSuccess: (data) => queryClient.setQueryData(['alumni', 'survey-fill', surveyId], data),
  })
}

export function useSubmitAnswers(surveyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (answers: { question_id: string; value: unknown }[]) =>
      unwrap<SurveyFill>(api.post(`/surveys/${surveyId}/responses/submit`, { answers })),
    onSuccess: (data) => {
      queryClient.setQueryData(['alumni', 'survey-fill', surveyId], data)
      queryClient.invalidateQueries({ queryKey: ['alumni', 'surveys'] })
      queryClient.invalidateQueries({ queryKey: ['responses', 'my'] })
    },
  })
}

// --- My tracer responses ------------------------------------------------------

export function useMyResponses(
  params: { page?: number; per_page?: number } = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ['responses', 'my', params],
    queryFn: () => unwrapPage<SurveyResponseItem>(api.get('/responses/my', { params })),
    placeholderData: keepPreviousData,
    enabled: options.enabled,
  })
}

/**
 * A single response owned by the current user (read-only summary).
 * The API returns the SurveyFill shape for the respondent.
 */
export function useMyResponse(id: string) {
  return useQuery({
    queryKey: ['responses', 'my', 'detail', id],
    queryFn: () => unwrap<SurveyFill>(api.get(`/responses/${id}`)),
    enabled: Boolean(id),
  })
}

// --- Institutions ------------------------------------------------------------

export function useInstitutions(
  params: { search?: string; status?: string; page?: number; per_page?: number },
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: qk.institutions(params),
    queryFn: () => unwrapPage<Institution>(api.get('/institutions', { params })),
    placeholderData: keepPreviousData,
    enabled: options.enabled,
  })
}

export function useCreateInstitution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<Institution>) => unwrap<Institution>(api.post('/institutions', payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institutions'] }),
  })
}

export function useUpdateInstitution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Institution> }) =>
      unwrap<Institution>(api.put(`/institutions/${id}`, payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institutions'] }),
  })
}

export function useDeleteInstitution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/institutions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institutions'] }),
  })
}

// --- Users -------------------------------------------------------------------

export function useUsers(params: { search?: string; role?: string; page?: number; per_page?: number }) {
  return useQuery({
    queryKey: qk.users(params),
    queryFn: () => unwrapPage<User>(api.get('/users', { params })),
    placeholderData: keepPreviousData,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      name: string
      email: string
      password: string
      password_confirmation: string
      role: string
      institution_id?: string | null
    }) => unwrap<User>(api.post('/users', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['institutions'] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      unwrap<User>(api.put(`/users/${id}`, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['institutions'] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['institutions'] })
    },
  })
}

// --- Roles & permissions -----------------------------------------------------

export function useRoles() {
  return useQuery({
    queryKey: qk.roles,
    queryFn: () => unwrap<Role[]>(api.get('/roles')),
  })
}

export function usePermissions() {
  return useQuery({
    queryKey: qk.permissions,
    queryFn: () => unwrap<Permission[]>(api.get('/permissions')),
  })
}

// --- Reports -----------------------------------------------------------------

export function useExecutiveSummary() {
  return useQuery({
    queryKey: ['reports', 'executive-summary'],
    queryFn: () => unwrap<ExecutiveSummary>(api.get('/reports/executive-summary')),
  })
}

// --- Settings ----------------------------------------------------------------

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      name: string
      email: string
      nis?: string | null
      nisn?: string | null
      socials?: SocialLink[]
      skills?: string[]
      gender?: string | null
      phone?: string | null
      birth_date?: string | null
      birthplace?: string | null
      birthplace_regency?: string | null
      birthplace_province?: string | null
      address?: string | null
      employment_status?: string | null
      company_name?: string | null
      position?: string | null
      business_field?: string | null
      business_start_year?: number | string | null
      work_province?: string | null
      work_city?: string | null
      study_institution?: string | null
      study_program?: string | null
      study_entry_year?: number | string | null
      business_name?: string | null
      business_address?: string | null
      business_province?: string | null
      business_city?: string | null
    }) => unwrap<User>(api.put('/auth/profile', payload)),
    onSuccess: (user) => {
      // Keep the stored session and the /auth/me cache in sync with the
      // edited profile (name, email, and alumni fields).
      setUser(user)
      queryClient.setQueryData(['auth', 'me'], user)
    },
  })
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (payload: { current_password: string; password: string; password_confirmation: string }) =>
      api.put('/auth/password', payload),
  })
}

/** Send a change-password OTP to the authenticated user's email. */
export function useSendPasswordChangeOtp() {
  return useMutation({
    mutationFn: () => unwrap<OtpSentResponse>(api.post('/auth/password/otp')),
  })
}

/** Change the password using the OTP sent by useSendPasswordChangeOtp. */
export function useChangePasswordWithOtp() {
  return useMutation({
    mutationFn: (payload: { otp: string; password: string; password_confirmation: string }) =>
      api.put('/auth/password/otp', payload),
  })
}

// --- Engagement (phase 10) ----------------------------------------------------

function useCollection<T>(queryKey: readonly unknown[], url: string, params: Record<string, unknown>) {
  return useQuery({
    queryKey,
    queryFn: () => unwrapPage<T>(api.get(url, { params })),
    placeholderData: keepPreviousData,
  })
}

function useEntityMutations<T>(key: string, path: string) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [key] })

  const create = useMutation({
    mutationFn: (payload: Partial<T>) => unwrap<T>(api.post(path, payload)),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<T> }) =>
      unwrap<T>(api.put(`${path}/${id}`, payload)),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`${path}/${id}`),
    onSuccess: invalidate,
  })

  return { create, update, remove }
}

export function useAnnouncements(params: { search?: string; status?: string; page?: number }) {
  return useCollection<Announcement>(qk.announcements(params), '/announcements', params)
}

export function useAnnouncementMutations() {
  return useEntityMutations<Announcement>('announcements', '/announcements')
}

export function useEvents(params: { search?: string; status?: string; upcoming?: boolean; page?: number }) {
  return useCollection<EventItem>(qk.events(params), '/events', params)
}

export function useEventMutations() {
  return useEntityMutations<EventItem>('events', '/events')
}

export function useJobVacancies(params: { search?: string; status?: string; employment_type?: string; per_page?: number; page?: number }) {
  return useCollection<JobVacancy>(qk.jobVacancies(params), '/job-vacancies', params)
}

export function useJobVacancy(id: string | undefined) {
  return useQuery({
    queryKey: ['job-vacancies', id],
    queryFn: () => unwrap<JobVacancy>(api.get(`/job-vacancies/${id}`)),
    enabled: Boolean(id),
  })
}

export function useJobVacancyMutations() {
  return useEntityMutations<JobVacancy>('job-vacancies', '/job-vacancies')
}

// --- Job applications (phase 8) ----------------------------------------------

export function useMyApplications(params: { page?: number; per_page?: number } = {}) {
  return useQuery({
    queryKey: ['applications', 'my', params],
    queryFn: () => unwrapPage<JobApplication>(api.get('/applications/my', { params })),
    placeholderData: keepPreviousData,
  })
}

export function useJobApplicants(jobId: string, params: { status?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ['job-vacancies', jobId, 'applications', params],
    queryFn: () => unwrapPage<JobApplication>(api.get(`/job-vacancies/${jobId}/applications`, { params })),
    placeholderData: keepPreviousData,
    enabled: Boolean(jobId),
  })
}

function invalidateJobs(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['job-vacancies'] })
  queryClient.invalidateQueries({ queryKey: ['applications'] })
}

export function useApplyJob(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { cover_letter?: string; cv?: File; portfolio?: File; cv_data?: Record<string, unknown> }) => {
      const form = new FormData()
      if (payload.cover_letter) form.append('cover_letter', payload.cover_letter)
      if (payload.cv) form.append('cv', payload.cv)
      if (payload.portfolio) form.append('portfolio', payload.portfolio)
      if (payload.cv_data) {
        // Send cv_data as nested form fields so Laravel validation works.
        Object.entries(payload.cv_data).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((v, i) => form.append(`cv_data[${key}][${i}]`, String(v)))
          } else if (value != null && value !== '') {
            form.append(`cv_data[${key}]`, String(value))
          }
        })
      }
      return unwrap<JobApplication>(api.post(`/job-vacancies/${jobId}/apply`, form))
    },
    onSuccess: () => invalidateJobs(queryClient),
  })
}

export function useBookmarkJob(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap<{ bookmarked: boolean }>(api.post(`/job-vacancies/${jobId}/bookmark`)),
    onSuccess: () => invalidateJobs(queryClient),
  })
}

export function useUnbookmarkJob(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap<{ bookmarked: boolean }>(api.delete(`/job-vacancies/${jobId}/bookmark`)),
    onSuccess: () => invalidateJobs(queryClient),
  })
}

export function useWithdrawApplication(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap<JobApplication>(api.post(`/applications/${applicationId}/withdraw`)),
    onSuccess: () => invalidateJobs(queryClient),
  })
}

export function useUpdateApplicationStatus(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: JobApplication['status']) =>
      unwrap<JobApplication>(api.put(`/applications/${applicationId}/status`, { status })),
    onSuccess: () => invalidateJobs(queryClient),
  })
}

/** Record/update the hiring result of an accepted application. */
export function useSaveAcceptance(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      position_offered?: string | null
      contract_type?: string | null
      start_date?: string | null
      salary?: string | null
      notes?: string | null
    }) => unwrap<JobApplication>(api.put(`/applications/${applicationId}/acceptance`, payload)),
    onSuccess: () => invalidateJobs(queryClient),
  })
}

// --- Employer portal ----------------------------------------------------------

export function useEmployerDashboard() {
  return useQuery({
    queryKey: ['employer', 'dashboard'],
    queryFn: () => unwrap<EmployerDashboard>(api.get('/employer/dashboard')),
  })
}

/**
 * New (submitted) application count for the employer — powers the badge
 * next to the "Lamaran" sidebar item so it reflects actual new applicants
 * rather than the general notification count.
 */
export function useNewApplicationsCount() {
  return useQuery({
    queryKey: ['employer', 'new-applications-count'],
    queryFn: async () => {
      const data = await unwrap<EmployerDashboard>(api.get('/employer/dashboard'))
      return { count: data.applications.new }
    },
    refetchInterval: 15_000,
  })
}

// --- Employer Alumni Directory ---

export function useEmployerAlumni(params: {
  search?: string
  department_id?: string
  graduation_year_id?: string
  employment_status?: string
  page?: number
}) {
  return useQuery({
    queryKey: ['employer', 'alumni', params],
    queryFn: () => unwrapPage<EmployerAlumniListItem>(api.get('/employer/alumni', { params })),
    placeholderData: keepPreviousData,
  })
}

export function useEmployerAlumniDetail(alumniId: string | null) {
  return useQuery({
    queryKey: ['employer', 'alumni', alumniId],
    queryFn: () => unwrap<EmployerAlumniDetail>(api.get(`/employer/alumni/${alumniId}`)),
    enabled: Boolean(alumniId),
  })
}

/**
 * Unified applicant inbox across every vacancy the employer posted.
 * Filters: search (applicant/vacancy), hiring status, per-vacancy.
 */
export function useEmployerApplications(
  params: { search?: string; status?: string; job_vacancy_id?: string; page?: number } = {},
) {
  return useQuery({
    queryKey: ['employer', 'applications', params],
    queryFn: () => unwrapPage<JobApplication>(api.get('/employer/applications', { params })),
    placeholderData: keepPreviousData,
  })
}

// --- Event registration (phase 10) -------------------------------------------

export function useEventRegister(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap<{ registered: boolean }>(api.post(`/events/${eventId}/register`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}

export function useEventUnregister(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap<{ registered: boolean }>(api.delete(`/events/${eventId}/register`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useEventParticipants(eventId: string, params: { page?: number; per_page?: number } = {}) {
  return useQuery({
    queryKey: ['events', eventId, 'participants', params],
    queryFn: () => unwrapPage<EventParticipant>(api.get(`/events/${eventId}/participants`, { params })),
    placeholderData: keepPreviousData,
    enabled: Boolean(eventId),
  })
}

export function useMarkAttended(eventId: string, registrationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attended: boolean) =>
      unwrap<{ attended: boolean }>(api.post(`/events/${eventId}/participants/${registrationId}/attendance`, { attended })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', eventId, 'participants'] }),
  })
}

// --- Networking (phase 12) ---------------------------------------------------

export function useNetworkingAlumni(params: { search?: string; page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['networking', 'alumni', params],
    queryFn: () => unwrapPage<NetworkingAlumni>(api.get('/networking/alumni', { params })),
    placeholderData: keepPreviousData,
  })
}

export function useNetworkingAlumnus(id: string) {
  return useQuery({
    queryKey: ['networking', 'alumni', id],
    queryFn: () => unwrap<NetworkingAlumni>(api.get(`/networking/alumni/${id}`)),
    enabled: Boolean(id),
  })
}

export function useNetworkingConnections() {
  return useQuery({
    queryKey: ['networking', 'connections'],
    queryFn: async () => {
      const page = await unwrapPage<ConnectionItem>(api.get('/networking/connections'))
      return page.data
    },
  })
}

export function useNetworkingRequests() {
  return useQuery({
    queryKey: ['networking', 'requests'],
    queryFn: async () => {
      const page = await unwrapPage<ConnectionItem>(api.get('/networking/requests'))
      return page.data
    },
  })
}

function invalidateNetworking(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['networking'] })
}

export function useSendConnectionRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (receiverId: string) => api.post('/networking/connections', { receiver_id: receiverId }),
    onSuccess: () => invalidateNetworking(queryClient),
  })
}

export function useAcceptConnectionRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.post(`/networking/connections/${id}/accept`),
    onSuccess: () => invalidateNetworking(queryClient),
  })
}

export function useRejectConnectionRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.post(`/networking/connections/${id}/reject`),
    onSuccess: () => invalidateNetworking(queryClient),
  })
}

export function useRemoveConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/networking/connections/${id}`),
    onSuccess: () => invalidateNetworking(queryClient),
  })
}

export function useNetworkingBlocked() {
  return useQuery({
    queryKey: ['networking', 'blocked'],
    queryFn: async () => {
      const page = await unwrapPage<BlockedUserItem>(api.get('/networking/blocked'))
      return page.data
    },
  })
}

export function useUnblockUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/networking/blocked/${id}`),
    onSuccess: () => invalidateNetworking(queryClient),
  })
}

export function useBlockUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (blockedId: string) => api.post('/networking/block', { blocked_id: blockedId }),
    onSuccess: () => invalidateNetworking(queryClient),
  })
}

export function useReportUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { reported_id: string; reason: string; details?: string }) =>
      api.post('/networking/report', payload),
    onSuccess: () => invalidateNetworking(queryClient),
  })
}

// --- Chat (career chat, REST polling) ---------------------------------------

export function useConversations(search?: string) {
  return useQuery({
    queryKey: ['chat', 'conversations', search ?? ''],
    queryFn: async () => {
      const page = await unwrapPage<Conversation>(api.get('/conversations', { params: search ? { search } : {} }))
      return page.data
    },
    // REST polling transport per the blueprint (shared-hosting friendly).
    refetchInterval: 5_000,
  })
}

/**
 * Total unread incoming messages — powers the chat badge next to the
 * notification bell so new messages surface without opening the chat page.
 */
export function useUnreadConversationsCount() {
  return useQuery({
    queryKey: ['chat', 'unread-count'],
    queryFn: () => unwrap<{ count: number }>(api.get('/conversations/unread-count')),
    refetchInterval: 10_000,
  })
}

export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: ['chat', 'conversation', conversationId],
    queryFn: () => unwrap<Conversation>(api.get(`/conversations/${conversationId}`)),
    enabled: Boolean(conversationId),
    refetchInterval: 5_000,
  })
}

/** Latest page = page 1 (newest first, reversed by the UI). */
export function useConversationMessages(conversationId: string | null, page = 1) {
  return useQuery({
    queryKey: ['chat', 'messages', conversationId, page],
    queryFn: () => unwrapPage<ChatMessage>(api.get(`/conversations/${conversationId}/messages`, { params: { page } })),
    enabled: Boolean(conversationId),
    refetchInterval: page === 1 ? 5_000 : false,
    placeholderData: keepPreviousData,
  })
}

export function useStartConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { user_id?: string; job_vacancy_id?: string }) =>
      unwrap<Conversation>(api.post('/conversations', payload)),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['chat'] })
      queryClient.setQueryData(['chat', 'conversation', conversation.id], conversation)
    },
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversationId,
      type,
      body,
      attachment,
    }: {
      conversationId: string
      type: 'text' | 'image' | 'file'
      body?: string
      attachment?: File
    }) => {
      const form = new FormData()
      form.append('type', type)
      if (body) form.append('body', body)
      if (attachment) form.append('attachment', attachment)
      return unwrap<ChatMessage>(api.post(`/conversations/${conversationId}/messages`, form))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat'] }),
  })
}

export function useDeleteChatMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: string) => api.delete(`/messages/${messageId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat'] }),
  })
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (conversationId: string) => api.post(`/conversations/${conversationId}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat'] }),
  })
}

export function useToggleConversationMute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ conversationId, muted }: { conversationId: string; muted: boolean }) =>
      api.post(`/conversations/${conversationId}/mute`, { muted }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat'] }),
  })
}

export function useReportConversation() {
  return useMutation({
    mutationFn: ({ conversationId, reason, description }: { conversationId: string; reason: string; description?: string }) =>
      api.post(`/conversations/${conversationId}/report`, { reason, description }),
  })
}


// --- Analytics --------------------------------------------------------------

export function useAnalytics(params: { graduation_year_id?: string; department_id?: string } = {}) {
  return useQuery({
    queryKey: [...qk.analytics, 'overview', params],
    queryFn: () => unwrap<AnalyticsOverview>(api.get('/analytics/overview', { params })),
  })
}

export function useEmployment(params: { graduation_year_id?: string; department_id?: string } = {}) {
  return useQuery({
    queryKey: [...qk.analytics, 'employment', params],
    queryFn: () => unwrap<EmploymentAnalytics>(api.get('/analytics/employment', { params })),
  })
}

export function useSurveyResults(surveyId: string) {
  return useQuery({
    queryKey: [...qk.analytics, 'survey-results', surveyId],
    queryFn: () => unwrap<SurveyResults>(api.get(`/analytics/surveys/${surveyId}/results`)),
    enabled: Boolean(surveyId),
  })
}

// --- Alumni -----------------------------------------------------------------

export function useAlumni(params: {
  search?: string
  department_id?: string
  employment_status?: string
  page?: number
}) {
  return useQuery({
    queryKey: qk.alumni(params),
    queryFn: () => unwrapPage<Alumni>(api.get('/alumni', { params })),
    placeholderData: keepPreviousData,
  })
}

export function useAlumnus(id: string) {
  return useQuery({
    queryKey: ['alumni', id],
    queryFn: () => unwrap<Alumni>(api.get(`/alumni/${id}`)),
    enabled: Boolean(id),
  })
}

export function useDepartments(params: { search?: string; per_page?: number } = {}) {
  return useQuery({
    queryKey: [...qk.departments, params],
    queryFn: () => unwrapPage<Department>(api.get('/departments', { params: { per_page: 100, ...params } })),
    placeholderData: keepPreviousData,
  })
}

export function useDepartmentMutations() {
  return useEntityMutations<Department>('departments', '/departments')
}

export function useGraduationYears() {
  return useQuery({
    queryKey: qk.graduationYears,
    queryFn: () => unwrapPage<GraduationYear>(api.get('/graduation-years', { params: { per_page: 100 } })),
  })
}

export function useSaveAlumni() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: Partial<Alumni> }) =>
      unwrap<Alumni>(id ? api.put(`/alumni/${id}`, payload) : api.post('/alumni', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alumni'] })
      queryClient.invalidateQueries({ queryKey: qk.analytics })
    },
  })
}

export function useDeleteAlumni() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/alumni/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alumni'] })
      queryClient.invalidateQueries({ queryKey: qk.analytics })
    },
  })
}

// --- Surveys ----------------------------------------------------------------

export function useSurveys(params: { search?: string; status?: string; page?: number; per_page?: number }) {
  return useQuery({
    queryKey: qk.surveys(params),
    queryFn: () => unwrapPage<Survey>(api.get('/surveys', { params })),
    placeholderData: keepPreviousData,
  })
}

export function useSurvey(id: string) {
  return useQuery({
    queryKey: qk.survey(id),
    queryFn: () => unwrap<SurveyDetail>(api.get(`/surveys/${id}`)),
    enabled: Boolean(id),
  })
}

export function useCreateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<Survey>) => unwrap<Survey>(api.post('/surveys', payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surveys'] }),
  })
}

export function useUpdateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Survey> }) =>
      unwrap<Survey>(api.put(`/surveys/${id}`, payload)),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: qk.survey(vars.id) })
    },
  })
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/surveys/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surveys'] }),
  })
}

export function usePublishSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      api.post(`/surveys/${id}/${publish ? 'publish' : 'unpublish'}`),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: qk.survey(vars.id) })
    },
  })
}

export function useCreateSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ surveyId, payload }: { surveyId: string; payload: Partial<SurveySection> }) =>
      unwrap<SurveySection>(api.post(`/surveys/${surveyId}/sections`, payload)),
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: qk.survey(vars.surveyId) }),
  })
}

export function useUpdateSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ section, payload }: { section: SurveySection; payload: Partial<SurveySection> }) =>
      unwrap<SurveySection>(api.put(`/survey-sections/${section.id}`, payload)),
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: qk.survey(vars.section.survey_id) }),
  })
}

export function useDeleteSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (section: SurveySection) => api.delete(`/survey-sections/${section.id}`),
    onSuccess: (_data, section) => queryClient.invalidateQueries({ queryKey: qk.survey(section.survey_id) }),
  })
}

export function useCreateQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ surveyId, payload }: { surveyId: string; payload: QuestionPayload }) =>
      unwrap<Question>(api.post(`/surveys/${surveyId}/questions`, payload)),
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: qk.survey(vars.surveyId) }),
  })
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ questionId, payload }: { questionId: string; surveyId: string; payload: QuestionPayload }) =>
      unwrap<Question>(api.put(`/questions/${questionId}`, payload)),
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: qk.survey(vars.surveyId) }),
  })
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (question: Question) => api.delete(`/questions/${question.id}`),
    onSuccess: (_data, question) => queryClient.invalidateQueries({ queryKey: qk.survey(question.survey_id) }),
  })
}

export function useReorderSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ surveyId, payload }: { surveyId: string; payload: { sections?: { id: string; order: number }[]; questions?: { id: string; order: number }[] } }) =>
      api.put(`/surveys/${surveyId}/reorder`, payload),
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: qk.survey(vars.surveyId) }),
  })
}

// --- Responses ----------------------------------------------------------------

export function useResponses(params: {
  survey_id?: string
  status?: string
  search?: string
  page?: number
}) {
  return useQuery({
    queryKey: qk.responses(params),
    queryFn: () => unwrapPage<SurveyResponseItem>(api.get('/responses', { params })),
    placeholderData: keepPreviousData,
  })
}

export function useResponse(id: string) {
  // Staff shape (SurveyResponseDetail). The same endpoint returns the owner
  // shape (SurveyFill) — see useMyResponse for the alumni variant.
  return useQuery({
    queryKey: qk.response(id),
    queryFn: () => unwrap<SurveyResponseDetail>(api.get(`/responses/${id}`)),
    enabled: Boolean(id),
  })
}

// --- Data Quality Center ------------------------------------------------

// --- Institution Branding ------------------------------------------------

export function useInstitutionBranding() {
  return useQuery({
    queryKey: ['institution-branding'],
    queryFn: () => unwrap<InstitutionBranding>(api.get('/institution-branding')),
  })
}

export function useUpdateInstitutionBranding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<InstitutionBranding>) =>
      unwrap<InstitutionBranding>(api.put('/institution-branding', payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institution-branding'] }),
  })
}

export function useUploadInstitutionLogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('logo', file)
      return unwrap<{ logo_path: string; logo_url: string }>(
        api.post('/institution-branding/logo', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institution-branding'] }),
  })
}

export function useUploadInstitutionCover() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('cover', file)
      return unwrap<{ cover_image_path: string; cover_image_url: string }>(
        api.post('/institution-branding/cover', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institution-branding'] }),
  })
}

export function useDataQuality() {
  return useQuery({
    queryKey: ['data-quality'],
    queryFn: () => unwrap<DataQualityReport>(api.get('/data-quality')),
  })
}

export function useDeleteResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/responses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses'] })
      queryClient.invalidateQueries({ queryKey: qk.analytics })
    },
  })
}

