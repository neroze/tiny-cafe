import { Link, useLocation } from "wouter";
import { LayoutDashboard, Coffee, Receipt, Package, Menu as MenuIcon, X, Users } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/reports/revenue-by-item", label: "Revenue Reports", icon: LayoutDashboard },
    { href: "/sales", label: "Sales & Orders", icon: Receipt },
    { href: "/tables", label: "Tables", icon: Users },
    { href: "/menu", label: "Menu Items", icon: Coffee },
    { href: "/stock", label: "Inventory", icon: Package },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/recipes", label: "Recipes (BOM)", icon: MenuIcon },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-background border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-lg">
            C
          </div>
          <span className="font-display font-bold text-xl">Café Log</span>
        </div>
        <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-2 text-foreground">
          {isMobileOpen ? <X /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 top-16 bg-background z-40 p-4 border-t border-border"
          >
            <nav className="flex flex-col gap-2">
              {links.map((link) => (
                <Link key={link.href} href={link.href}>
                  <div 
                    onClick={() => setIsMobileOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                      ${location === link.href 
                        ? "bg-primary text-primary-foreground font-medium" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }
                    `}
                  >
                    <link.icon className="w-5 h-5" />
                    {link.label}
                  </div>
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border h-screen sticky top-0 p-6 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white flex items-center justify-center font-display font-bold text-xl shadow-lg shadow-primary/20">
            C
          </div>
          <span className="font-display font-bold text-2xl tracking-tight">Café Log</span>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <div className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group
                ${location === link.href 
                  ? "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20 translate-x-1" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:translate-x-1"
                }
              `}>
                <link.icon className={`w-5 h-5 ${location === link.href ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"}`} />
                {link.label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="mt-auto px-4 py-4 rounded-2xl bg-secondary/30 border border-border">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Status</p>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-foreground">System Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen bg-muted/20">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
