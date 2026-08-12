import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { AdminLayout } from './layouts/AdminLayout'
import { Landing } from './pages/landing/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Profile } from './pages/Profile'
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
const Events = lazy(() => import('./pages/Events').then((m) => ({ default: m.Events })))
const Jobs = lazy(() => import('./pages/Jobs').then((m) => ({ default: m.Jobs })))
const Applications = lazy(() => import('./pages/Applications').then((m) => ({ default: m.Applications })))
const AlumniHome = lazy(() => import('./pages/alumni/AlumniHome').then((m) => ({ default: m.AlumniHome })))
const AlumniAnnouncements = lazy(() => import('./pages/alumni/AlumniAnnouncements').then((m) => ({ default: m.AlumniAnnouncements })))
const AlumniEvents = lazy(() => import('./pages/alumni/AlumniEvents').then((m) => ({ default: m.AlumniEvents })))
const AlumniJobs = lazy(() => import('./pages/alumni/AlumniJobs').then((m) => ({ default: m.AlumniJobs })))
const MyApplications = lazy(() => import('./pages/alumni/MyApplications').then((m) => ({ default: m.MyApplications })))
const Notifications = lazy(() => import('./pages/Notifications').then((m) => ({ default: m.Notifications })))
const AlumniSurveys = lazy(() => import('./pages/alumni/AlumniSurveys').then((m) => ({ default: m.AlumniSurveys })))
const AlumniSurveyFill = lazy(() => import('./pages/alumni/AlumniSurveyFill').then((m) => ({ default: m.AlumniSurveyFill })))
const AlumniSurveyResult = lazy(() => import('./pages/alumni/AlumniSurveyResult').then((m) => ({ default: m.AlumniSurveyResult })))

function Page({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState label="Memuat halaman…" />}>{children}</Suspense>
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
        <Route path="/events" element={<Page><Events /></Page>} />
        <Route path="/jobs" element={<Page><Jobs /></Page>} />
        <Route path="/applications" element={<Page><Applications /></Page>} />
        <Route path="/notifications" element={<Page><Notifications /></Page>} />
        {/* Alumni portal */}
        <Route path="/home" element={<Page><AlumniHome /></Page>} />
        <Route path="/pengumuman" element={<Page><AlumniAnnouncements /></Page>} />
        <Route path="/acara" element={<Page><AlumniEvents /></Page>} />
        <Route path="/lowongan" element={<Page><AlumniJobs /></Page>} />
        <Route path="/lamaran" element={<Page><MyApplications /></Page>} />
        <Route path="/notifikasi" element={<Page><Notifications /></Page>} />
        <Route path="/kuisioner" element={<Page><AlumniSurveys /></Page>} />
        <Route path="/kuisioner/hasil/:responseId" element={<Page><AlumniSurveyResult /></Page>} />
        <Route path="/kuisioner/:surveyId" element={<Page><AlumniSurveyFill /></Page>} />
        <Route path="/profile" element={<Page><Profile /></Page>} />
        {/* Backward-compatible alias for the old settings URL */}
        <Route path="/settings" element={<Page><Profile /></Page>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
