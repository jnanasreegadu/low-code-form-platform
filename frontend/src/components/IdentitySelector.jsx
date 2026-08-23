import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Mail, CheckCircle } from "lucide-react";
import api from "../services/api";
import "../styles/Identityselector.css";


function IdentitySelector({ submissionId, onVerified }) {
  const [googleEmail, setGoogleEmail] = useState(null);
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

  const switchAccount = () => {
    setGoogleEmail(null);
    setVerified(false);
    setError("");
    if (onVerified) onVerified(null);
  };

  return (
    <div className="identity-selector">
      <div className="identity-header">
        <Mail size={16} /> Sign In with Google
      </div>

      {error && <div className="identity-error">{error}</div>}

      {!googleEmail && (
        <div className="identity-google-wrapper" style={{ marginTop: "12px", display: "flex", justifyContent: "center" }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google sign-in failed. Please try again.")}
          />
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
        Sign in with Google to fill out and submit this form.
      </div>
    </div>
  );
}

export default IdentitySelector;