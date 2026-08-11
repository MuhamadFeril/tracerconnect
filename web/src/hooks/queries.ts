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
  AlumniHome,
  AlumniSurveyItem,
  AnalyticsOverview,
  District,
  Announcement,
  Department,
  EmploymentAnalytics,
  EventItem,
  ExecutiveSummary,
  GraduationYear,
  Institution,
  InstitutionOption,
  JobVacancy,
  LoginResponse,
  NotificationItem,
  Permission,
  Province,
  Question,
  QuestionPayload,
  Regency,
  Role,
  Survey,
  SurveyDetail,
  SurveyFill,
  SurveyResponseDetail,
  SurveyResponseItem,
  SurveyResults,
  SurveySection,
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

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      unwrap<LoginResponse>(api.post('/auth/register', payload)),
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
  })
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => unwrap<{ count: number }>(api.get('/notifications/unread-count')),
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
  return useMutation({
    mutationFn: ({ name, email }: { name: string; email: string }) =>
      unwrap<User>(api.put('/auth/profile', { name, email })),
    onSuccess: (user) => {
      // Keep the stored session in sync with the edited profile.
      setUser(user)
    },
  })
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (payload: { current_password: string; password: string; password_confirmation: string }) =>
      api.put('/auth/password', payload),
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

export function useJobVacancies(params: { search?: string; status?: string; employment_type?: string; page?: number }) {
  return useCollection<JobVacancy>(qk.jobVacancies(params), '/job-vacancies', params)
}

export function useJobVacancyMutations() {
  return useEntityMutations<JobVacancy>('job-vacancies', '/job-vacancies')
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
