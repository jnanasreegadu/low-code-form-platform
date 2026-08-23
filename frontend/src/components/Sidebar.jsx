import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  PlusSquare,
  FilePenLine,
  Files,
  MessageSquareText,
  BarChart3,
  LogOut,
  User,
} from "lucide-react";
import api from "../services/api";
import "../styles/Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    api
      .get("profile/")
      .then((response) => setProfile(response.data))
      .catch((err) => console.log("PROFILE ERROR:", err));
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  };

  const sidebarLinkClass = ({ isActive }) =>
    `sidebar-link${isActive ? " active" : ""}`;
  const editActive =
    location.pathname === "/forms" ||
    location.pathname.startsWith("/edit/");
  return (
    <aside className="dashboard-sidebar">

      {/* BRAND */}
      <div className="sidebar-brand">
        <div className="brand-mark">F</div>

        <div>
          <div className="brand-name">FormFlow</div>
          <div className="brand-subtitle">Admin workspace</div>
        </div>
      </div>

      <div className="sidebar-section-label">
        WORKSPACE
      </div>

      {/* NAVIGATION */}
      <nav className="sidebar-nav">

        <NavLink to="/" className={sidebarLinkClass}>
          <Home size={18} />
          <span>Home</span>
        </NavLink>

        <NavLink to="/dashboard" className={sidebarLinkClass}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
        {/* FORMS */}
        <NavLink to="/forms" className={sidebarLinkClass}>
          <Files size={18} />
          <span>Forms</span>
        </NavLink>

        <NavLink to="/create" className={sidebarLinkClass}>
          <PlusSquare size={18} />
          <span>Create Form</span>
        </NavLink>

        

        <NavLink to="/responses" className={sidebarLinkClass}>
          <MessageSquareText size={18} />
          <span>Responses</span>
        </NavLink>

        <NavLink to="/analytics" className={sidebarLinkClass}>
          <BarChart3 size={18} />
          <span>Response Analytics</span>
        </NavLink>

      </nav>

      {/* PUSH PROFILE TO BOTTOM */}
      <div className="sidebar-spacer" />

      {/* PROFILE */}
      <div className="sidebar-profile-wrap">

        <button
          className="sidebar-profile"
          onClick={() => setShowProfile((value) => !value)}
        >
          <div className="avatar-placeholder">
            <User size={18} />
          </div>

          <div className="sidebar-profile-text">
            <strong>
              {profile?.name || profile?.username || "User"}
            </strong>

            <span>
              {profile?.email || "Account"}
            </span>
          </div>

          <span className="profile-chevron">⋮</span>
        </button>

        {showProfile && (
          <div className="sidebar-profile-card">

            <div className="profile-card-title">
              Profile
            </div>

            <div className="profile-card-row">
              <span>Username</span>
              <strong>
                {profile?.username || "Not provided"}
              </strong>
            </div>

            <div className="profile-card-row">
              <span>Name</span>
              <strong>
                {profile?.name || "Not provided"}
              </strong>
            </div>

            <div className="profile-card-row">
              <span>Email</span>
              <strong>
                {profile?.email || "Not provided"}
              </strong>
            </div>

            <button
              className="profile-logout"
              onClick={logout}
            >
              <LogOut size={16} />
              Logout
            </button>

          </div>
        )}

      </div>

    </aside>
  );
}

export default Sidebar;