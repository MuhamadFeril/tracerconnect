import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { AdminLayout } from './layouts/AdminLayout'
import { Landing } from './pages/landing/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { GoogleCallback } from './pages/GoogleCallback'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Profile } from './pages/Profile'
import { Pengaturan } from './pages/Pengaturan'
import { Bantuan } from './pages/Bantuan'
import { LoadingState } from './components/ui/StateViews'

// Code-split pages so the heavy charting bundle only loads on demand.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })))
const AlumniList = lazy(() => import('./pages/AlumniList').then((m) => ({ default: m.AlumniList })))
const AlumniDetail = lazy(() => import('./pages/AlumniDetail').then((m) => ({ default: m.AlumniDetail })))
const Departments = lazy(() => import('./pages/Departments').then((m) => ({ default: m.Departments })))
const SurveyList = lazy(() => import('./pages/SurveyList').then((m) => ({ default: m.SurveyList })))
const SurveyBuilder = lazy(() => import('./pages/SurveyBuilder').then((m) => ({ default: m.SurveyBuilder })))
const Responses = lazy(() => import('./pages/Responses').then((m) => ({ default: m.Responses })))
const ResponseDetail = lazy(() => import('./pages/ResponseDetail').then((m) => ({ default: m.ResponseDetail })))
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })))
const Institutions = lazy(() => import('./pages/Institutions').then((m) => ({ default: m.Institutions })))
const Users = lazy(() => import('./pages/Users').then((m) => ({ default: m.Users })))
const Roles = lazy(() => import('./pages/Roles').then((m) => ({ default: m.Roles })))
const Announcements = lazy(() => import('./pages/Announcements').then((m) => ({ default: m.Announcements })))
const SuccessStories = lazy(() => import('./pages/SuccessStories').then((m) => ({ default: m.SuccessStories })))
const Events = lazy(() => import('./pages/Events').then((m) => ({ default: m.Events })))
const Jobs = lazy(() => import('./pages/Jobs').then((m) => ({ default: m.Jobs })))
const JobApplicants = lazy(() => import('./pages/JobApplicants').then((m) => ({ default: m.JobApplicants })))
const EmployerDashboard = lazy(() => import('./pages/employer/EmployerDashboard').then((m) => ({ default: m.EmployerDashboard })))
const EmployerApplications = lazy(() => import('./pages/EmployerApplications').then((m) => ({ default: m.EmployerApplications })))
const AlumniHome = lazy(() => import('./pages/alumni/AlumniHome').then((m) => ({ default: m.AlumniHome })))
const AlumniAnnouncements = lazy(() => import('./pages/alumni/AlumniAnnouncements').then((m) => ({ default: m.AlumniAnnouncements })))
const AlumniSuccessStories = lazy(() => import('./pages/alumni/AlumniSuccessStories').then((m) => ({ default: m.AlumniSuccessStories })))
const AlumniSuccessStoryDetail = lazy(() => import('./pages/alumni/AlumniSuccessStoryDetail').then((m) => ({ default: m.AlumniSuccessStoryDetail })))
const AlumniEvents = lazy(() => import('./pages/alumni/AlumniEvents').then((m) => ({ default: m.AlumniEvents })))
const AlumniJobs = lazy(() => import('./pages/alumni/AlumniJobs').then((m) => ({ default: m.AlumniJobs })))
const AlumniJobDetail = lazy(() => import('./pages/alumni/AlumniJobDetail').then((m) => ({ default: m.AlumniJobDetail })))
const MyApplications = lazy(() => import('./pages/alumni/MyApplications').then((m) => ({ default: m.MyApplications })))
const Notifications = lazy(() => import('./pages/Notifications').then((m) => ({ default: m.Notifications })))
const AlumniSurveys = lazy(() => import('./pages/alumni/AlumniSurveys').then((m) => ({ default: m.AlumniSurveys })))
const AlumniSurveyFill = lazy(() => import('./pages/alumni/AlumniSurveyFill').then((m) => ({ default: m.AlumniSurveyFill })))
const AlumniSurveyResult = lazy(() => import('./pages/alumni/AlumniSurveyResult').then((m) => ({ default: m.AlumniSurveyResult })))
const Networking = lazy(() => import('./pages/alumni/Networking').then((m) => ({ default: m.Networking })))
const NetworkingDetail = lazy(() => import('./pages/alumni/NetworkingDetail').then((m) => ({ default: m.NetworkingDetail })))
const Chat = lazy(() => import('./pages/chat/Chat').then((m) => ({ default: m.Chat })))

function Page({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingState label="Memuat halaman…" />}>
      {/* Every routed page fades in on mount for a consistent feel. */}
      <div className="animate-fade-in-up">{children}</div>
    </Suspense>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/google/callback" element={<GoogleCallback />} />

      {/* Authenticated admin area */}
      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Page><Dashboard /></Page>} />
        <Route path="/analytics" element={<Page><Analytics /></Page>} />
        <Route path="/alumni" element={<Page><AlumniList /></Page>} />
        <Route path="/alumni/:id" element={<Page><AlumniDetail /></Page>} />
        <Route path="/departments" element={<Page><Departments /></Page>} />
        <Route path="/surveys" element={<Page><SurveyList /></Page>} />
        <Route path="/surveys/:id/builder" element={<Page><SurveyBuilder /></Page>} />
        <Route path="/responses" element={<Page><Responses /></Page>} />
        <Route path="/responses/:id" element={<Page><ResponseDetail /></Page>} />
        <Route path="/reports" element={<Page><Reports /></Page>} />
        <Route path="/institutions" element={<Page><Institutions /></Page>} />
        <Route path="/users" element={<Page><Users /></Page>} />
        <Route path="/roles" element={<Page><Roles /></Page>} />
        <Route path="/announcements" element={<Page><Announcements /></Page>} />
        <Route path="/success-stories" element={<Page><SuccessStories /></Page>} />
        <Route path="/events" element={<Page><Events /></Page>} />
        <Route path="/jobs" element={<Page><Jobs /></Page>} />
        <Route path="/jobs/:id/applicants" element={<Page><JobApplicants /></Page>} />
        {/* Employer portal */}
        <Route path="/employer" element={<Page><EmployerDashboard /></Page>} />
        <Route path="/employer/lowongan" element={<Page><Jobs /></Page>} />
        <Route path="/employer/lamaran" element={<Page><EmployerApplications /></Page>} />
        <Route path="/notifications" element={<Page><Notifications /></Page>} />
        {/* Alumni portal */}
        <Route path="/home" element={<Page><AlumniHome /></Page>} />
        <Route path="/pengumuman" element={<Page><AlumniAnnouncements /></Page>} />
        <Route path="/kisah-sukses" element={<Page><AlumniSuccessStories /></Page>} />
        <Route path="/kisah-sukses/:id" element={<Page><AlumniSuccessStoryDetail /></Page>} />
        <Route path="/acara" element={<Page><AlumniEvents /></Page>} />
        <Route path="/lowongan" element={<Page><AlumniJobs /></Page>} />
        <Route path="/lowongan/:id" element={<Page><AlumniJobDetail /></Page>} />
        <Route path="/applications" element={<Page><MyApplications /></Page>} />
        <Route path="/notifikasi" element={<Page><Notifications /></Page>} />
        <Route path="/kuisioner" element={<Page><AlumniSurveys /></Page>} />
        <Route path="/kuisioner/hasil/:responseId" element={<Page><AlumniSurveyResult /></Page>} />
        <Route path="/kuisioner/:surveyId" element={<Page><AlumniSurveyFill /></Page>} />
        <Route path="/jejaring" element={<Page><Networking /></Page>} />
        <Route path="/jejaring/:id" element={<Page><NetworkingDetail /></Page>} />
        <Route path="/chat" element={<Page><Chat /></Page>} />
        <Route path="/chat/:conversationId" element={<Page><Chat /></Page>} />
        <Route path="/profile" element={<Page><Profile /></Page>} />
        <Route path="/pengaturan" element={<Page><Pengaturan /></Page>} />
        <Route path="/bantuan" element={<Page><Bantuan /></Page>} />
        {/* Backward-compatible alias for the old settings URL */}
        <Route path="/settings" element={<Page><Profile /></Page>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
