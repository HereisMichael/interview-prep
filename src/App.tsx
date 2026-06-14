import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import QuestionList from './pages/questions/QuestionList';
import QuestionForm from './pages/questions/QuestionForm';
import InterviewConfig from './pages/interview/InterviewConfig';
import InterviewRoom from './pages/interview/InterviewRoom';
import InterviewHistory from './pages/interview/InterviewHistory';
import PracticeConfig from './pages/practice/PracticeConfig';
import PracticeRoom from './pages/practice/PracticeRoom';
import PracticeResult from './pages/practice/PracticeResult';
import FlashcardRoom from './pages/practice/FlashcardRoom';
import ReviewList from './pages/review/ReviewList';
import ReviewDetail from './pages/review/ReviewDetail';
import PlanList from './pages/plans/PlanList';
import PlanDetail from './pages/plans/PlanDetail';
import AISettings from './pages/settings/AISettings';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />

          {/* Questions */}
          <Route path="questions" element={<QuestionList />} />
          <Route path="questions/new" element={<QuestionForm />} />
          <Route path="questions/:id/edit" element={<QuestionForm />} />
          <Route path="questions/:id" element={<QuestionForm />} />

          {/* Interview */}
          <Route path="interview" element={<InterviewHistory />} />
          <Route path="interview/new" element={<InterviewConfig />} />
          <Route path="interview/:id" element={<InterviewRoom />} />
          <Route path="interview/:id/result" element={<InterviewRoom />} />

          {/* Practice */}
          <Route path="practice" element={<PracticeConfig />} />
          <Route path="practice/start" element={<PracticeRoom />} />
          <Route path="practice/result" element={<PracticeResult />} />
          <Route path="practice/flashcard" element={<FlashcardRoom />} />

          {/* Review */}
          <Route path="review" element={<ReviewList />} />
          <Route path="review/:id" element={<ReviewDetail />} />

          {/* Plans */}
          <Route path="plans" element={<PlanList />} />
          <Route path="plans/:id" element={<PlanDetail />} />

          {/* Settings */}
          <Route path="settings" element={<AISettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
