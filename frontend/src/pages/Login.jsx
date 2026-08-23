import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Login.css";
import { GoogleLogin } from "@react-oauth/google";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const response = await api.post("login/", {
        username,
        password,
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("username", response.data.username);

      alert("Login Successful!");

      navigate("/");
    } catch (err) {
      alert("Invalid Username or Password");
      console.log(err);
    }
  };

  return (
    <div className="login-page">

      <div className="login-glow glow-one"></div>
      <div className="login-glow glow-two"></div>

      <div className="login-card">

        {/* BRAND */}
        <div className="login-brand">
          <div className="login-logo">F</div>

          <div>
            <h1>FormFlow</h1>
            <span>Admin workspace</span>
          </div>
        </div>

        {/* HEADING */}
        <div className="login-heading">
          <span>WELCOME BACK</span>
          <h2>Sign in to your account</h2>
          <p>
            Manage your forms, responses and performance from one place.
          </p>
        </div>

        {/* FORM */}
        <div className="login-form">

          <div className="input-group">
            <label>Username</label>

            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="login-btn" onClick={handleLogin}>
            Login
          </button>

          <div className="login-divider">
            <span>OR</span>
          </div>
          <div className="google-login-wrapper">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              console.log("GOOGLE SUCCESS:", credentialResponse);

              try {
                const response = await api.post("google-login/", {
                  token: credentialResponse.credential,
                });

                console.log("BACKEND RESPONSE:", response.data);
                localStorage.setItem("token", response.data.token);
                localStorage.setItem("username", response.data.username);
                
                navigate("/");
                
              } catch (err) {
                console.log("BACKEND ERROR:", err);
                console.log("ERROR RESPONSE:", err.response?.data);
                console.log("ERROR STATUS:", err.response?.status);

                alert("Google Backend Login Failed");
              }
            }}
            onError={() => {
              console.log("GOOGLE OAUTH ERROR");
              alert("Google OAuth Failed");
            }}
          />
          </div>

          <button
            className="create-account-btn"
            onClick={() => navigate("/register")}
          >
            Create Account
          </button>

        </div>

        <div className="login-footer">
          <span>Secure access to your FormFlow workspace</span>
        </div>

      </div>
    </div>
  );
}

export default Login;