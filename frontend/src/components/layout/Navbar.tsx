"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, BarChart3, Lock, Terminal, FileText, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function Navbar() {
  const pathname = usePathname();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [queryCount, setQueryCount] = useState(0);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/system-status");
        if (res.ok) {
          const data = await res.json();
          setApiOnline(true);
          setQueryCount(data.totalQueries || 0);
        } else {
          setApiOnline(false);
        }
      } catch {
        setApiOnline(false);
      }
    }
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: "Ownership Audit", href: "/", icon: Shield },
    { name: "Research Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Trigger Vault", href: "/vault", icon: Lock },
    { name: "Live Playground", href: "/playground", icon: Terminal },
    { name: "Certificates (DB)", href: "/certificates", icon: FileText },
    { name: "Defense Matrix", href: "/matrix", icon: Scale },
  ];

  return (
    <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs group-hover:opacity-90 transition">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-foreground">ModelGuard</div>
            <div className="text-xs text-muted-foreground font-medium">Model Watermarking & Extraction Defense</div>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  active
                    ? "bg-secondary text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Live Status */}
        <div className="flex items-center gap-3">
          <Badge variant={apiOnline ? "success" : "secondary"} className="gap-2 py-1 px-3">
            <span
              className={`w-2 h-2 rounded-full ${
                apiOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
              }`}
            ></span>
            <span>{apiOnline ? "API Online (8000)" : "Connecting API..."}</span>
          </Badge>
          <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 py-1 px-3 font-mono">
            <span className="text-muted-foreground">Queries:</span>
            <span className="font-bold text-foreground">{queryCount}</span>
          </Badge>
        </div>
      </div>
    </header>
  );
}
