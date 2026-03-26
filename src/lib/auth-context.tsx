"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type UserProfile = {
  user_id: string;
  avatar_url: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  googleToken: string | null;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userProfile: null,
  loading: true,
  googleToken: null,
  signOut: () => {},
  refreshProfile: async () => {},
  updateUserProfile: () => {},
});

const GOOGLE_TOKEN_KEY = "dj_google_token_v1";

function saveGoogleToken(token: string) {
  try {
    // Google アクセストークンの有効期限は約3600秒。50分で失効とみなす
    const expiresAt = Date.now() + 50 * 60 * 1000;
    localStorage.setItem(GOOGLE_TOKEN_KEY, JSON.stringify({ token, expiresAt }));
  } catch { /* ignore */ }
}

function loadGoogleToken(): string | null {
  try {
    const raw = localStorage.getItem(GOOGLE_TOKEN_KEY);
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) { localStorage.removeItem(GOOGLE_TOKEN_KEY); return null; }
    return token;
  } catch { return null; }
}

function clearGoogleToken() {
  try { localStorage.removeItem(GOOGLE_TOKEN_KEY); } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  // localStorage キャッシュキー（auth user ID ごとに保存）
  const profileCacheKey = (uid: string) => `dj_profile_v1_${uid}`;

  const getCachedProfile = (uid: string): UserProfile | null => {
    try {
      const raw = localStorage.getItem(profileCacheKey(uid));
      return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch { return null; }
  };

  const setCachedProfile = (uid: string, profile: UserProfile) => {
    try { localStorage.setItem(profileCacheKey(uid), JSON.stringify(profile)); } catch { /* ignore */ }
  };

  const loadProfile = async (userId: string, fallbackEmail?: string) => {
    // 1. キャッシュがあれば即座に表示（リロード時に "..." や email が出ない）
    const cached = getCachedProfile(userId);
    if (cached) setUserProfile(cached);

    // 2. DB から最新データを取得して上書き・キャッシュ更新
    try {
      type Row = { user_id: string | null; avatar_url: string | null } | null;
      const queryPromise = new Promise<Row>((resolve) => {
        supabase
          .from("users")
          .select("user_id, avatar_url")
          .eq("id", userId)
          .single()
          .then(
            ({ data }) => resolve(data as Row),
            () => resolve(null)
          );
      });
      const timeoutPromise = new Promise<Row>((resolve) =>
        setTimeout(() => resolve(null), 6000)
      );
      const data = await Promise.race([queryPromise, timeoutPromise]);

      if (data?.user_id) {
        const profile: UserProfile = { user_id: data.user_id, avatar_url: data.avatar_url ?? null };
        setUserProfile(profile);
        setCachedProfile(userId, profile);
      } else if (!cached) {
        // DB からも取れず、キャッシュもない場合のみフォールバック
        const fallback = fallbackEmail?.split("@")[0] || userId.slice(0, 8) || "user";
        setUserProfile({ user_id: fallback, avatar_url: null });
      }
    } catch {
      if (!cached) {
        const fallback = fallbackEmail?.split("@")[0] || userId.slice(0, 8) || "user";
        setUserProfile({ user_id: fallback, avatar_url: null });
      }
    }
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id, user.email);
  };

  // session があるのに userProfile が null のまま残った場合の保険
  useEffect(() => {
    if (!session || userProfile !== null) return;
    const t = setTimeout(() => {
      setUserProfile((prev) => {
        if (prev !== null) return prev;
        // キャッシュがあればキャッシュを使う（メールアドレスを見せない）
        const cached = getCachedProfile(session.user.id);
        if (cached) return cached;
        // キャッシュもなければ UUID 先頭のみ（メールアドレスは使わない）
        return { user_id: session.user.id.slice(0, 8), avatar_url: null };
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [session, userProfile]);

  useEffect(() => {
    // 初期ロードのフォールバック: onAuthStateChange が一定時間内に発火しない場合も
    // loading=false にして UI がブロックされないようにする
    const initFallback = setTimeout(() => setLoading(false), 4000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 初回イベント受信時点でフォールバックタイマーは不要
      clearTimeout(initFallback);

      // 遷移開始時に loading=true にして、未確定状態のUIが表示されないようにする
      setLoading(true);
      // 同期的に先に state を更新してから非同期処理へ
      setSession(session);
      setUser(session?.user ?? null);

      // Google provider_token の保存・復元
      if (session?.provider_token) {
        saveGoogleToken(session.provider_token);
        setGoogleToken(session.provider_token);
      } else if (session?.user) {
        // リロード後は provider_token が消えるので localStorage から復元
        setGoogleToken(loadGoogleToken());
      } else {
        clearGoogleToken();
        setGoogleToken(null);
      }

      try {
        if (session?.user) {
          // Googleログイン初回: usersテーブルに自動作成
          if (event === "SIGNED_IN" && session.user.app_metadata?.provider === "google") {
            await ensureGoogleUserRecord(session.user);
          }
          await loadProfile(session.user.id, session.user.email);
        } else {
          setUserProfile(null);
        }
      } catch {
        // loadProfile が例外を投げた場合も必ずフォールバックをセット
        setUserProfile((prev) => prev ?? {
          user_id: session?.user?.email?.split("@")[0] || session?.user?.id?.slice(0, 8) || "user",
          avatar_url: null,
        });
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(initFallback);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = () => {
    clearGoogleToken();
    // SDK を呼んだ後、タイムアウト付きでローカルストレージも確実にクリアしてリロード
    const cleanup = () => {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sb-"))
          .forEach((k) => localStorage.removeItem(k));
      } catch { /* ignore */ }
      window.location.href = "/";
    };
    const timer = setTimeout(cleanup, 1500);
    supabase.auth.signOut().then(() => {
      clearTimeout(timer);
      cleanup();
    }).catch(() => {
      clearTimeout(timer);
      cleanup();
    });
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      if (user) setCachedProfile(user.id, next);
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ session, user, userProfile, loading, googleToken, signOut, refreshProfile, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

async function ensureGoogleUserRecord(user: User) {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (existing) return;

  // メールの@より前を初期user_idとして使用
  const emailPrefix = (user.email ?? "user")
    .split("@")[0]
    .replace(/[^a-zA-Z0-9_]/g, "") || "user";

  let userId = emailPrefix;
  let suffix = 0;

  while (true) {
    const { data: conflict } = await supabase
      .from("users")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (!conflict) break;
    suffix++;
    userId = `${emailPrefix}${suffix}`;
  }

  await supabase.from("users").insert({
    id: user.id,
    user_id: userId,
    email: user.email,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  });
}
