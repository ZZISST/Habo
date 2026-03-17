import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading";

export function DemoPage() {
  const navigate = useNavigate();
  const { loginAsDemo, user } = useAuth();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // Call loginAsDemo synchronously — it sets state + localStorage immediately
    loginAsDemo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate once the user state has been set by loginAsDemo
  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 mt-4">Загрузка демо-режима...</p>
      </div>
    </div>
  );
}
