"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useTheme } from "next-themes";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bot,
  Box,
  Calendar,
  BarChart3,
  Cpu,
  ArrowUpRight,
  Globe,
  LayoutGrid,
  PenTool,
  ScanText,
  Shield,
  Smile,
  Sparkles,
  BookOpen,
  Briefcase,
  Code,
  Component,
  Network,
  Layers,
  Monitor,
  Moon,
  Sun,
  PlusCircle,
  LogOut,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";

function BrandLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-black tracking-tight", className)}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary">
        <polygon points="12 2 22 19 2 19" fill="currentColor" opacity="0.9" />
      </svg>
      <span className="font-mono text-lg font-bold tracking-tighter">POLARIS</span>
    </div>
  );
}

const cloud: {
  title: string;
  icon: ReactElement;
  href: string;
  description: string;
}[] = [
  {
    title: "AI Cluster Hub",
    href: "#",
    icon: <Box className="size-4" />,
    description: "Multi-device WhatsApp Baileys architecture",
  },
  {
    title: "Hermes Agent",
    href: "#",
    icon: <Sparkles className="size-4" />,
    description: "Autonomous reasoning & code artifacts",
  },
  {
    title: "Auto-Responder",
    href: "#",
    icon: <ArrowUpRight className="size-4" />,
    description: "Contextual automated trigger engine",
  },
];

const core: {
  title: string;
  icon: ReactElement;
  href: string;
  description: string;
}[] = [
  {
    title: "Group Moderation",
    href: "#",
    icon: <LayoutGrid className="size-4" />,
    description: "Antilink, antibad, antispam & warn system",
  },
  {
    title: "Story / SW Hub",
    href: "#",
    icon: <Globe className="size-4" />,
    description: "Schedule & broadcast status updates",
  },
  {
    title: "Realtime WebSocket",
    href: "#",
    icon: <Cpu className="size-4" />,
    description: "Live terminal stream & event dispatch",
  },
  {
    title: "Analytics & Logs",
    href: "#",
    icon: <BarChart3 className="size-4" />,
    description: "Audit trail and command usage statistics",
  },
];

const security: {
  title: string;
  icon: ReactElement;
  href: string;
  description: string;
}[] = [
  {
    title: "Luna Whitelist",
    href: "#",
    icon: <Bot className="size-4" />,
    description: "Multi-tiered owner and admin clearance",
  },
  {
    title: "Anti-Delete Sentry",
    href: "#",
    icon: <ScanText className="size-4" />,
    description: "Automatic cache & media recovery",
  },
  {
    title: "Security Shield",
    href: "#",
    icon: <Shield className="size-4" />,
    description: "Rate limit & anti-crash protection",
  },
  {
    title: "Session Sentinel",
    href: "#",
    icon: <Calendar className="size-4" />,
    description: "Automatic credential rotation & lock",
  },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 flex h-16 w-full items-center justify-between px-4 transition-all duration-300 ${
        scrolled
          ? "border-b border-border/40 bg-background/80 backdrop-blur-xl shadow-sm"
          : "border-b border-transparent bg-background/50 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <div className="flex items-center gap-6">
          <BrandLogo />
          <NavigationMenu className="hidden lg:flex" viewport={true}>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "h-8 rounded-full font-normal text-muted-foreground hover:text-foreground"
                  )}
                >
                  Features
                </NavigationMenuTrigger>
                <NavigationMenuContent className="bg-popover border border-border/60 shadow-xl rounded-xl">
                  <ul className="grid w-[400px] gap-2 p-4 md:w-[750px] md:grid-cols-3">
                    <div>
                      <span className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        AI & Automation
                      </span>
                      {cloud.map((item) => (
                        <ListItem key={item.title} title={item.title} icon={item.icon} href={item.href}>
                          {item.description}
                        </ListItem>
                      ))}
                    </div>
                    <div>
                      <span className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Core System
                      </span>
                      {core.map((item) => (
                        <ListItem key={item.title} title={item.title} icon={item.icon} href={item.href}>
                          {item.description}
                        </ListItem>
                      ))}
                    </div>
                    <div>
                      <span className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Security
                      </span>
                      {security.map((item) => (
                        <ListItem key={item.title} title={item.title} icon={item.icon} href={item.href}>
                          {item.description}
                        </ListItem>
                      ))}
                    </div>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "h-8 rounded-full font-normal text-muted-foreground hover:text-foreground"
                  )}
                >
                  Modules
                </NavigationMenuTrigger>
                <NavigationMenuContent className="bg-popover border border-border/60 shadow-xl rounded-xl">
                  <ul className="grid w-[400px] gap-2 p-4 md:w-[500px] md:grid-cols-2">
                    <ListItem title="Downloader Hub" icon={<Globe className="size-4" />} href="#downloader">
                      Media extraction from 20+ platforms
                    </ListItem>
                    <ListItem title="Media & Storage" icon={<Layers className="size-4" />} href="#storage">
                      Tmp cleaner, session manager & viewer
                    </ListItem>
                    <ListItem title="Terminal Console" icon={<Code className="size-4" />} href="#terminal">
                      Live interactive server shell
                    </ListItem>
                    <ListItem title="Command Overrides" icon={<Network className="size-4" />} href="#commands">
                      Custom prefix, outputs & permission logic
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "h-8 rounded-full font-normal text-muted-foreground hover:text-foreground"
                  )}
                >
                  <a href="#hermes">Hermes AI</a>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "h-8 rounded-full font-normal text-muted-foreground hover:text-foreground"
                  )}
                >
                  <a href="#overview">Bot Hub</a>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          
          <Button variant="outline" size="sm" className="hidden sm:inline-flex rounded-full text-xs">
            Documentation
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full ring-2 ring-primary/20 hover:ring-primary/50 transition-all outline-none">
                <Avatar className="size-8">
                  <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="Admin" />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">PL</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2 rounded-xl" align="end">
              <div className="p-2">
                <h4 className="font-semibold text-sm">Polaris Administrator</h4>
                <p className="text-xs text-muted-foreground">admin@polaris.space</p>
                <span className="mt-1 inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Cluster Owner
                </span>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem className="cursor-pointer text-xs py-2">Dashboard Hub</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-xs py-2">Cluster Settings</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-xs py-2 justify-between">
                  New Bot Instance <PlusCircle className="size-3.5 text-muted-foreground" />
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-xs py-2 text-rose-500 focus:text-rose-400 justify-between">
                Disconnect / Logout <LogOut className="size-3.5" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function ListItem({
  title,
  icon,
  children,
  href,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & {
  title: string;
  href: string;
  icon: ReactElement;
}) {
  return (
    <li {...props} className={cn("list-none", className)}>
      <NavigationMenuLink asChild>
        <a
          href={href}
          className="group block select-none space-y-1 rounded-lg p-2.5 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent"
        >
          <div className="flex items-center gap-2.5">
            <div className="rounded-md border border-border/80 bg-background/50 p-1.5 text-foreground transition-transform group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
              {icon}
            </div>
            <div>
              <div className="text-xs font-semibold leading-none text-foreground group-hover:text-primary">
                {title}
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {children}
              </p>
            </div>
          </div>
        </a>
      </NavigationMenuLink>
    </li>
  );
}

export function ThemeSwitcher({ className }: { className?: string }) {
  let themeObj: { theme?: string; setTheme: (t: string) => void };
  try {
    themeObj = useTheme();
  } catch {
    themeObj = { theme: "dark", setTheme: () => {} };
  }
  const { theme = "dark", setTheme } = themeObj;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("flex h-7 w-20 items-center justify-center rounded-full bg-muted/30 p-1", className)} />
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-7 items-center rounded-full bg-muted/40 p-0.5 ring-1 ring-border/50 backdrop-blur-sm",
        className
      )}
    >
      {[
        { key: "system", icon: Monitor, label: "System" },
        { key: "light", icon: Sun, label: "Light" },
        { key: "dark", icon: Moon, label: "Dark" },
      ].map(({ key, icon: Icon, label }) => {
        const isActive = theme === key;
        return (
          <button
            key={key}
            type="button"
            aria-label={label}
            onClick={() => setTheme(key)}
            className={cn(
              "relative flex size-6 items-center justify-center rounded-full transition-all duration-200",
              isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

export default Header;
