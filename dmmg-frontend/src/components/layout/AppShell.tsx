import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";

export default function AppShell() {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem("token");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div
            className="font-semibold text-lg cursor-pointer"
            onClick={() =>
              navigate(isAuthenticated ? "/dashboard" : "/")
            }
          >
            Digital Meeting Minutes Generator
          </div>

          {isAuthenticated ? (
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem("token");
                navigate("/");
              }}
            >
              Logout
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate("/")}>
              Login
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
