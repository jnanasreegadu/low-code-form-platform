import { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/Forms.css";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Pencil, Trash2, Copy, Link, } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Loader from "../components/Loader";

function Forms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [shareLink, setShareLink] = useState("");
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [shareMode, setShareMode] = useState("public");
  const [expiry, setExpiry] = useState("24");
  
  
  const [oneTimeLink, setOneTimeLink] = useState("");
  const [creatingOneTimeLink, setCreatingOneTimeLink] = useState(false);
  const [publicExpiry, setPublicExpiry] = useState("");
  const [savingPublicExpiry, setSavingPublicExpiry] = useState(false);
  const [selectedFormUuid, setSelectedFormUuid] = useState(null);
  const [oneTimeExpiresAt, setOneTimeExpiresAt] = useState("");
  const shareForm = (form) => {

    if (!form.latest_uuid) {
      alert("This form has no published version yet. Publish it before sharing.");
      return;
    }

    const formLink =
      `${window.location.origin}/form/${form.latest_uuid}`;

    setShareLink(formLink);

    setSelectedFormUuid(form.latest_uuid);

    setOneTimeLink("");

    setPublicExpiry("");

    setShowSharePopup(true);
  };
  const createOneTimeLink = async () => {

    if (!selectedFormUuid) {
      alert("Form version UUID not found.");
      console.log("SELECTED FORM UUID:", selectedFormUuid);
      return;
    }
  
    try {
  
      setCreatingOneTimeLink(true);
  
      const response = await api.post(
        `one-time/create/${selectedFormUuid}/`,
        {
          expiry_hours: Number(expiry)
        }
      );
  
      const rawLink = response.data?.link || "";
      const token = response.data?.token || (rawLink.includes("/one-time/") ? rawLink.split("/one-time/")[1].replace("/", "") : "");
      const finalLink = token ? `${window.location.origin}/one-time/${token}` : rawLink;
      setOneTimeLink(finalLink);

      setOneTimeExpiresAt(
        response.data.expires_at
      );

  
    } catch (error) {
  
      console.error(
        "ONE TIME LINK ERROR:",
        error
      );
  
      console.error(
        "SERVER RESPONSE:",
        error.response?.data
      );
  
      alert(
        error.response?.data?.error ||
        "Failed to create one-time link"
      );
  
    } finally {
  
      setCreatingOneTimeLink(false);
  
    }
  };
  const setPublicFormExpiry = async (uuid, expiryHours) => {
    try {
      setSavingPublicExpiry(true);
  
      const response = await api.post(
        `public/${uuid}/expiry/`,
        {
          expiry_hours:
            expiryHours === ""
              ? 0
              : Number(expiryHours),
        }
      );
  
      console.log("PUBLIC EXPIRY:", response.data);
  
      setPublicExpiry(expiryHours);
  
    } catch (error) {
      console.error("PUBLIC EXPIRY ERROR:", error);
      console.error(
        "SERVER RESPONSE:",
        error.response?.data
      );
  
      alert(
        error.response?.data?.error ||
        "Failed to update public form expiry"
      );
    } finally {
      setSavingPublicExpiry(false);
    }
  };
  const duplicateForm = async (id) => {
    try {
      const response = await api.post(`forms/${id}/duplicate/`);
  
      alert("Form duplicated successfully!");
  
      // Refresh forms list
      const updatedResponse = await api.get("forms/");
      setForms(updatedResponse.data);
  
    } catch (error) {
      console.error("DUPLICATE ERROR:", error);
      console.error("SERVER RESPONSE:", error.response?.data);
  
      alert(
        error.response?.data?.detail ||
        "Failed to duplicate form"
      );
    }
  };

  useEffect(() => {
    setLoading(true);
    api
      .get("forms/")
      .then((response) => {
        setForms(response.data);
      })
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader text="Loading forms..." />;


  // DELETE FORM
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this form?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`forms/${id}/`);

      setForms((prevForms) =>
        prevForms.filter((form) => form.id !== id)
      );

      alert("Form deleted successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to delete form");
    }
  };

  return (
    <>
      <Sidebar />
    <div className="forms-page">

      {/* HEADER */}
      <div className="forms-header">

        <h1>Forms</h1>

        <div className="forms-header-actions">

          <button
            className="back-dashboard-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </button>

          <button
            className="create-form-btn"
            onClick={() => navigate("/create")}
          >
            + Create Form
          </button>

        </div>

      </div>

      {/* TABLE */}
      {showSharePopup && (
  <div className="share-overlay">

    <div className="share-popup">

      {/* ================= HEADER ================= */}

      <div className="share-header">

        <div className="share-title-row">

          <div className="share-main-icon">
            🔗
          </div>

          <div>
            <h2>Share Form</h2>

            <p>
              Choose how you want to share this form with others.
            </p>
          </div>

        </div>

        <button
          className="share-close"
          onClick={() => {
            setShowSharePopup(false);
          
            setOneTimeLink("");
            setOneTimeExpiresAt("");
          
            setShareMode("public");
            setPublicExpiry("");
            setSelectedFormUuid(null);
          }}
        >
          ×
        </button>

      </div>


      {/* ================= SHARE TABS ================= */}

      <div className="share-tabs">

        <button
          className={`share-tab ${
            shareMode === "public" ? "active" : ""
          }`}
          onClick={() => setShareMode("public")}
        >

          <span className="tab-icon">
            🌐
          </span>

          <span>
            <strong>Public Form</strong>
            <small>Anyone can submit</small>
          </span>

        </button>


        <button
          className={`share-tab ${
            shareMode === "one-time" ? "active one-time-active" : ""
          }`}
          onClick={() => {
            setShareMode("one-time");
            setOneTimeLink("");
            setOneTimeExpiresAt("");
          }}
        >

          <span className="tab-icon">
            🔒
          </span>

          <span>
            <strong>One-Time View Form</strong>
            <small>Only one submission allowed</small>
          </span>

        </button>

      </div>


      {/* ================================================= */}
      {/* PUBLIC FORM */}
      {/* ================================================= */}

      {shareMode === "public" && (

        <div className="share-content">

          <div className="content-heading">

            <div className="content-icon public-icon">
              🌐
            </div>

            <div>

              <h3>Public Form</h3>

              <p>
                Anyone with this link can submit the form
                any number of times.
              </p>

            </div>

          </div>
          {/* ================= PUBLIC FORM EXPIRY ================= */}

<div className="public-expiry-section">

<div className="expiry-header">

  <div className="expiry-icon">
    ⏳
  </div>

  <div>
    <h3>Form Expiry</h3>

    <p>
      Choose how long this public form should remain available.
    </p>
  </div>

</div>

<div className="expiry-control">

  <select
    value={publicExpiry}
    onChange={(e) => {
      const value = e.target.value;

      setPublicExpiry(value);

      if (selectedFormUuid) {
        setPublicFormExpiry(
          selectedFormUuid,
          value
        );
      }

    }}
    disabled={savingPublicExpiry}
  >

    <option value="">
      No Expiry
    </option>

    <option value="1">
      1 Hour
    </option>

    <option value="6">
      6 Hours
    </option>

    <option value="24">
      24 Hours
    </option>

    <option value="168">
      7 Days
    </option>

  </select>

</div>

</div>

          <div className="divider"></div>
          


          {/* DIRECT LINK */}

          <div className="share-section">

            <div className="section-heading">

              <div className="section-icon">
                🔗
              </div>

              <div>

                <h4>Direct Link</h4>

                <p>
                  Share this link with anyone to let them
                  access the form.
                </p>

              </div>

            </div>


            <div className="link-row">

              <input
                type="text"
                value={shareLink}
                readOnly
              />

              <button
                className="copy-btn"
                onClick={async () => {

                  await navigator.clipboard.writeText(
                    shareLink
                  );

                  alert("Public link copied!");

                }}
              >
                📋 Copy
              </button>

            </div>

          </div>


          <div className="divider"></div>


          {/* QR CODE */}

          <div className="share-section">

            <div className="section-heading">

              <div className="section-icon">
                ▦
              </div>

              <div>

                <h4>QR Code</h4>

                <p>
                  Scan this QR code to open the form quickly.
                </p>

              </div>

            </div>


            <div className="qr-wrapper">

              <div className="qr-frame">

                <QRCodeSVG
                  value={shareLink}
                  size={220}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />

              </div>

            </div>


            <div className="share-tip">

              <span>💡</span>

              <p>
                Print or share this QR code to make it easy
                for others to access the form.
              </p>

            </div>

          </div>

        </div>

      )}


      {/* ================================================= */}
      {/* ONE TIME FORM */}
      {/* ================================================= */}

      {shareMode === "one-time" && (

        <div className="share-content one-time-content">

          <div className="content-heading">

            <div className="content-icon one-time-icon">
              🔒
            </div>

            <div>

              <h3>One-Time View Form</h3>

              <p>
                This form can be submitted only once.
                After submission, this link cannot be used again.
              </p>

            </div>

          </div>


          <div className="divider"></div>


          {!oneTimeLink ? (

            /* ================= BEFORE GENERATION ================= */

            <div className="one-time-generate">

              <div className="expiry-box">

                <label>
                  ⏱️ Link Expiry
                </label>

                <p>
                  Choose how long this one-time link
                  should remain active.
                </p>


                <select
                  value={expiry}
                  onChange={(e) =>
                    setExpiry(e.target.value)
                  }
                >

                  <option value="1">
                    1 Hour
                  </option>

                  <option value="6">
                    6 Hours
                  </option>

                  <option value="24">
                    24 Hours
                  </option>

                  <option value="168">
                    7 Days
                  </option>

                </select>

              </div>


              <button
                className="generate-one-time-btn"
                onClick={() => createOneTimeLink()}
                disabled={creatingOneTimeLink}
              >

                🔒

                {creatingOneTimeLink
                  ? " Creating..."
                  : " Generate One-Time Link"}

              </button>


              <div className="one-time-warning">

                <span>⚠️</span>

                <p>
                  Once someone submits this form,
                  the link becomes permanently invalid.
                </p>

              </div>

            </div>

          ) : (

            /* ================= AFTER GENERATION ================= */

            <div className="generated-one-time">

              <div className="generated-badge">
                ✓ One-Time Link Created
              </div>


              {/* LINK */}

              <div className="share-section">

                <div className="section-heading">

                  <div className="section-icon">
                    🔗
                  </div>

                  <div>

                    <h4>One-Time Link</h4>

                    <p>
                      Share this link with the intended recipient.
                    </p>

                  </div>

                </div>


                <div className="link-row">

                  <input
                    type="text"
                    value={oneTimeLink}
                    readOnly
                  />

                  <button
                    className="copy-btn"
                    onClick={async () => {

                      await navigator.clipboard.writeText(
                        oneTimeLink
                      );

                      alert("One-time link copied!");

                    }}
                  >
                    📋 Copy
                  </button>

                </div>

              </div>


              <div className="expiry-display">

                <span>
                  ⏰ Expires after:
                </span>

                <strong>
                  {expiry === "1"
                    ? "1 Hour"
                    : expiry === "6"
                    ? "6 Hours"
                    : expiry === "24"
                    ? "24 Hours"
                    : "7 Days"}
                </strong>

                {oneTimeExpiresAt && (
                  <small>
                    Expires at:{" "}
                    {new Date(oneTimeExpiresAt).toLocaleString()}
                  </small>
                )}

              </div>


              <div className="divider"></div>


              {/* QR */}

              <div className="share-section">

                <div className="section-heading">

                  <div className="section-icon">
                    ▦
                  </div>

                  <div>

                    <h4>QR Code</h4>

                    <p>
                      Scan this QR code to open the
                      one-time form.
                    </p>

                  </div>

                </div>


                <div className="qr-wrapper">

                  <div className="qr-frame">

                    <QRCodeSVG
                      value={oneTimeLink}
                      size={220}
                      level="H"
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />

                  </div>

                </div>


                <div className="share-tip">

                  <span>🔐</span>

                  <p>
                    This QR code can be used only once.
                    After submission, it will expire.
                  </p>

                </div>

              </div>

            </div>

          )}

        </div>

      )}


      {/* ================= FOOTER ================= */}

      <div className="share-footer">

        <span>🛡️</span>

        <p>
          Your form is secure. We don’t collect
          any personal data.
        </p>

      </div>

    </div>

  </div>
)}
      <div className="forms-table-container">

        <table className="forms-table">

          <thead>
            <tr>
              <th>ID</th>
              <th>Form Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

  {forms.map((form) => {

    console.log("FORM DATA:", form);

    return (
      <tr key={form.id}>

        <td>{form.id}</td>

        <td>{form.title}</td>

        <td>
          <span className={`status ${form.status}`}>
            {form.status}
          </span>
        </td>

        <td>

          <div className="form-actions">

            {/* VIEW */}
            <button
              className="action-btn view-btn"
              onClick={() =>
                navigate(`/view/${form.id}`)
              }
              title="View Form"
            >
              <Eye size={18} />
            </button>

            {/* EDIT */}
            <button
              className="action-btn edit-btn"
              onClick={() =>
                navigate(`/edit/${form.id}`)
              }
              title="Edit Form"
            >
              <Pencil size={18} />
            </button>

            {/* SHARE */}
            <button
              className="action-btn share-btn"
              onClick={() => shareForm(form)}
              title="Share Form"
            >
              <Link size={18} />
            </button>

            {/* DUPLICATE */}
            <button
              className="action-btn duplicate-btn"
              onClick={() => duplicateForm(form.id)}
              title="Duplicate Form"
            >
              <Copy size={18} />
            </button>

            {/* DELETE */}
            <button
              className="action-btn delete-btn"
              onClick={() =>
                handleDelete(form.id)
              }
              title="Delete Form"
            >
              <Trash2 size={18} />
            </button>

          </div>

        </td>

      </tr>
    );

  })}

</tbody>

        </table>

      </div>

    </div>
  </>
  );
}

export default Forms;