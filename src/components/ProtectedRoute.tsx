import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import Auth from "@/components/Auth";
import { User } from "@supabase/supabase-js";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      setChecking(false);
    };
    fetchUser();
  }, []);

  if (checking) return <div>Loading...</div>;
  if (!user) return <Auth />;

  return <>{children}</>;
}
