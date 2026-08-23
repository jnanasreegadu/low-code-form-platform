import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Mail, CheckCircle } from "lucide-react";
import api from "../services/api";
import "../styles/IdentitySelector.css";

function IdentitySelector({ submissionId, onVerified }) {
  const [googleEmail, setGoogleEmail] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");

    try {
      const res = await api.post("respondent/google-verify/", {
        token: credentialResponse.credential,
      });

      setGoogleEmail(res.data.email);
      setOtpSent(false);
      setVerified(false);
      setOtpCode("");
    } catch (err) {
      console.log("RESPONDENT GOOGLE VERIFY ERROR:", err);
      setError(
        err.response?.data?.error || "Could not verify Google account."
      );
    }
  };

  const sendOtp = async () => {
    if (!submissionId || !googleEmail) return;

    setSending(true);
    setError("");

    try {
      await api.post("respondent/otp/send/", {
        submission_id: submissionId,
        email: googleEmail,
      });

      setOtpSent(true);
    } catch (err) {
      console.log("SEND OTP ERROR:", err);
      setError(
        err.response?.data?.error || "Could not send verification code."
      );
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpCode) return;

    setVerifying(true);
    setError("");

    try {
      await api.post("respondent/otp/verify/", {
        submission_id: submissionId,
        email: googleEmail,
        code: otpCode,
      });

      setVerified(true);
      onVerified(googleEmail);
    } catch (err) {
      console.log("VERIFY OTP ERROR:", err);
      setError(err.response?.data?.error || "Incorrect or expired code.");
    } finally {
      setVerifying(false);
    }
  };

  const switchAccount = () => {
    setGoogleEmail(null);
    setOtpSent(false);
    setOtpCode("");
    setVerified(false);
    setError("");
  };

  return (
    <div className="identity-selector">
      <div className="identity-header">
        <Mail size={16} /> Select your email
      </div>

      {error && <div className="identity-error">{error}</div>}

      {!googleEmail && (
        <div className="identity-google-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google sign-in failed.")}
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

          {!otpSent && !verified && (
            <button
              type="button"
              className="identity-send-otp-btn"
              onClick={sendOtp}
              disabled={sending}
            >
              {sending ? "Sending code..." : "Send verification code"}
            </button>
          )}

          {otpSent && !verified && (
            <div className="identity-otp-row">
              <input
                type="text"
                placeholder="Enter 6-digit code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />

              <button
                type="button"
                className="identity-verify-btn"
                onClick={verifyOtp}
                disabled={verifying}
              >
                {verifying ? "Verifying..." : "Verify"}
              </button>

              <button
                type="button"
                className="identity-resend-btn"
                onClick={sendOtp}
                disabled={sending}
              >
                Resend code
              </button>
            </div>
          )}

          {verified && (
            <div className="identity-verified-note">
              <CheckCircle size={16} /> Verified
            </div>
          )}
        </div>
      )}

      <div className="identity-help-text">
        This email will be used for verification and submission confirmation.
      </div>
    </div>
  );
}


export default IdentitySelector;