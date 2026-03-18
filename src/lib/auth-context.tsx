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
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userProfile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string, fallbackEmail?: string) => {
    const { data } = await supabase
      .from("users")
      .select("user_id, avatar_url")
      .eq("id", userId)
      .single();
    if (data) {
      setUserProfile(data);
    } else if (fallbackEmail) {
      // DBフェッチ失敗時はメールのローカルパートをフォールバック表示
      setUserProfile({ user_id: fallbackEmail.split("@")[0] || "user", avatar_url: null });
    }
    // data も fallbackEmail もない場合は既存の userProfile を保持（ちらつき防止）
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id, user.email);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await loadProfile(session.user.id, session.user.email);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Googleログイン初回: usersテーブルに自動作成
        if (event === "SIGNED_IN" && session.user.app_metadata?.provider === "google") {
          await ensureGoogleUserRecord(session.user);
        }
        await loadProfile(session.user.id, session.user.email);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("signOut error:", e);
    }
    // API失敗に関わらずローカル状態を強制クリア
    setSession(null);
    setUser(null);
    setUserProfile(null);
    // ページをリロードしてSupabaseキャッシュ・メモリ状態を完全リセット
    if (typeof window !== "undefined") window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ session, user, userProfile, loading, signOut, refreshProfile }}>
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
