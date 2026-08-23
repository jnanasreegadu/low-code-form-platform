import { useEffect, useState } from "react";
import "../styles/Dashboard.css";
import GlassCard from "../components/GlassCard";
import api from "../services/api";
import { Link, NavLink, useNavigate } from "react-router-dom";
import DashboardPieChart from "../components/DashboardPieChart";
import { motion } from "framer-motion";

import {
  Archive,
  BarChart3,
  Eye,
  FilePenLine,
  Home,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Pencil,
  PlusSquare,
  RotateCcw,
  Send,
  Share2,
  Trash2,
  User,
  Files,
} from "lucide-react";
import Loader from "../components/Loader";

function Dashboard() {
  const [forms, setForms] = useState([]);
  const [responseCount, setResponseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [selectedRules, setSelectedRules] = useState([]);
  const [selectedRuleForm, setSelectedRuleForm] = useState(null);
  const [rulesLoading, setRulesLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("profile/")
      .then((response) => setProfile(response.data))
      .catch((err) => console.log("PROFILE ERROR:", err));
  }, []);

  useEffect(() => {
    Promise.all([api.get("forms/"), api.get("submissions/count/")])
      .then(([formsRes, submissionRes]) => {
        setForms(formsRes.data);
        setResponseCount(submissionRes.data.count);
      })
      .catch(console.log)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const publishedForms = forms.filter((form) => form.status === "published").length;
  const draftForms = forms.filter((form) => form.status === "draft").length;

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  };

  const viewRules = async (form) => {
    try {
      setRulesLoading(true);
      const response = await api.get(`forms/${form.id}/`);
      const data = response.data;
      setSelectedRuleForm(data);
      setSelectedRules(data.conditional_rules || []);
    } catch (error) {
      console.log("RULES ERROR:", error);
      alert("Failed to load conditional rules");
    } finally {
      setRulesLoading(false);
    }
  };

  const deleteForm = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this form");
    if (!confirmDelete) return;

    try {
      await api.delete(`forms/${id}/`);
      setForms((current) => current.filter((form) => form.id !== id));
      alert("Form deleted successfully!");
    } catch (err) {
      console.log(err);
      alert("Delete Failed");
    }
  };

  const restoreForm = async (id) => {
    try {
      await api.post(`forms/${id}/restore/`);
      setForms((current) =>
        current.map((form) => (form.id === id ? { ...form, status: "published" } : form))
      );
      alert("Form Restored Successfully!");
    } catch (err) {
      console.log(err);
    }
  };

  const archiveForm = async (id) => {
    try {
      await api.post(`forms/${id}/archive/`);
      setForms((current) =>
        current.map((form) => (form.id === id ? { ...form, status: "archived" } : form))
      );
      alert("Form Archived Successfully!");
    } catch (err) {
      console.log(err);
      alert("Archive Failed");
    }
  };

  const publishForm = async (id) => {
    try {
      await api.post(`forms/${id}/publish/`);
      setForms((current) =>
        current.map((form) => (form.id === id ? { ...form, status: "published" } : form))
      );
      alert("Form Published Successfully!");
    } catch (err) {
      console.log(err);
      alert("Publish Failed");
    }
  };

  const closeRules = () => {
    setSelectedRuleForm(null);
    setSelectedRules([]);
  };

  const sidebarLinkClass = ({ isActive }) =>
    `sidebar-link${isActive ? " active" : ""}`;

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">F</div>
          <div>
            <div className="brand-name">FormFlow</div>
            <div className="brand-subtitle">Admin workspace</div>
          </div>
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>

<nav className="sidebar-nav">

  {/* HOME */}
  <NavLink to="/" className={sidebarLinkClass}>
    <Home size={18} />
    <span>Home</span>
  </NavLink>

  {/* DASHBOARD */}
  <NavLink to="/dashboard" className={sidebarLinkClass}>
    <LayoutDashboard size={18} />
    <span>Dashboard</span>
  </NavLink>
  {/* FORMS */}
  <NavLink to="/forms" className={sidebarLinkClass}>
    <Files size={18} />
    <span>Forms</span>
  </NavLink>

  {/* CREATE FORM */}
  <NavLink to="/create" className={sidebarLinkClass}>
    <PlusSquare size={18} />
    <span>Create Form</span>
  </NavLink>

  {/* RESPONSES */}
  <NavLink to="/responses" className={sidebarLinkClass}>
    <MessageSquareText size={18} />
    <span>Responses</span>
  </NavLink>

  {/* RESPONSE ANALYTICS */}
  <NavLink to="/analytics" className={sidebarLinkClass}>
    <BarChart3 size={18} />
    <span>Response Analytics</span>
  </NavLink>

</nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-profile-wrap">
          <button
            className="sidebar-profile"
            onClick={() => setShowProfile((value) => !value)}
          >
            <div className="avatar-placeholder">
              <User size={18} />
            </div>
            <div className="sidebar-profile-text">
              <strong>{profile?.name || profile?.username || "User"}</strong>
              <span>{profile?.email || "Account"}</span>
            </div>
            <span className="profile-chevron">⋮</span>
          </button>

          {showProfile && (
            <div className="sidebar-profile-card">
              <div className="profile-card-title">Profile</div>
              <div className="profile-card-row">
                <span>Username</span>
                <strong>{profile?.username || "Not provided"}</strong>
              </div>
              <div className="profile-card-row">
                <span>Name</span>
                <strong>{profile?.name || "Not provided"}</strong>
              </div>
              <div className="profile-card-row">
                <span>Email</span>
                <strong>{profile?.email || "Not provided"}</strong>
              </div>
              <button className="profile-logout" onClick={logout}>
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="dashboard-main">
        <motion.header
          className="dashboard-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div>
            <div className="eyebrow">OVERVIEW</div>
            <h1>Dashboard</h1>
            
          </div>

        </motion.header>


{/* WELCOME CARD */}
<motion.div
  className="welcome-card"
  initial={{ opacity: 0, y: 15 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  <div className="welcome-content">

    <span className="welcome-date">
      ✦ {new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}
    </span>

    <h2>
      {new Date().getHours() < 12
        ? "Good morning"
        : new Date().getHours() < 17
        ? "Good afternoon"
        : "Good evening"}
      ,{" "}
      <span>
        {profile?.name || profile?.username || "User"}
      </span>{" "}
      👋
    </h2>

    <p>
      Manage your forms, responses and performance from one place.
    </p>

  </div>
</motion.div>

        <section className="content">
          <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <GlassCard title="Total Forms" value={forms.length} className="total-forms-card" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
            <GlassCard title="Published" value={publishedForms} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }}>
            <GlassCard title="Draft" value={draftForms} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24 }}>
            <GlassCard title="Responses" value={responseCount} />
          </motion.div>
        </section>

        <section className="dashboard-bottom">
          
          <motion.div
            className="recent-section"
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
          >
            <div className="section-heading">
              <div>
                <span className="section-kicker">PORTFOLIO</span>
                <h2>My Forms</h2>
              </div>
              <button className="section-link-btn" onClick={() => navigate("/forms")}>
                View all
              </button>
            </div>

            <div className="table-wrap">
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>Form Name</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-table">No forms created yet.</td>
                    </tr>
                  ) : (
                    forms.map((form) => (
                      <tr key={form.id}>
                        <td>
                          <div className="form-name-cell">
                            <div className="form-icon">F</div>
                            <strong>{form.title}</strong>
                          </div>
                        </td>
                        <td>V{form.latest_version}</td>
                        <td>
                          <span className={`status ${form.status}`}>{form.status}</span>
                        </td>
                        <td className="action-buttons">
                          <button className="rules-btn" onClick={() => viewRules(form)} title="View Conditional Rules">
                            Rules
                          </button>
                          <Link to={`/view/${form.id}`} title="View form">
                            <button className="view-btn"><Eye size={16} /></button>
                          </Link>

                          {form.status === "published" && (
                            <>
                              <Link to={`/edit/${form.id}`} title="Edit form">
                                <button className="edit-btn"><Pencil size={16} /></button>
                              </Link>
                              <button className="archive-btn" onClick={() => archiveForm(form.id)} title="Archive form">
                                <Archive size={16} />
                              </button>
                              <button className="delete-btn" onClick={() => deleteForm(form.id)} title="Delete form">
                                <Trash2 size={16} />
                              </button>
                              <button
                                className="action-btn"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/form/${form.latest_uuid}`);
                                  alert("Link Copied");
                                }}
                                title="Share form"
                              >
                                <Share2 size={18} />
                              </button>
                            </>
                          )}

                          {form.status === "draft" && (
                            <>
                              <Link to={`/edit/${form.id}`} title="Edit form">
                                <button className="edit-btn"><Pencil size={16} /></button>
                              </Link>
                              <button className="publish-btn" onClick={() => publishForm(form.id)} title="Publish form">
                                <Send size={16} />
                              </button>
                              <button className="delete-btn" onClick={() => deleteForm(form.id)} title="Delete form">
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}

                          {form.status === "archived" && (
                            <>
                              <button className="restore-btn" onClick={() => restoreForm(form.id)} title="Restore form">
                                <RotateCcw size={16} />
                              </button>
                              <button className="delete-btn" onClick={() => deleteForm(form.id)} title="Delete form">
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
          

          <motion.aside
            className="stats-panel"
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
          >
            <div className="section-heading compact">
              <div>
                <span className="section-kicker">INSIGHTS</span>
                <h2>Quick Stats</h2>
              </div>
            </div>

            <div className="chart-card">
              <DashboardPieChart published={publishedForms} draft={draftForms} />
            </div>

            <div className="stat-list">
              <div className="stat-row">
                <span>Total Forms</span>
                <strong>{forms.length}</strong>
              </div>
              <div className="stat-row">
                <span>Published</span>
                <strong>{publishedForms}</strong>
              </div>
              <div className="stat-row">
                <span>Draft</span>
                <strong>{draftForms}</strong>
              </div>
              <div className="stat-row">
                <span>Total Responses</span>
                <strong>{responseCount}</strong>
              </div>
            </div>
          </motion.aside>
        </section>

        {selectedRuleForm && (
          <motion.section
            className="conditional-rules-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="rules-header">
              <div>
                <span className="section-kicker">AUTOMATION</span>
                <h2>Conditional Rules</h2>
                <p>{selectedRuleForm.title}</p>
              </div>
              <button className="close-rules-btn" onClick={closeRules}>×</button>
            </div>

            {rulesLoading ? (
              <p className="rules-message">Loading rules...</p>
            ) : selectedRules.length === 0 ? (
              <div className="no-rules">
                <h3>No Conditional Rules</h3>
                <p>This form does not contain any conditional rules.</p>
              </div>
            ) : (
              <div className="rules-list">
                {selectedRules.map((rule, index) => (
                  <motion.div
                    className="rule-card"
                    key={rule.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                  >
                    <div className="rule-condition">
                      <span className="rule-label">IF</span>
                      <strong>{rule.source_field_label}</strong>
                      <span className="rule-operator">{rule.operator}</span>
                      <span className="rule-value">{rule.expected_value}</span>
                    </div>
                    <div className="rule-arrow">↓</div>
                    <div className="rule-action">
                      <span className="rule-label">{rule.action?.toUpperCase()}</span>
                      <strong>{rule.target_field_label}</strong>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
