import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { authService } from "@/api/auth";
import { dashboardService } from "@/api/dashboard";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  User,
  Mail,
  Calendar,
  Edit,
  Camera,
  Check,
  X,
  Shield,
  Activity,
  TrendingUp,
  CreditCard,
  Phone,
} from "lucide-react";

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const profileExtrasKey =
    user?.id !== undefined ? `profile_extras_${user.id}` : "profile_extras";
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [profileData, setProfileData] = useState<{
    first_name: string;
    last_name: string;
    phone: string;
  }>({
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    first_name: "",
    last_name: "",
    phone: "",
  });

  // Load profile and dashboard data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingProfile(true);
      try {
        // Check if we're in demo mode
        const token = localStorage.getItem("access_token");
        const isDemoMode = token?.startsWith("demo_token_");

        if (isDemoMode) {
          // In demo mode, use user data directly
          const demoProfile = {
            first_name: user?.first_name || "Демо",
            last_name: user?.last_name || "Пользователь",
            phone: "",
          };
          setProfileData(demoProfile);
          setFormData({
            username: user?.username || "demo",
            email: user?.email || "demo@habo.app",
            ...demoProfile,
          });
        } else {
          // Load fresh user data from API
          try {
            const currentUser = await authService.getCurrentUser();
            updateUser(currentUser);

            // Try to load profile data (first_name, last_name, phone)
            let loadedProfile = {
              first_name: currentUser.first_name || "",
              last_name: currentUser.last_name || "",
              phone: "",
            };

            try {
              const profile = await authService.getProfile();
              // The profile might contain additional fields
              // We merge what we can get
              if (profile) {
                loadedProfile = {
                  first_name: currentUser.first_name || "",
                  last_name: currentUser.last_name || "",
                  phone: (profile as any).phone || "",
                };
              }
            } catch {
              // Profile endpoint may not return phone, that's ok
              // We still have first_name/last_name from user
            }

            // Also check localStorage for any previously saved profile extras
            const savedProfileExtras = localStorage.getItem(profileExtrasKey);
            if (savedProfileExtras) {
              try {
                const extras = JSON.parse(savedProfileExtras);
                if (!loadedProfile.phone && extras.phone) {
                  loadedProfile.phone = extras.phone;
                }
                if (!loadedProfile.first_name && extras.first_name) {
                  loadedProfile.first_name = extras.first_name;
                }
                if (!loadedProfile.last_name && extras.last_name) {
                  loadedProfile.last_name = extras.last_name;
                }
              } catch {
                // ignore parse errors
              }
            }

            setProfileData(loadedProfile);
            setFormData({
              username: currentUser.username || "",
              email: currentUser.email || "",
              ...loadedProfile,
            });
          } catch (error) {
            console.error("Error loading user data:", error);
            // Fallback to stored user data
            const savedExtras = localStorage.getItem(profileExtrasKey);
            let extras = { first_name: "", last_name: "", phone: "" };
            if (savedExtras) {
              try {
                extras = JSON.parse(savedExtras);
              } catch {
                // ignore
              }
            }

            const fallbackProfile = {
              first_name: user?.first_name || extras.first_name || "",
              last_name: user?.last_name || extras.last_name || "",
              phone: extras.phone || "",
            };
            setProfileData(fallbackProfile);
            setFormData({
              username: user?.username || "",
              email: user?.email || "",
              ...fallbackProfile,
            });
          }
        }

        // Load dashboard stats
        try {
          const period = `${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]}_${new Date().toISOString().split("T")[0]}`;
          const data = await dashboardService.getDashboard(period);
          setDashboardData(data);
        } catch (error) {
          console.error("Error loading dashboard data:", error);
        }
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("access_token");
      const isDemoMode = token?.startsWith("demo_token_");

      if (isDemoMode) {
        // In demo mode, just update local state
        updateUser({
          username: formData.username,
          email: formData.email,
          first_name: formData.first_name || undefined,
          last_name: formData.last_name || undefined,
        });

        const newProfile = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        };
        setProfileData(newProfile);
        localStorage.setItem(profileExtrasKey, JSON.stringify(newProfile));

        setIsEditing(false);
        toast({
          title: "Профиль обновлён",
          description: "Ваши данные успешно сохранены (демо-режим)",
        });
      } else {
        // Update user basic data (username, email)
        const updatedUser = await authService.updateUser({
          username: formData.username,
          email: formData.email,
        });
        updateUser(updatedUser);

        // Update profile data (first_name, last_name, phone)
        try {
          await authService.updateProfile({
            first_name: formData.first_name || undefined,
            last_name: formData.last_name || undefined,
            phone: formData.phone || undefined,
          });
        } catch (error) {
          console.error("Error updating profile details:", error);
          // Even if the profile endpoint fails, save locally
        }

        // Also update the user object with first/last name
        updateUser({
          ...updatedUser,
          first_name: formData.first_name || undefined,
          last_name: formData.last_name || undefined,
        });

        // Persist profile extras to localStorage so they survive reload
        const profileExtras = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        };
        setProfileData(profileExtras);
        localStorage.setItem(profileExtrasKey, JSON.stringify(profileExtras));

        setIsEditing(false);
        toast({
          title: "Профиль обновлён",
          description: "Ваши данные успешно сохранены",
        });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить профиль",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || "",
      email: user?.email || "",
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      phone: profileData.phone,
    });
    setIsEditing(false);
  };

  const getUserInitials = () => {
    if (profileData.first_name && profileData.last_name) {
      return (
        profileData.first_name[0] + profileData.last_name[0]
      ).toUpperCase();
    }
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const getDisplayName = () => {
    if (profileData.first_name || profileData.last_name) {
      return `${profileData.first_name} ${profileData.last_name}`.trim();
    }
    return user?.username || "Пользователь";
  };

  const getStats = () => {
    if (!dashboardData) {
      return [
        {
          label: "Транзакций",
          value: "0",
          icon: <Activity className="h-5 w-5" />,
          color: "text-blue-600 bg-blue-100",
        },
        {
          label: "Бюджетов",
          value: "0",
          icon: <CreditCard className="h-5 w-5" />,
          color: "text-green-600 bg-green-100",
        },
        {
          label: "Сбережения",
          value: "0%",
          icon: <TrendingUp className="h-5 w-5" />,
          color: "text-purple-600 bg-purple-100",
        },
      ];
    }

    const savingsRateRaw =
      dashboardData.savings_rate ||
      (dashboardData.total_income
        ? ((dashboardData.total_income - dashboardData.total_expenses) /
            dashboardData.total_income) *
          100
        : 0);
    const savingsRate = Number(savingsRateRaw.toFixed(1));

    return [
      {
        label: "Транзакций",
        value: dashboardData.total_transactions
          ? dashboardData.total_transactions.toString()
          : "0",
        icon: <Activity className="h-5 w-5" />,
        color: "text-blue-600 bg-blue-100",
      },
      {
        label: "Бюджетов",
        value: "0",
        icon: <CreditCard className="h-5 w-5" />,
        color: "text-green-600 bg-green-100",
      },
      {
        label: "Сбережения",
        value: `${savingsRate}%`,
        icon: <TrendingUp className="h-5 w-5" />,
        color: "text-purple-600 bg-purple-100",
      },
    ];
  };

  if (isLoadingProfile) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Профиль</h1>
        <p className="text-gray-600 mt-1">Управляйте информацией о себе</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Header Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border hover:bg-gray-50">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold">{getDisplayName()}</h2>
              <p className="text-gray-500">
                {user?.email || "email@example.com"}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  <Shield className="h-3 w-3" />
                  Активный аккаунт
                </span>
                <span className="text-sm text-gray-500">
                  С{" "}
                  {new Date(user?.created_at || Date.now()).toLocaleDateString(
                    "ru-RU",
                    { month: "long", year: "numeric" },
                  )}
                </span>
              </div>
            </div>
            <Button
              variant={isEditing ? "outline" : "default"}
              onClick={() => {
                if (isEditing) {
                  handleCancel();
                } else {
                  setIsEditing(true);
                }
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              {isEditing ? "Отменить" : "Редактировать"}
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {getStats().map((stat) => (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${stat.color}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Profile Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Личная информация</h3>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Имя пользователя</Label>
                <div className="mt-1 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  {isEditing ? (
                    <Input
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder="Имя пользователя"
                    />
                  ) : (
                    <span className="text-gray-900">
                      {user?.username || "—"}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {isEditing ? (
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="Email"
                    />
                  ) : (
                    <span className="text-gray-900">{user?.email || "—"}</span>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Имя</Label>
                {isEditing ? (
                  <Input
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    placeholder="Имя"
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">
                    {profileData.first_name || "—"}
                  </p>
                )}
              </div>
              <div>
                <Label>Фамилия</Label>
                {isEditing ? (
                  <Input
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    placeholder="Фамилия"
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">
                    {profileData.last_name || "—"}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label>Телефон</Label>
              <div className="mt-1 flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                {isEditing ? (
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+7 (999) 123-45-67"
                  />
                ) : (
                  <span className="text-gray-900">
                    {profileData.phone || "—"}
                  </span>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Отмена
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Check className="mr-2 h-4 w-4" />
                  {isSaving ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Account Info */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Информация об аккаунте</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Дата регистрации</span>
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                {new Date(user?.created_at || Date.now()).toLocaleDateString(
                  "ru-RU",
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Статус аккаунта</span>
              <span className="inline-flex items-center gap-1 text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                <Check className="h-3 w-3" />
                Активен
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Тип аккаунта</span>
              <span className="text-gray-900">
                {user?.is_admin ? "Администратор" : "Пользователь"}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
