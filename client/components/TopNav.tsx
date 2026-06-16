import { useNavigate, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useViewer } from "./ViewerContext";

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { viewer, logout } = useViewer();
  const isAdmin = viewer?.isAdmin === true;

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shadow-sm">
      {/* Logo / Brand */}
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => navigate("/library")}
      >
        <span className="text-2xl">🏕️</span>
        <h1 className="text-xl font-bold text-primary tracking-tight">
          cAMP Ascent
        </h1>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">
          Training
        </span>
      </div>

      {/* Navigation links */}
      <nav className="flex items-center gap-1">
        <Button
          variant={isActive("/library") || isActive("/") ? "default" : "ghost"}
          size="sm"
          onClick={() => navigate("/library")}
        >
          <span className="mr-1">🎞️</span>
          Clips
        </Button>

        <Button
          variant={isActive("/xp") ? "default" : "ghost"}
          size="sm"
          onClick={() => navigate("/xp")}
        >
          <span className="mr-1">🔭</span>
          XP-lanation
        </Button>

        {isAdmin && (
          <>
            <Button
              variant={isActive("/analytics") ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate("/analytics")}
            >
              <span className="mr-1">📊</span>
              Analytics
            </Button>
            <Button
              variant={isActive("/admin") ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate("/admin")}
            >
              <span className="mr-1">⚙️</span>
              Admin
            </Button>
          </>
        )}
      </nav>

      {/* User info */}
      <div className="flex items-center gap-3">
        {viewer && (
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">
                {viewer.name}
              </span>
              <span className="text-xs text-muted-foreground">{viewer.role}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              <Icon icon="log-out" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
