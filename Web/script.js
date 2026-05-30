function login() {
  const email = document.getElementById("email").value;

  const password = document.getElementById("password").value;

  const pesan = document.getElementById("pesan");

  if (email === "admin@kasir.com" && password === "123456") {
    pesan.innerText = "Login berhasil";
  } else {
    pesan.innerText = "Email atau password salah";
  }
}
