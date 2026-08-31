import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, CalendarClock, CalendarDays, ChartPie, Database, LayoutDashboard, LineChart, Menu, ShieldCheck, X } from "lucide-react";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/month-to-date", label: "Month to Date", icon: CalendarClock },
  { to: "/pay-periods", label: "Pay Period P&L", icon: CalendarDays },
  { to: "/categories", label: "Categories", icon: ChartPie },
  { to: "/forecast", label: "Forecast & Scenarios", icon: LineChart },
  { to: "/transactions", label: "Transactions", icon: BarChart3 },
  { to: "/data-health", label: "Assumptions & Data Health", icon: Database },
] as const;

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return <nav aria-label="Primary navigation">
    {nav.map(({ to, label, icon: Icon }) => (
      <NavLink key={to} to={to} end={to === "/"} onClick={onNavigate}>
        <Icon aria-hidden="true" size={19} /><span>{label}</span>
      </NavLink>
    ))}
  </nav>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const current = nav.find((item) => item.to === location.pathname)?.label ?? "Cashflow";
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><LineChart size={21} /></span><span>Cashflow</span></div>
      <Navigation />
      <div className="privacy-note"><span className="privacy-dot" /> <span><strong>Local data only</strong><small>All data stays on this device</small></span></div>
    </aside>
    <header className="mobile-header">
      <div className="brand"><span className="brand-mark"><LineChart size={19} /></span><span>Cashflow</span></div>
      <strong>{current}</strong>
      <button className="icon-button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
        {menuOpen ? <X /> : <Menu />}
      </button>
    </header>
    {menuOpen && <div className="mobile-drawer"><Navigation onNavigate={() => setMenuOpen(false)} /><div className="privacy-note"><ShieldCheck size={18} /><span>Local data only</span></div></div>}
    <main id="main-content">{children}</main>
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {nav.slice(0, 5).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === "/"}><Icon size={20} /><span>{label.replace(" & Scenarios", "")}</span></NavLink>)}
      <button type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Menu size={20} /><span>More</span></button>
    </nav>
  </div>;
}
