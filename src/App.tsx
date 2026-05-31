import { useState } from "react";
import "./App.css";
import logo from "./assets/logo nasgor.png";
import Kasir from "./kasir";

type Profile = {
  id: string;
  nama: string;
  role: string;
};

type User = {
  email: string;
  password: string;
};

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isRegister, setIsRegister] = useState(false);

  const [users, setUsers] = useState<User[]>([]);

  const handleRegister = () => {
    if (!email.trim() || !password.trim()) {
      alert("Email dan password harus diisi");
      return;
    }

    // Format email harus valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      alert("Format email tidak valid");
      return;
    }

    // Harus gmail
    if (!email.toLowerCase().endsWith("@gmail.com")) {
      alert("Gunakan email Gmail yang valid (contoh: nama@gmail.com)");
      return;
    }

    // Cek email sudah terdaftar
    const existingUser = users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );

    if (existingUser) {
      alert("Email sudah terdaftar");
      return;
    }

    setUsers([
      ...users,
      {
        email,
        password,
      },
    ]);

    alert("Registrasi berhasil, silakan login");

    setEmail("");
    setPassword("");
    setIsRegister(false);
  };

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

    // LOGIN USER TERDAFTAR
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password,
    );

    if (user) {
      setProfile({
        id: "user",
        nama: user.email,
        role: "user",
      });

      return;
    }

    alert("Akun tidak ditemukan. Silakan daftar terlebih dahulu.");
  };

  if (profile) {
    return <Kasir />;
  }

  return (
    <div className="login-box">
      <div className="header">
        <img src={logo} alt="Logo Nasi Goreng Nusantara" className="logo" />

        <h1>{isRegister ? "Daftar Akun" : "Masuk Kasir"}</h1>
      </div>

      <p>
        {isRegister
          ? "Daftarkan akun terlebih dahulu"
          : "Login sebagai admin atau user"}
      </p>

      <div className="input-group">
        <input
          type="email"
          placeholder="Contoh: nama@gmail.com"
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

      {isRegister ? (
        <>
          <button onClick={handleRegister}>Daftar</button>

          <button className="link-button" onClick={() => setIsRegister(false)}>
            Sudah punya akun? Login
          </button>
        </>
      ) : (
        <>
          <button onClick={handleLogin}>Login</button>

          <button className="link-button" onClick={() => setIsRegister(true)}>
            Belum punya akun? Daftar
          </button>
        </>
      )}
    </div>
  );
}

export default App;
