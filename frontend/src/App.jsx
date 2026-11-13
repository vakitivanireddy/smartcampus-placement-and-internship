import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, RequireRole } from './components/Guards.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Opportunities from './pages/Opportunities.jsx';
import OpportunityDetail from './pages/OpportunityDetail.jsx';
import Applications from './pages/Applications.jsx';
import Analytics from './pages/Analytics.jsx';
import SkillGap from './pages/SkillGap.jsx';
import Preparation from './pages/Preparation.jsx';
import PreparationTopic from './pages/PreparationTopic.jsx';
import Practice from './pages/Practice.jsx';
import AptitudePractice from './pages/AptitudePractice.jsx';
import MockTest from './pages/MockTest.jsx';
import AttemptReview from './pages/AttemptReview.jsx';
import Roadmap from './pages/Roadmap.jsx';
import Resume from './pages/Resume.jsx';
import Profile from './pages/Profile.jsx';
import Notifications from './pages/Notifications.jsx';
import NotFound from './pages/NotFound.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminStudents from './pages/admin/AdminStudents.jsx';
import AdminStudentDetail from './pages/admin/AdminStudentDetail.jsx';
import AdminOpportunities from './pages/admin/AdminOpportunities.jsx';
import AdminOpportunityForm from './pages/admin/AdminOpportunityForm.jsx';
import AdminApplications from './pages/admin/AdminApplications.jsx';
import AdminSkillGaps from './pages/admin/AdminSkillGaps.jsx';
import AdminResources from './pages/admin/AdminResources.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/notifications" element={<Notifications />} />

          <Route element={<RequireRole role="student" />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/opportunities/:id" element={<OpportunityDetail />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/skill-gap" element={<SkillGap />} />
            <Route path="/preparation" element={<Preparation />} />
            <Route path="/preparation/:slug" element={<PreparationTopic />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/practice/aptitude" element={<AptitudePractice />} />
            <Route path="/practice/mock-tests/:slug" element={<MockTest />} />
            <Route path="/practice/attempts/:id" element={<AttemptReview />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route element={<RequireRole role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/admin/students/:id" element={<AdminStudentDetail />} />
            <Route path="/admin/opportunities" element={<AdminOpportunities />} />
            <Route path="/admin/opportunities/new" element={<AdminOpportunityForm />} />
            <Route path="/admin/opportunities/:id/edit" element={<AdminOpportunityForm />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/skill-gaps" element={<AdminSkillGaps />} />
            <Route path="/admin/resources" element={<AdminResources />} />
            <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
            <Route path="/opportunities/*" element={<Navigate to="/admin/opportunities" replace />} />
            <Route path="/profile" element={<Navigate to="/admin" replace />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
