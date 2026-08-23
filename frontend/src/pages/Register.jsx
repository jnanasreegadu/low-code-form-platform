import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Login.css";

function Register() {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const navigate = useNavigate();

  const handleRegister = async () => {
    if (
      !username ||
      !name ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      alert("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      await api.post("register/", {
        username,
        name,
        email,
        password,
      });

      alert("Account created successfully!");
      navigate("/login");

    } catch (err) {
      alert(
        err.response?.data?.error ||
        "Account creation failed"
      );

      console.log(err);
    }
  };

  return (
    <div className="login-page">

      <div className="login-glow glow-one"></div>
      <div className="login-glow glow-two"></div>

      <div className="login-card register-card">

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
          <span>GET STARTED</span>

          <h2>Create your account</h2>

          <p>
            Create your FormFlow workspace and start building
            powerful forms.
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
            <label>Name</label>

            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Confirm Password</label>

            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
            />
          </div>

          <button
            className="login-btn"
            onClick={handleRegister}
          >
            Create Account
          </button>

          <div className="login-divider">
            <span>OR</span>
          </div>

          <button
            className="create-account-btn"
            onClick={() => navigate("/login")}
          >
            Back to Login
          </button>

        </div>

        <div className="login-footer">
          <span>
            Secure access to your FormFlow workspace
          </span>
        </div>

      </div>
    </div>
  );
}

export default Register;