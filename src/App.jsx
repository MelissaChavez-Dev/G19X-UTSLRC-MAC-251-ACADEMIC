import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import WellnessSurvey from "./pages/WellnessSurvey";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/survey" replace />} />
        <Route path="/survey" element={<WellnessSurvey />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;