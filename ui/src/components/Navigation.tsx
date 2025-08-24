// src/components/Navigation.tsx
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Flag, Activity, Calendar } from "lucide-react";

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Home", icon: Flag },
    { path: "/telemetry", label: "Telemetry", icon: Activity },
    { path: "/schedule", label: "Schedule", icon: Calendar },
  ];

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 bg-gradient-racing rounded-lg flex items-center justify-center racing-pulse">
              <Flag className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="racing-title text-2xl font-bold">ApexView</span>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center space-x-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Button
                  key={path}
                  asChild
                  variant={isActive ? "default" : "ghost"}
                  className={`transition-racing ${
                    isActive 
                      ? "bg-primary text-primary-foreground racing-glow" 
                      : "hover:bg-secondary/50"
                  }`}
                >
                  <Link to={path} className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{label}</span>
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;