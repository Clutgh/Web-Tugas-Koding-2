import { useState } from "react";
import "./App.css";
import logo from "./assets/logo nasgor.png";
import Kasir from "./kasir";

type Profile = {
  id: string;
  nama: string;
  role: string;
};

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  const handleLogin = () => {
    // LOGIN ADMIN
    if (email === "wendrybelajar@gmail.com" && password === "Wendry12") {
      setProfile({
        id: "admin",
        nama: "Admin",
        role: "admin",
      });

      return;
    }

    // LOGIN USER
    if (email.trim() !== "" && password.trim() !== "") {
      setProfile({
        id: "user",
        nama: email,
        role: "user",
      });

      return;
    }

    alert("Email dan password harus diisi");
  };

  if (profile) {
    return <Kasir />;
  }

  return (
    <div className="login-box">
      <div className="header">
        <img src={logo} alt="Logo Nasi Goreng Nusantara" className="logo" />

        <h1>Masuk Kasir</h1>
      </div>

      <p>Login sebagai admin / pelanggan untuk melanjutkan</p>

      <div className="input-group">
        <input
          type="email"
          placeholder="Masukkan email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Masukkan password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default App;
