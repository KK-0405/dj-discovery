"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const C = {
  bg: "#ffffff",
  s1: "#f5f5f7",
  s2: "#e8e8ed",
  acc: "#5856d6",
  accDim: "rgba(88,86,214,0.1)",
  t1: "#1d1d1f",
  t2: "#6e6e73",
  t3: "#aeaeb2",
  sep: "rgba(0,0,0,0.08)",
  red: "#ff3b30",
  green: "#34c759",
} as const;

type Mode = "login" | "register";
type LoginTab = "email" | "userid";
type RegisterTab = "email" | "userid";

type Props = {
  onClose: () => void;
};

export default function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [loginTab, setLoginTab] = useState<LoginTab>("email");
  const [regTab, setRegTab] = useState<RegisterTab>("email");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginUserId, setLoginUserId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register fields
  const [regUserId, setRegUserId] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetError = () => { setError(null); setSuccess(null); };

  // ── ログイン ────────────────────────────────────────────

  const handleEmailLogin = async () => {
    if (!loginEmail || !loginPassword) { setError("メールとパスワードを入力してください"); return; }
    setLoading(true); resetError();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onClose();
  };

  const handleUserIdLogin = async () => {
    if (!loginUserId || !loginPassword) { setError("ユーザーIDとパスワードを入力してください"); return; }
    setLoading(true); resetError();

    // usersテーブルからメールを取得
    const { data: profile, error: lookupError } = await supabase
      .from("users")
      .select("email")
      .eq("user_id", loginUserId)
      .single();

    if (lookupError || !profile?.email) {
      setLoading(false);
      setError("ユーザーIDが見つかりません");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: loginPassword,
    });
    setLoading(false);
    if (error) { setError("パスワードが正しくありません"); return; }
    onClose();
  };

  const handleGoogleLogin = async () => {
    resetError();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Supabaseダッシュボードで youtube スコープを追加設定してください
        scopes: "email profile https://www.googleapis.com/auth/youtube",
        redirectTo: "https://dj-discovery-ihhs.vercel.app",
      },
    });
    // ページ遷移するので onClose 不要
  };

  // ── 新規登録 ─────────────────────────────────────────────

  const handleRegister = async () => {
    resetError();
    if (!regPassword || !regConfirm) { setError("パスワードを入力してください"); return; }
    if (regPassword !== regConfirm) { setError("パスワードが一致しません"); return; }
    if (regPassword.length < 6) { setError("パスワードは6文字以上にしてください"); return; }

    let authEmail: string;
    let userId: string;

    if (regTab === "email") {
      // メールアドレスで登録 → userIdは自動生成
      if (!regEmail) { setError("メールアドレスを入力してください"); return; }
      authEmail = regEmail;
      // メール前半から初期userIdを生成
      const prefix = regEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user";
      let candidate = prefix;
      let suffix = 0;
      while (true) {
        const { data: conflict } = await supabase.from("users").select("id").eq("user_id", candidate).single();
        if (!conflict) break;
        suffix++;
        candidate = `${prefix}${suffix}`;
      }
      userId = candidate;
    } else {
      // ユーザーIDで登録 → メールは内部生成
      if (!regUserId) { setError("ユーザーIDを入力してください"); return; }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(regUserId)) {
        setError("ユーザーIDは英数字・アンダーバー 3〜20文字で入力してください"); return;
      }
      // ユーザーIDの重複チェック
      const { data: existing } = await supabase.from("users").select("id").eq("user_id", regUserId).single();
      if (existing) { setError("このユーザーIDはすでに使用されています"); return; }
      userId = regUserId;
      authEmail = `${regUserId}@djd.internal`;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email: authEmail, password: regPassword });
    if (error || !data.user) {
      setLoading(false);
      setError(error?.message ?? "登録に失敗しました");
      return;
    }

    const { error: insertError } = await supabase.from("users").insert({
      id: data.user.id,
      user_id: userId,
      email: authEmail,
      avatar_url: null,
    });
    setLoading(false);

    if (insertError) {
      setError("プロフィールの作成に失敗しました: " + insertError.message);
      return;
    }

    if (data.session) {
      onClose();
    } else {
      setSuccess("確認メールを送信しました。メールを確認してログインしてください。");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    background: C.s1,
    border: `1px solid ${C.sep}`,
    borderRadius: "9px",
    color: C.t1,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const primaryBtnStyle = (disabled?: boolean) => ({
    width: "100%",
    padding: "11px",
    background: disabled ? C.s2 : C.acc,
    border: "none",
    borderRadius: "10px",
    color: disabled ? C.t3 : "#fff",
    fontSize: "14px",
    fontWeight: 700 as const,
    cursor: disabled ? "default" as const : "pointer" as const,
    boxShadow: disabled ? "none" : "0 2px 8px rgba(88,86,214,0.25)",
    transition: "background 0.15s",
  });

  return (
    <>
      {/* バックドロップ */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 900,
        }}
      />

      {/* モーダル */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "380px",
        background: C.bg,
        borderRadius: "18px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06)",
        zIndex: 901,
        overflow: "hidden",
      }}>
        {/* ヘッダー */}
        <div style={{ padding: "22px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 30, height: 30, background: C.acc, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(88,86,214,0.3)" }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="2.5" fill="white"/>
                <circle cx="10" cy="10" r="5.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.7"/>
                <circle cx="10" cy="10" r="9" stroke="white" strokeWidth="1" strokeOpacity="0.35"/>
              </svg>
            </div>
            <span style={{ fontSize: "16px", fontWeight: 700, color: C.t1 }}>Ripple</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: C.t3, fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: "4px" }}
          >×</button>
        </div>

        {/* モード切替タブ */}
        <div style={{ padding: "16px 24px 0", display: "flex", gap: "0", borderBottom: `1px solid ${C.sep}`, marginTop: "16px" }}>
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); resetError(); }}
              style={{
                flex: 1, padding: "9px 0",
                background: "none", border: "none",
                borderBottom: mode === m ? `2px solid ${C.acc}` : "2px solid transparent",
                color: mode === m ? C.acc : C.t2,
                fontSize: "14px", fontWeight: mode === m ? 700 : 500,
                cursor: "pointer",
                marginBottom: "-1px",
                transition: "color 0.15s",
              }}
            >
              {m === "login" ? "ログイン" : "新規登録"}
            </button>
          ))}
        </div>

        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* エラー / 成功メッセージ */}
          {error && (
            <div style={{ padding: "10px 14px", background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: "9px", color: C.red, fontSize: "13px", lineHeight: 1.5 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: "10px 14px", background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.2)", borderRadius: "9px", color: C.green, fontSize: "13px", lineHeight: 1.5 }}>
              {success}
            </div>
          )}

          {/* ── ログインフォーム ── */}
          {mode === "login" && (
            <>
              {/* ログイン方法タブ */}
              <div style={{ display: "flex", background: C.s1, borderRadius: "9px", padding: "3px" }}>
                {(["email", "userid"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setLoginTab(t); resetError(); }}
                    style={{
                      flex: 1, padding: "7px",
                      background: loginTab === t ? "#fff" : "transparent",
                      border: "none",
                      borderRadius: "7px",
                      color: loginTab === t ? C.t1 : C.t2,
                      fontSize: "13px", fontWeight: loginTab === t ? 600 : 400,
                      cursor: "pointer",
                      boxShadow: loginTab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    {t === "email" ? "メールアドレス" : "ユーザーID"}
                  </button>
                ))}
              </div>

              {loginTab === "email" ? (
                <>
                  <input
                    type="email"
                    placeholder="メールアドレス"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    style={inputStyle}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                  />
                  <input
                    type="password"
                    placeholder="パスワード"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    style={inputStyle}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                  />
                  <button
                    onClick={handleEmailLogin}
                    disabled={loading}
                    style={primaryBtnStyle(loading)}
                  >
                    {loading ? "ログイン中..." : "ログイン"}
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="ユーザーID"
                    value={loginUserId}
                    onChange={(e) => setLoginUserId(e.target.value)}
                    style={inputStyle}
                    onKeyDown={(e) => e.key === "Enter" && handleUserIdLogin()}
                  />
                  <input
                    type="password"
                    placeholder="パスワード"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    style={inputStyle}
                    onKeyDown={(e) => e.key === "Enter" && handleUserIdLogin()}
                  />
                  <button
                    onClick={handleUserIdLogin}
                    disabled={loading}
                    style={primaryBtnStyle(loading)}
                  >
                    {loading ? "ログイン中..." : "ログイン"}
                  </button>
                </>
              )}

              <Divider />

              <GoogleButton onClick={handleGoogleLogin} label="Google でログイン" />
            </>
          )}

          {/* ── 新規登録フォーム ── */}
          {mode === "register" && (
            <>
              {/* 登録方法タブ */}
              <div style={{ display: "flex", background: C.s1, borderRadius: "9px", padding: "3px" }}>
                {(["email", "userid"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setRegTab(t); resetError(); }}
                    style={{
                      flex: 1, padding: "7px",
                      background: regTab === t ? "#fff" : "transparent",
                      border: "none", borderRadius: "7px",
                      color: regTab === t ? C.t1 : C.t2,
                      fontSize: "13px", fontWeight: regTab === t ? 600 : 400,
                      cursor: "pointer",
                      boxShadow: regTab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    {t === "email" ? "メールアドレス" : "ユーザーID"}
                  </button>
                ))}
              </div>

              {regTab === "email" ? (
                <input
                  type="email"
                  placeholder="メールアドレス"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <input
                  type="text"
                  placeholder="ユーザーID（英数字・アンダーバー 3〜20文字）"
                  value={regUserId}
                  onChange={(e) => setRegUserId(e.target.value)}
                  style={inputStyle}
                />
              )}

              <input
                type="password"
                placeholder="パスワード（6文字以上）"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="パスワード（確認）"
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                style={inputStyle}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              />

              <button onClick={handleRegister} disabled={loading} style={primaryBtnStyle(loading)}>
                {loading ? "登録中..." : "登録"}
              </button>

              <Divider />

              <GoogleButton onClick={handleGoogleLogin} label="Google で登録" />
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ flex: 1, height: "1px", background: "rgba(0,0,0,0.08)" }} />
      <span style={{ fontSize: "12px", color: "#aeaeb2" }}>または</span>
      <div style={{ flex: 1, height: "1px", background: "rgba(0,0,0,0.08)" }} />
    </div>
  );
}

function GoogleButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", padding: "11px",
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: "10px",
        color: "#3c4043",
        fontSize: "14px", fontWeight: 600,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f8f8")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
    >
      {/* Google SVG icon */}
      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
      {label}
    </button>
  );
}
