import { useEffect, useState } from "react";
import "../styles/Dashboard.css";
import GlassCard from "../components/GlassCard";
import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import DashboardPieChart from "../components/DashboardPieChart";
import { motion } from "framer-motion";
import { Archive } from "lucide-react";
import { Share2 } from "lucide-react";
import Loader from "../components/Loader";
import {
  Eye,
  Pencil,
  Trash2,
  RotateCcw,
  Send,
} from "lucide-react";
function Dashboard() {
  const [forms, setForms] = useState([]);

  const [responseCount, setResponseCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
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
  </div>

  <button
  className="profile"
  onClick={logout}
>
  Logout
</button>
</motion.nav>

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
>

<Share2 size={18}/>

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
    >
      <RotateCcw size={16}/>
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

        <motion.div className="stats-panel"
        initial={{ opacity: 0, x: 80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}>
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
        </div>
      </div>
  );
}

export default Dashboard;