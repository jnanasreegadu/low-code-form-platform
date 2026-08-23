import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Forms from "./pages/Forms";
import Responses from "./pages/Responses";
import CreateForm from "./pages/CreateForm";
import ViewForm from "./pages/ViewForm";
import EditForm from "./pages/EditForm";
import Analytics from "./pages/Analytics";
import PublicForm from "./pages/PublicForm";
import OneTimeForm from "./pages/OneTimeForm";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= PUBLIC ================= */}

        {/* Home Page */}
        <Route path="/" element={<Home />} />

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Register */}
        <Route path="/register" element={<Register />} />

        {/* Public Form */}
        <Route
          path="/form/:uuid"
          element={<PublicForm />}
        />


        {/* ================= PROTECTED ================= */}

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Forms */}
        <Route
          path="/forms"
          element={
            <ProtectedRoute>
              <Forms />
            </ProtectedRoute>
          }
        />

        {/* Create Form */}
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreateForm />
            </ProtectedRoute>
          }
        />

        {/* Edit Form */}
        <Route
          path="/edit/:id"
          element={
            <ProtectedRoute>
              <EditForm />
            </ProtectedRoute>
          }
        />

        {/* View Form */}
        <Route
          path="/view/:id"
          element={
            <ProtectedRoute>
              <ViewForm />
            </ProtectedRoute>
          }
        />

        {/* Responses */}
        <Route
          path="/responses"
          element={
            <ProtectedRoute>
              <Responses />
            </ProtectedRoute>
          }
        />

        {/* Analytics */}
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
        path="/one-time/:token"
        element={<OneTimeForm />}
      />

      </Routes>
    </BrowserRouter>
  );
}

export default App;