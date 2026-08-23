import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Mail, CheckCircle } from "lucide-react";
import api from "../services/api";
import "../styles/Identityselector.css";


function IdentitySelector({ submissionId, onVerified }) {
  const [googleEmail, setGoogleEmail] = useState(null);
  const [customEmail, setCustomEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    try {
      const res = await api.post("respondent/google-verify/", {
        token: credentialResponse.credential,
      });

      const userEmail = res.data.email;
      setGoogleEmail(userEmail);
      setVerified(true);
      onVerified(userEmail);
    } catch (err) {
      console.log("RESPONDENT GOOGLE VERIFY ERROR:", err);
      setError(
        err.response?.data?.error || "Could not verify Google account."
      );
    }
  };

  const handleCustomEmailSubmit = (e) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    const userEmail = customEmail.trim().toLowerCase();
    setGoogleEmail(userEmail);
    setVerified(true);
    onVerified(userEmail);
  };

  const switchAccount = () => {
    setGoogleEmail(null);
    setCustomEmail("");
    setVerified(false);
    setError("");
    if (onVerified) onVerified(null);
  };

  return (
    <div className="identity-selector">
      <div className="identity-header">
        <Mail size={16} /> Identity & Sign-In
      </div>

      {error && <div className="identity-error">{error}</div>}

      {!googleEmail && (
        <div className="identity-auth-box" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
          <div className="identity-google-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google sign-in failed.")}
            />
          </div>

          <div style={{ textAlign: "center", color: "#64748b", fontSize: "12px", fontWeight: "600" }}>
            OR ENTER EMAIL
          </div>

          <form onSubmit={handleCustomEmailSubmit} style={{ display: "flex", gap: "8px" }}>
            <input
              type="email"
              placeholder="e.g. name@example.com"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                fontSize: "14px",
              }}
              required
            />
            <button
              type="submit"
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                border: "none",
                background: "#00e5ff",
                color: "#0f172a",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </form>
        </div>
      )}

      {googleEmail && (
        <div className="identity-account">
          <div className="identity-email-row">
            <span>{googleEmail}</span>

            <button
              type="button"
              className="identity-switch-btn"
              onClick={switchAccount}
            >
              Switch account
            </button>
          </div>

          {verified && (
            <div className="identity-verified-note">
              <CheckCircle size={16} /> Signed in as {googleEmail}
            </div>
          )}
        </div>
      )}

      <div className="identity-help-text">
        Your email will be associated with this response.
      </div>
    </div>
  );
}



export default IdentitySelector;