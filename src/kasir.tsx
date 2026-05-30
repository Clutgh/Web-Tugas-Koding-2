/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import logo from "./assets/logo nasgor.png";

// Interfaces
interface Product {
  id: number;
  nama: string;
  harga: number;
  gambar: string;
  stok: number;
  qty?: number;
}
interface Meja {
  nomor_me_ja: string;
  id: number;
  nomor_meja: string;
  status: string;
}
interface Transaction {
  id: string;
  created_at: string;
  nomor_meja: string;
  total_harga: number;
  nama_pembeli: string;
  metode_bayar: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
}
interface Discount {
  code: string;
  value: number; // Persentase (%)
  minPurchase: number;
}

export default function Kasir() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Product[]>([]);
  const [meja, setMeja] = useState<Meja[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMeja, setSelectedMeja] = useState<Meja | null>(null);
  const [activeMenu, setActiveMenu] = useState("kasir");
  const [searchTerm, setSearchTerm] = useState("");
  const [namaPembeli, setNamaPembeli] = useState("");
  const [metodeBayar, setMetodeBayar] = useState("Tunai");
  const [occupiedUntil, setOccupiedUntil] = useState<{ [key: string]: number }>(
    {},
  );

  // State Diskon
  const [activeDiscount, setActiveDiscount] = useState<Discount | null>(null);

  const availableDiscounts: Discount[] = [
    { code: "HEMAT10", value: 10, minPurchase: 50000 },
    { code: "NASGORJOSS", value: 15, minPurchase: 100000 },
    { code: "PROMO26", value: 5, minPurchase: 0 },
    { code: "KENYANG7", value: 7, minPurchase: 75000 },
    { code: "TRAKTIRAN", value: 12, minPurchase: 150000 },
    { code: "NASGORNEW", value: 20, minPurchase: 200000 },
    { code: "NUSANTARA", value: 8, minPurchase: 30000 },
    { code: "MAKANMAKAN", value: 18, minPurchase: 250000 },
    { code: "LEZAT85", value: 11, minPurchase: 85000 },
    { code: "DISKONSERU", value: 6, minPurchase: 45000 },
  ];

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const fetchData = async () => {
    try {
      const { data: pData } = await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: true });
      const { data: mData } = await supabase
        .from("meja")
        .select("*")
        .order("nomor_meja", { ascending: true });
      const { data: tData } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (pData) setProducts(pData);
      if (mData) setMeja(mData);
      if (tData) setTransactions(tData);
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      setOccupiedUntil((prev) => ({ ...prev }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- LOGIKA DASHBOARD ---
  const subtotal = cart.reduce(
    (sum, item) => sum + item.harga * (item.qty || 1),
    0,
  );
  const discountAmount = activeDiscount
    ? (subtotal * activeDiscount.value) / 100
    : 0;
  const totalHargaFinal = subtotal - discountAmount;

  const today = new Date().toLocaleDateString("id-ID");
  const transaksiHariIni = transactions.filter(
    (t) => new Date(t.created_at).toLocaleDateString("id-ID") === today,
  );
  const totalPendapatanHariIni = transaksiHariIni.reduce(
    (sum, t) => sum + t.total_harga,
    0,
  );
  const targetHarian = 1000000;
  const persentaseTarget = Math.min(
    (totalPendapatanHariIni / targetHarian) * 100,
    100,
  );

  // Fungsi Kalkulasi Top 5 Menu
  const getTopProducts = () => {
    const counts: { [key: string]: number } = {};
    transactions.forEach((t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      t.items?.forEach((item: any) => {
        counts[item.nama] = (counts[item.nama] || 0) + (item.qty || 0);
      });
    });

    return Object.entries(counts)
      .map(([nama, qty]) => ({ nama, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  };

  const topProducts = getTopProducts();

  // --- HANDLERS ---
  const updateStockManual = async (
    id: number,
    currentStock: number,
    amount: number,
  ) => {
    const newStock = (currentStock || 0) + amount;
    if (newStock < 0) return;
    await supabase.from("products").update({ stok: newStock }).eq("id", id);
    fetchData();
  };

  const addToCart = (product: Product) => {
    if (product.stok <= 0) return alert("Stok Habis!");
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if ((existing.qty || 0) >= product.stok) return prev;
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: (item.qty || 1) + 1 } : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing && (existing.qty || 0) > 1) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: (item.qty || 1) - 1 } : item,
        );
      }
      return prev.filter((item) => item.id !== product.id);
    });
  };

  const handlePrint = async () => {
    if (!selectedMeja || cart.length === 0 || !namaPembeli)
      return alert("Lengkapi data!");
    try {
      const { error: tError } = await supabase.from("transactions").insert([
        {
          nomor_meja: selectedMeja.nomor_meja,
          total_harga: totalHargaFinal,
          nama_pembeli: namaPembeli,
          metode_bayar: metodeBayar,
          items: cart.map((i) => ({
            nama: i.nama,
            qty: i.qty,
            harga: i.harga,
          })),
        },
      ]);
      if (tError) throw tError;

      for (const item of cart) {
        const p = products.find((prod) => prod.id === item.id);
        if (p)
          await supabase
            .from("products")
            .update({ stok: p.stok - (item.qty || 1) })
            .eq("id", item.id);
      }

      if (selectedMeja.nomor_meja.toLowerCase() !== "take away") {
        setOccupiedUntil((prev) => ({
          ...prev,
          [selectedMeja.nomor_meja]: Date.now() + 120000,
        }));
      }

      window.print();
      setCart([]);
      setNamaPembeli("");
      setSelectedMeja(null);
      setActiveDiscount(null);
      fetchData();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  return (
    <div style={containerStyle}>
      {/* SIDEBAR */}
      <div style={sidebarStyle} className="no-print">
        <img
          src={logo}
          alt="Logo"
          style={{ width: "70px", alignSelf: "center", marginBottom: "30px" }}
        />
        <button
          style={{
            ...menuBtn,
            background: activeMenu === "kasir" ? "#4e342e" : "#8b5e3c",
          }}
          onClick={() => setActiveMenu("kasir")}
        >
          🏠 Kasir
        </button>
        <button
          style={{
            ...menuBtn,
            background: activeMenu === "riwayat" ? "#4e342e" : "#8b5e3c",
          }}
          onClick={() => setActiveMenu("riwayat")}
        >
          🍽️ Meja
        </button>
        <button
          style={{
            ...menuBtn,
            background: activeMenu === "promo" ? "#4e342e" : "#8b5e3c",
          }}
          onClick={() => setActiveMenu("promo")}
        >
          🎟️ Promo
        </button>
        <button
          style={{
            ...menuBtn,
            background: activeMenu === "meja" ? "#4e342e" : "#8b5e3c",
          }}
          onClick={() => setActiveMenu("meja")}
        >
          📜 Riwayat
        </button>
        <button
          style={{
            ...menuBtn,
            background: activeMenu === "stok" ? "#4e342e" : "#8b5e3c",
          }}
          onClick={() => setActiveMenu("stok")}
        >
          📦 Stok
        </button>
        <button
          style={{
            ...menuBtn,
            background: activeMenu === "dashboard" ? "#4e342e" : "#8b5e3c",
          }}
          onClick={() => setActiveMenu("dashboard")}
        >
          📊 Dashboard
        </button>
      </div>

      {/* KONTEN UTAMA */}
      <div
        style={{ flex: 1, padding: "20px 30px", overflowY: "auto" }}
        className="no-print"
      >
        {activeMenu === "kasir" && (
          <div>
            <h1 style={headerTitleStyle}>Daftar Menu</h1>
            <input
              type="text"
              placeholder="🔍 Cari menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={searchBarStyle}
            />
            <div style={gridMenuStyle}>
              {products
                .filter((p) =>
                  p.nama.toLowerCase().includes(searchTerm.toLowerCase()),
                )
                .map((p) => (
                  <div
                    key={p.id}
                    style={{ ...cardStyle, opacity: p.stok <= 0 ? 0.6 : 1 }}
                  >
                    <img
                      src={p.gambar}
                      alt={p.nama}
                      style={imgStyle}
                      onClick={() => addToCart(p)}
                    />
                    <div
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                      }}
                    >
                      <b style={{ color: "#4e342e" }}>{p.nama}</b>
                      <p
                        style={{
                          color: "#8b5e3c",
                          fontWeight: "bold",
                          margin: "5px 0",
                        }}
                      >
                        Rp {p.harga.toLocaleString()}
                      </p>
                      <small style={{ marginBottom: "10px" }}>
                        Sisa Stok: {p.stok}
                      </small>
                      <button
                        onClick={() => addToCart(p)}
                        disabled={p.stok <= 0}
                        style={{
                          ...btnOrangeCart,
                          background: p.stok <= 0 ? "#ccc" : "#ff9800",
                          marginTop: "auto",
                        }}
                      >
                        {p.stok <= 0 ? "Habis" : "Tambah"}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeMenu === "promo" && (
          <div>
            <h1 style={headerTitleStyle}>Promo & Kupon</h1>
            <div style={gridMenuStyle}>
              {availableDiscounts.map((d) => (
                <div
                  key={d.code}
                  style={{
                    ...cardStyle,
                    padding: "20px",
                    textAlign: "center",
                    border: "2px dashed #8b5e3c",
                  }}
                >
                  <h2 style={{ color: "#c62828", margin: "0" }}>
                    Diskon {d.value}%
                  </h2>
                  <p style={{ fontSize: "12px", color: "#666" }}>
                    Min. Belanja: <b>Rp {d.minPurchase.toLocaleString()}</b>
                  </p>
                  <div
                    style={{
                      background: "#f0f0f0",
                      padding: "10px",
                      borderRadius: "8px",
                      margin: "10px 0",
                      fontWeight: "bold",
                      letterSpacing: "2px",
                    }}
                  >
                    {d.code}
                  </div>
                  <button
                    onClick={() => {
                      if (subtotal >= d.minPurchase) {
                        setActiveDiscount(d);
                        alert(`Promo ${d.code} berhasil dipasang!`);
                      } else {
                        alert(
                          `Gagal! Belanjaan Anda baru Rp ${subtotal.toLocaleString()}, minimal Rp ${d.minPurchase.toLocaleString()}`,
                        );
                      }
                    }}
                    style={{
                      ...btnOrangeCart,
                      background:
                        subtotal >= d.minPurchase ? "#2e7d32" : "#ccc",
                    }}
                  >
                    Gunakan Kupon
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeMenu === "riwayat" && (
          <div>
            <h1 style={headerTitleStyle}>Pilih Meja</h1>
            <div style={gridMejaStyle}>
              {meja.map((m) => {
                // eslint-disable-next-line react-hooks/purity
                const timeLeft = occupiedUntil[m.nomor_meja] - Date.now();
                const isTimerActive = timeLeft > 0;
                const isSelected = selectedMeja?.id === m.id;
                const isOccupied = m.status.toLowerCase() === "terisi"; // Pastikan data meja punya status "terisi"
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      if (isOccupied) return; // Jika meja terisi, jangan ubah pilihan
                      setSelectedMeja(m);
                      setActiveMenu("kasir");
                    }}
                    style={{
                      ...mejaItemStyle,
                      background:
                        isSelected || isTimerActive || isOccupied
                          ? "#c62828"
                          : "#2e7d32",
                      color: "white",
                      cursor: isOccupied ? "not-allowed" : "pointer",
                      opacity: isOccupied ? 0.6 : 1,
                    }}
                  >
                    <h3 style={{ margin: 0 }}>
                      {m.nomor_me_ja || m.nomor_meja}
                    </h3>
                    <small style={{ fontWeight: "bold" }}>
                      {isTimerActive
                        ? `⏱️ ${formatTime(timeLeft)}`
                        : isSelected
                          ? "Dipilih"
                          : "Kosong"}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeMenu === "meja" && (
          <div>
            <h1 style={headerTitleStyle}>Riwayat Penjualan</h1>
            <div style={tableContainer}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: "2px solid #eee",
                      textAlign: "left",
                      background: "#fdf8f3",
                    }}
                  >
                    <th style={{ padding: "12px" }}>Waktu</th>
                    <th style={{ padding: "12px" }}>Pelanggan</th>
                    <th style={{ padding: "12px" }}>Metode</th>
                    <th style={{ padding: "12px" }}>Meja</th>
                    <th style={{ padding: "12px" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "12px", fontSize: "13px" }}>
                        <div style={{ fontWeight: "bold" }}>
                          {new Date(t.created_at).toLocaleTimeString("id-ID")}
                        </div>
                        <div style={{ color: "#999" }}>
                          {new Date(t.created_at).toLocaleDateString("id-ID")}
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <b>{t.nama_pembeli}</b>
                      </td>
                      <td style={{ padding: "12px" }}>{t.metode_bayar}</td>
                      <td style={{ padding: "12px" }}>{t.nomor_meja}</td>
                      <td
                        style={{
                          padding: "12px",
                          fontWeight: "bold",
                          color: "#2e7d32",
                        }}
                      >
                        Rp {t.total_harga.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeMenu === "dashboard" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "30px" }}
          >
            <h1 style={headerTitleStyle}>Ringkasan Performa</h1>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "25px",
              }}
            >
              <div
                style={{ ...cardStyle, padding: "25px", textAlign: "center" }}
              >
                <small style={{ color: "#8b5e3c", fontWeight: "bold" }}>
                  Total Pendapatan (Hari Ini)
                </small>
                <h2
                  style={{
                    color: "#2e7d32",
                    margin: "15px 0",
                    fontSize: "24px",
                  }}
                >
                  Rp {totalPendapatanHariIni.toLocaleString()}
                </h2>
              </div>
              <div
                style={{ ...cardStyle, padding: "25px", textAlign: "center" }}
              >
                <small style={{ color: "#8b5e3c", fontWeight: "bold" }}>
                  Total Transaksi
                </small>
                <h2
                  style={{
                    color: "#4e342e",
                    margin: "15px 0",
                    fontSize: "24px",
                  }}
                >
                  {transactions.length} Pesanan
                </h2>
              </div>
            </div>

            {/* BARU: TOP 5 MENU TERFAVORIT */}
            <div style={{ ...cardStyle, padding: "20px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  marginBottom: "15px",
                  color: "#4e342e",
                }}
              >
                🔥 5 Menu Terfavorit (Sepanjang Masa)
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      textAlign: "left",
                      fontSize: "12px",
                      color: "#8b5e3c",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <th style={{ padding: "10px" }}>No</th>
                    <th style={{ padding: "10px" }}>Nama Menu</th>
                    <th style={{ padding: "10px", textAlign: "right" }}>
                      Terjual
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.length > 0 ? (
                    topProducts.map((item, index) => (
                      <tr
                        key={index}
                        style={{ borderBottom: "1px solid #f9f9f9" }}
                      >
                        <td style={{ padding: "10px" }}>
                          <span
                            style={{
                              background: index === 0 ? "#ff9800" : "#eee",
                              color: index === 0 ? "white" : "#333",
                              padding: "2px 8px",
                              borderRadius: "50%",
                              fontSize: "12px",
                              fontWeight: "bold",
                            }}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td style={{ padding: "10px", fontWeight: "500" }}>
                          {item.nama}
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            textAlign: "right",
                            fontWeight: "bold",
                            color: "#2e7d32",
                          }}
                        >
                          {item.qty} Porsi
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          textAlign: "center",
                          padding: "20px",
                          color: "#999",
                        }}
                      >
                        Belum ada data penjualan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ ...cardStyle, padding: "20px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  marginBottom: "15px",
                  color: "#4e342e",
                }}
              >
                🎯 Target Penjualan Harian
              </h3>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: "bold" }}>
                  {persentaseTarget.toFixed(1)}% Terpenuhi
                </span>
                <span style={{ fontSize: "12px", color: "#666" }}>
                  Target: Rp 1.000.000
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "25px",
                  background: "#eee",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${persentaseTarget}%`,
                    height: "100%",
                    background: "#2e7d32",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {activeMenu === "stok" && (
          <div>
            <h1 style={headerTitleStyle}>Manajemen Stok</h1>
            <div style={tableContainer}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "12px" }}>{p.nama}</td>
                      <td style={{ padding: "12px", fontWeight: "bold" }}>
                        {p.stok}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <button
                          onClick={() => updateStockManual(p.id, p.stok, 1)}
                          style={btnStockAction}
                        >
                          +1
                        </button>
                        <button
                          onClick={() => updateStockManual(p.id, p.stok, -1)}
                          style={{ ...btnStockAction, background: "#c62828" }}
                        >
                          -1
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* STRUK AREA (KANAN) */}
      <div style={orderAreaStyle} id="printable-area">
        <div style={{ textAlign: "center", marginBottom: "15px" }}>
          <img
            src={logo}
            alt="Logo"
            style={{ width: "65px", marginBottom: "5px" }}
          />
          <h1 style={{ fontSize: "18px", margin: "2px 0", fontWeight: "bold" }}>
            NASGOR NUSANTARA
          </h1>
          <p style={{ fontSize: "10px", margin: "1px 0" }}>
            Jl. Pocut Baren No.116, Banda Aceh. Telp 0853 6199 3203
          </p>
          <div
            style={{ borderBottom: "1px dashed #000", margin: "10px 0" }}
          ></div>
        </div>

        <div className="no-print">
          <input
            type="text"
            placeholder="Nama..."
            value={namaPembeli}
            onChange={(e) => setNamaPembeli(e.target.value)}
            style={inputFieldStyle}
          />
          <select
            value={metodeBayar}
            onChange={(e) => setMetodeBayar(e.target.value)}
            style={inputFieldStyle}
          >
            <option value="Tunai">💵 Tunai</option>
            <option value="QRIS">📱 QRIS</option>
          </select>
        </div>

        <div style={{ fontSize: "12px", marginBottom: "10px" }}>
          <div>
            📍 Meja: <b>{selectedMeja?.nomor_meja || "-"}</b>
          </div>
          <div>
            👤 Pelanggan: <b>{namaPembeli || "-"}</b>
          </div>
        </div>

        <div
          className="cart-scroll-area"
          style={{ flex: 1, overflowY: "auto", borderBottom: "1px solid #eee" }}
        >
          {cart.map((item) => (
            <div key={item.id} style={cartItemRow}>
              <div style={{ width: "65%" }}>
                <b style={cartItemName}>{item.nama}</b>
                <div style={{ fontSize: "11px", color: "#666" }}>
                  {item.qty}x Rp{item.harga.toLocaleString()}
                </div>
              </div>
              <div className="no-print" style={cartQtyControls}>
                <button
                  onClick={() => removeFromCart(item)}
                  style={btnMinusSmall}
                >
                  -
                </button>
                <b style={{ minWidth: "18px", textAlign: "center" }}>
                  {item.qty}
                </b>
                <button onClick={() => addToCart(item)} style={btnPlusSmall}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", paddingTop: "10px" }}>
          {activeDiscount && (
            <div
              style={{
                fontSize: "13px",
                color: "#c62828",
                fontWeight: "bold",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Disc ({activeDiscount.code}):</span>
              <span>-Rp {discountAmount.toLocaleString()}</span>
            </div>
          )}
          <h2 style={{ fontSize: "20px", textAlign: "right", margin: "5px 0" }}>
            Total: Rp {totalHargaFinal.toLocaleString()}
          </h2>
          <button
            className="no-print"
            onClick={handlePrint}
            disabled={!selectedMeja || cart.length === 0 || !namaPembeli}
            style={{
              ...payBtnStyle,
              background:
                !selectedMeja || cart.length === 0 || !namaPembeli
                  ? "#ccc"
                  : "#2e7d32",
            }}
          >
            CETAK STRUK
          </button>
        </div>

        <div
          className="print-only"
          style={{ textAlign: "center", marginTop: "15px" }}
        >
          <div style={{ borderTop: "1px dashed #000", margin: "10px 0" }}></div>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=Nasgor-Nusantara-${selectedMeja?.nomor_meja}`}
            style={{ width: "90px", margin: "0 auto", display: "block" }}
            alt="QR"
          />
          <p style={{ fontSize: "10px", fontWeight: "bold", marginTop: "5px" }}>
            TERIMA KASIH
          </p>
        </div>
      </div>

      <style>{`
        @media screen { .print-only { display: none; } }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          @page { size: 80mm auto; margin: 0; }
          #printable-area { width: 72mm !important; margin: 0 auto !important; padding: 5mm !important; font-family: 'Courier New', monospace !important; }
        }
      `}</style>
    </div>
  );
}

// Styles (Tetap sama seperti sebelumnya)
const containerStyle = {
  position: "fixed" as const,
  inset: 0,
  display: "flex",
  background: "#f4ece2",
  fontFamily: "sans-serif",
};
const sidebarStyle = {
  width: "200px",
  background: "#6b3e26",
  padding: "20px",
  display: "flex",
  flexDirection: "column" as const,
};
const orderAreaStyle = {
  width: "380px",
  background: "#fffaf4",
  padding: "20px",
  borderLeft: "1px solid #ddd",
  display: "flex",
  flexDirection: "column" as const,
};
const menuBtn = {
  width: "100%",
  padding: "12px",
  marginBottom: "10px",
  cursor: "pointer",
  color: "white",
  border: "none",
  borderRadius: "12px",
  fontWeight: "bold" as const,
};
const headerTitleStyle = {
  fontSize: "24px",
  color: "#4e342e",
  borderLeft: "6px solid #6b3e26",
  paddingLeft: "15px",
  marginBottom: "25px",
};
const searchBarStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "20px",
  borderRadius: "15px",
  border: "2px solid #8b5e3c",
  outline: "none",
};
const inputFieldStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  marginBottom: "8px",
};
const gridMenuStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "15px",
};
const cardStyle = {
  background: "white",
  borderRadius: "15px",
  overflow: "hidden",
  boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
  display: "flex",
  flexDirection: "column" as const,
};
const imgStyle = {
  width: "100%",
  height: "120px",
  objectFit: "cover" as const,
  cursor: "pointer",
};
const tableContainer = {
  background: "white",
  borderRadius: "15px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};
const btnStockAction = {
  padding: "6px 12px",
  background: "#8b5e3c",
  color: "white",
  border: "none",
  borderRadius: "6px",
  marginRight: "5px",
  cursor: "pointer",
};
const gridMejaStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: "15px",
};
const mejaItemStyle = {
  padding: "15px",
  borderRadius: "10px",
  textAlign: "center" as const,
  cursor: "pointer",
  border: "2px solid #6b3e26",
};
const payBtnStyle = {
  width: "100%",
  padding: "15px",
  color: "white",
  border: "none",
  borderRadius: "12px",
  fontWeight: "bold" as const,
  cursor: "pointer",
};
const btnOrangeCart = {
  width: "100%",
  padding: "8px",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};
const btnPlusSmall = {
  width: "32px",
  height: "32px",
  background: "#2e7d32",
  color: "white",
  border: "none",
  borderRadius: "6px",
};
const btnMinusSmall = {
  width: "32px",
  height: "32px",
  background: "#c62828",
  color: "white",
  border: "none",
  borderRadius: "6px",
};
const cartItemRow = {
  display: "flex",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px solid #f0f0f0",
};
const cartItemName = {
  fontSize: "13px",
  display: "block",
  whiteSpace: "nowrap" as const,
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const cartQtyControls = {
  width: "35%",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "6px",
};
