import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./routes/Dashboard";
import { Login } from "./routes/Login";

export function App() {
  return (
    <div className="flex h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Title-bar strip: room for the traffic lights, and a handle to drag the window by. */}
      <div className="drag h-10 shrink-0" />
      <div className="min-h-0 flex-1">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </div>
    </div>
  );
}
