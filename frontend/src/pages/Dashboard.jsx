import { useEffect, useState } from "react";
import "../styles/Dashboard.css";
import GlassCard from "../components/GlassCard";
import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import DashboardPieChart from "../components/DashboardPieChart";
import { motion } from "framer-motion";
import { Archive } from "lucide-react";

import Loader from "../components/Loader";
import {
  Eye,
  Pencil,
  Trash2,
  RotateCcw,
  Share2,
  Send,
  User,
} from "lucide-react";
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
      .then((response) => {
        setProfile(response.data);
      })
      .catch((err) => {
        console.log("PROFILE ERROR:", err);
      });
  }, []);
  useEffect(() => {

    Promise.all([
        api.get("forms/"),
        api.get("submissions/count/")
    ])
    .then(([formsRes, submissionRes])=>{
        setForms(formsRes.data);
        setResponseCount(submissionRes.data.count);
    })
    .catch(console.log)
    .finally(()=>{
        setLoading(false);
    });
  },[]);
  if(loading){
    return <Loader/>
  }
  const publishedForms = forms.filter(
    (form) => form.status === "published"
  ).length;


const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");

  navigate("/login");
};
  const draftForms = forms.filter(
    (form) => form.status === "draft"
  ).length;
  const viewRules = async (form) => {
    try {
      setRulesLoading(true);
  
      const response = await api.get(`forms/${form.id}/`);
  
      const data = response.data;
      console.log("FORM DATA:", data);
      console.log("CONDITIONAL RULES:", data.conditional_rules);
  
      setSelectedRuleForm(data);
  
      setSelectedRules(
        data.conditional_rules || []
      );
  
    } catch (error) {
      console.log("RULES ERROR:", error);
      alert("Failed to load conditional rules");
    } finally {
      setRulesLoading(false);
    }
  };
  const deleteForm = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this form"
    );
  
    if (!confirmDelete) return;
  
    try {
      await api.delete(`forms/${id}/`);
  
      setForms(
        forms.filter((form) => form.id !== id)
      );
      alert("Form deleted successfully!")
    } catch (err) {
      console.log(err);
      alert("Delete Failed");
    }
  };
  const restoreForm = async (id) => {
    try {
      await api.post(`forms/${id}/restore/`);
  
      setForms(
        forms.map((form) =>
          form.id === id
            ? { ...form, status: "published" }
            : form
        )
      );
  
      alert("Form Restored Successfully!");
    } catch (err) {
      console.log(err);
    }
  };
  const archiveForm = async (id) => {
    try {
      await api.post(`forms/${id}/archive/`);
  
      setForms(
        forms.map((form) =>
          form.id === id
            ? { ...form, status: "archived" }
            : form
        )
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
  
      setForms(
        forms.map((form) =>
          form.id === id
            ? { ...form, status: "published" }
            : form
        )
      );
  
      alert("Form Published Successfully!");
    } catch (err) {
      console.log(err);
      alert("Publish Failed");
    }
  };

  return (
    <div className="dashboard">
      {/* Navbar */}
      <motion.nav className="navbar"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      >
  <div className="logo">FormFlow</div>

  <div className="nav-links">
  <Link to="/">Dashboard</Link>
  <Link to="/forms">Forms</Link>
  <Link to="/responses">Responses</Link>

  <button
    className="analytics-nav-btn"
    onClick={() => navigate("/analytics")}
  >
    Analytics
  </button>
</div>

<div className="ff-profile-container">

  <button
    className="ff-profile-btn"
    onClick={() => setShowProfile(!showProfile)}
  >
    <User size={18} />
    Profile
  </button>

  {showProfile && (
    <div className="ff-profile-card">

      <h3>Profile</h3>

      {profile ? (
        <div className="ff-user-details">

          <div className="ff-detail">
            <span>Username</span>
            <strong>{profile.username}</strong>
          </div>

          <div className="ff-detail">
            <span>Name</span>
            <strong>{profile.name || "Not provided"}</strong>
          </div>

          <div className="ff-detail">
            <span>Email</span>
            <strong>{profile.email || "Not provided"}</strong>
          </div>

        </div>
      ) : (
        <p className="ff-loading">Loading...</p>
      )}

      <div className="ff-divider"></div>

      <button
        className="ff-profile-link"
        onClick={() => {
          setShowProfile(false);
          navigate("/forms");
        }}
      >
        My Forms
      </button>

      <button
        className="ff-profile-link"
        onClick={() => {
          setShowProfile(false);
          navigate("/responses");
        }}
      >
        Responses
      </button>

      <button
        className="ff-profile-link"
        onClick={() => {
          setShowProfile(false);
          navigate("/analytics");
        }}
      >
        Analytics
      </button>

      <div className="ff-divider"></div>

      <button
        className="ff-logout"
        onClick={logout}
      >
        Logout
      </button>

    </div>
  )}

</div>
</motion.nav>
      {/* Create Form Button */}
      <div className="dashboard-actions">

      <motion.button
  className="create-form-dashboard-btn"
  onClick={() => navigate("/create")}
  initial={{ opacity: 0, y: -15, scale: 0.95 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  whileHover={{
    scale: 1.05,
    y: -3,
  }}
  whileTap={{
    scale: 0.96,
  }}
  transition={{
    duration: 0.35,
    ease: "easeOut",
  }}
>
  + Create Form
</motion.button>

      </div>


      {/* Cards */}
      <div className="content">
      <motion.div
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  <GlassCard
    title="Total Forms"
    value={forms.length}
    className="total-forms-card"
  />
</motion.div>

<motion.div
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 0.2 }}
>
  <GlassCard
    title="Published"
    value={publishedForms}
  />
</motion.div>

<motion.div
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 0.4 }}
>
  <GlassCard
    title="Draft"
    value={draftForms}
  />
</motion.div>   

<motion.div
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 0.6 }}
>
  <GlassCard
    title="Responses"
    value={responseCount}
  />
</motion.div>
      </div>

      {/* Bottom Section */}
      <div className="dashboard-bottom">
        {/* Recent Forms */}
        <motion.div className="recent-section"
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.7 }}>
          <h2>Recent Forms</h2>

          <table className="recent-table">
            <thead>
              <tr>
                <th>Form Name</th>
                <th>Version</th>
                <th>Status</th>
                <th>Action</th>
                
                              
              </tr>
            </thead>

            <tbody>
              {forms.map((form) => (
                <tr key={form.id}>
                  <td>{form.title}</td>

                <td>
                  V{form.latest_version}
                </td>

                <td>
                  <span className={`status ${form.status}`}>
                    {form.status}
                  </span>
                </td>
                  <td className="action-buttons">

                  <button
  className="rules-btn"
  onClick={() => viewRules(form)}
  title="View Conditional Rules"
>
  Rules
</button>
  <Link to={`/view/${form.id}`}>
    <button className="view-btn">
      <Eye size={16}/>
    </button>
  </Link>

  {form.status === "published" && (
    <>
      <Link to={`/edit/${form.id}`}>
        <button className="edit-btn">
          <Pencil size={16}/>
        </button>
      </Link>

      <button
        className="archive-btn"
        onClick={() => archiveForm(form.id)}
      >
        <Archive size={16}/>
      </button>
      
      <button
      className="delete-btn"
      onClick={() => deleteForm(form.id)}
    >
      <Trash2 size={16}/>
    </button>
    <button
className="action-btn"
onClick={()=>{
  navigator.clipboard.writeText(
    `${window.location.origin}/form/${form.latest_uuid}`
    );

alert("Link Copied");
}}
title="Share Form"
>

<Share2 size={18} strokeWidth={2.2}/>

</button>
    </>
  )}
  {form.status === "draft" && (
  <>
    <Link to={`/edit/${form.id}`}>
      <button className="edit-btn">
        <Pencil size={16} />
      </button>
    </Link>

    <button
      className="publish-btn"
      onClick={() => publishForm(form.id)}
    >
      <Send size={16} />
    </button>

    <button
      className="delete-btn"
      onClick={() => deleteForm(form.id)}
    >
      <Trash2 size={16} />
    </button>
  </>
)}

  {form.status === "archived" && (
    <>
    <button
      className="restore-btn"
      onClick={() => restoreForm(form.id)}
      title="Restore Form"
    >
      <RotateCcw size={16} strokeWidth={2.2}/>
    </button>
    <button
    className="delete-btn"
    onClick={() => deleteForm(form.id)}
  >
    <Trash2 size={16}/>
  </button>
  </>
  )}

</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
        <div className="dashboard-right">

<motion.div
  className="stats-panel"
  initial={{ opacity: 0, x: 80 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: 0.5, duration: 0.7 }}
>

  <h2>Quick Stats</h2>

  <DashboardPieChart
    published={publishedForms}
    draft={draftForms}
  />

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

</motion.div>


{selectedRuleForm && (
  <motion.div
    className="conditional-rules-panel"
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
  >

    <div className="rules-header">

      <div>
        <h2>Conditional Rules</h2>

        <p>
          {selectedRuleForm.title}
        </p>
      </div>

      <button
        className="close-rules-btn"
        onClick={() => {
          setSelectedRuleForm(null);
          setSelectedRules([]);
        }}
      >
        ×
      </button>

    </div>


    {rulesLoading ? (

      <p className="rules-message">
        Loading rules...
      </p>

    ) : selectedRules.length === 0 ? (

      <div className="no-rules">

        <h3>No Conditional Rules</h3>

        <p>
          This form does not contain any conditional rules.
        </p>

      </div>

    ) : (

      <div className="rules-list">

        {selectedRules.map((rule, index) => {

          return (
            <motion.div
              className="rule-card"
              key={rule.id || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: index * 0.08
              }}
            >

              <div className="rule-condition">

                <span className="rule-label">
                  IF
                </span>

                <strong>
                  {rule.source_field_label}
                </strong>

                <span className="rule-operator">
                  {rule.operator}
                </span>

                <span className="rule-value">
                  {rule.expected_value}
                </span>

              </div>


              <div className="rule-arrow">
                ↓
              </div>


              <div className="rule-action">

                <span className="rule-label">
                  {rule.action?.toUpperCase()}
                </span>

                <strong>
                  {rule.target_field_label}
                </strong>

              </div>

            </motion.div>
          );
        })}

      </div>

    )}

     </motion.div>
 )}
</div>
    </div>
  </div>
  );
}

export default Dashboard;