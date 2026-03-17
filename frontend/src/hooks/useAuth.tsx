import {
  useState,
  useEffect,
  useContext,
  createContext,
  ReactNode,
} from "react";
import { authService } from "@/api";
import type { User, UserLogin, UserCreate } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: UserLogin) => Promise<void>;
  register: (userData: UserCreate) => Promise<void>;
  loginAsDemo: () => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const storedToken = localStorage.getItem("access_token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        // Verify token is still valid by fetching current user
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
          localStorage.setItem("user", JSON.stringify(currentUser));
        } catch (error) {
          // Token expired, clear storage
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          setToken(null);
          setUser(null);
        }
      }
    } catch (error) {
      // Token is invalid, clear storage
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: UserLogin) => {
    setLoading(true);
    try {
      // Clear any stale shared analysis cache from previous user
      localStorage.removeItem("habo_last_deep_analysis");
      localStorage.removeItem("profile_extras");

      const tokenResponse = await authService.login(
        credentials.username,
        credentials.password,
      );

      // Сохраняем токен ПЕРЕД вызовом getCurrentUser
      setToken(tokenResponse.access_token);
      localStorage.setItem("access_token", tokenResponse.access_token);

      const userResponse = await authService.getCurrentUser();
      setUser(userResponse);
      localStorage.setItem("user", JSON.stringify(userResponse));
    } catch (error) {
      // Clear auth state on error
      setToken(null);
      setUser(null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: UserCreate) => {
    setLoading(true);
    try {
      await authService.register(userData);
      // After registration, log in automatically
      await login({
        username: userData.username,
        password: userData.password,
      });
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    // Clear per-user analysis cache for current user before wiping identity
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id !== undefined) {
          localStorage.removeItem(`habo_last_deep_analysis_${parsed.id}`);
        }
      }
    } catch {
      // ignore
    }
    // Also clear legacy shared key
    localStorage.removeItem("habo_last_deep_analysis");
    localStorage.removeItem("profile_extras");

    setUser(null);
    setToken(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const loginAsDemo = () => {
    // Clear any stale shared analysis cache and previous user's data
    localStorage.removeItem("habo_last_deep_analysis");
    // Clear any previous demo analysis cache
    localStorage.removeItem("habo_last_deep_analysis_0");
    localStorage.removeItem("profile_extras");

    const demoUser: User = {
      id: 0,
      username: "demo",
      email: "demo@habo.app",
      first_name: "Демо",
      last_name: "Пользователь",
      is_active: true,
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const demoToken = "demo_token_" + Date.now();

    setUser(demoUser);
    setToken(demoToken);
    localStorage.setItem("access_token", demoToken);
    localStorage.setItem("user", JSON.stringify(demoUser));
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    loginAsDemo,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
