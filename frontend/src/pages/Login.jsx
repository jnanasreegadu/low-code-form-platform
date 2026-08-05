import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Login.css";

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
      <div className="login-card">

        <h1>FormFlow</h1>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e)=>setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button onClick={handleLogin}>
          Login
        </button>
        <div className="demo-credentials">
  <p><strong>Demo Account</strong></p>
  <p>Username: <strong>demo</strong></p>
  <p>Password: <strong>demo123</strong></p>
</div>

      </div>
    </div>
  );
}

export default Login;