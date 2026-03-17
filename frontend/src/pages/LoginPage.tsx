import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { PiggyBank, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading";

const loginSchema = z.object({
  username: z.string().min(1, "Имя пользователя обязательно"),
  password: z.string().min(1, "Пароль обязателен"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginAsDemo } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Get the redirect URL if user was redirected from a protected route
  const from = location.state?.from?.pathname || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError("");

    try {
      // Convert LoginFormData to UserLogin format
      const credentials = {
        username: data.username,
        password: data.password,
      };
      await login(credentials);
      // Navigate after successful login - the user state will be set
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error("Login error:", error);
      setError(
        error.response?.data?.detail ||
          "Ошибка входа. Проверьте данные и попробуйте снова.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <PiggyBank className="h-12 w-12 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Habo</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Добро пожаловать</h2>
          <p className="mt-2 text-gray-600">
            Войдите в свой аккаунт для управления финансами
          </p>
        </div>

        {/* Login Form */}
        <Card className="p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <Label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Имя пользователя
              </Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                className="mt-1"
                placeholder="Введите имя пользователя"
                {...register("username")}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Пароль
              </Label>
              <div className="mt-1 relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Введите пароль"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Забыли пароль?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <LoadingSpinner size="sm" /> : "Войти"}
            </Button>
          </form>

          <div className="mt-6">
            <div className="text-center text-sm text-gray-600">
              Нет аккаунта?{" "}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Зарегистрируйтесь
              </Link>
            </div>
          </div>
        </Card>

        {/* Demo Access */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">
            Хотите попробовать без регистрации?
          </p>
          <Button
            variant="outline"
            onClick={() => {
              loginAsDemo();
              navigate("/dashboard", { replace: true });
            }}
            className="text-sm"
          >
            Демо доступ
          </Button>
        </div>
      </div>
    </div>
  );
}
