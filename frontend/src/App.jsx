import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Forms from "./pages/Forms";
import Responses from "./pages/Responses";
import CreateForm from "./pages/CreateForm";
import ViewForm from "./pages/ViewForm";
import EditForm from "./pages/EditForm";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicForm from "./pages/PublicForm";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={ <ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/forms" element={<ProtectedRoute><Forms /></ProtectedRoute>} />
        <Route path="/responses" element={ <ProtectedRoute><Responses /></ProtectedRoute>} />
        <Route path="/create" element={ <ProtectedRoute><CreateForm /></ProtectedRoute>} />
        <Route path="/edit/:id" element={ <ProtectedRoute><EditForm /></ProtectedRoute>} />
        <Route path="/login" element={<Login/>}/>
        <Route
  path="/form/:uuid"
  element={<PublicForm />}
/>
        <Route
  path="/view/:id"
  element={<ViewForm />}
/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;