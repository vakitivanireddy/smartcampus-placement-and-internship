import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  BarChart3,
  Target,
  BookOpen,
  BrainCircuit,
  ClipboardCheck,
  Map,
  FileText,
  UserRound,
  Bell,
  Users,
  Library,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Sparkles,
  GraduationCap,
  ShieldCheck,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../api/client.js';
import { Avatar } from './ui.jsx';

const STUDENT_NAV = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/opportunities', label: 'Opportunities', icon: Briefcase },
      { to: '/applications', label: 'Applications', icon: ClipboardList },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Prepare',
    items: [
      { to: '/skill-gap', label: 'Skill gap', icon: Target },
      { to: '/preparation', label: 'Preparation', icon: BookOpen },
      { to: '/practice', label: 'Mock tests', icon: ClipboardCheck, end: true },
      { to: '/practice/aptitude', label: 'Aptitude practice', icon: BrainCircuit },
      { to: '/roadmap', label: 'Study roadmap', icon: Map },
      { to: '/resume', label: 'Resume', icon: FileText },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile', label: 'Profile', icon: UserRound },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
];

const ADMIN_NAV = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Admin overview', icon: LayoutDashboard, end: true },
      { to: '/admin/students', label: 'Students', icon: Users },
      { to: '/admin/opportunities', label: 'Opportunities', icon: Briefcase },
      { to: '/admin/applications', label: 'Applications', icon: ClipboardList },
    ],
  },
  {
    label: 'Insights & content',
    items: [
      { to: '/admin/skill-gaps', label: 'Skill gap trends', icon: Target },
      { to: '/admin/resources', label: 'Learning resources', icon: Library },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/notifications', label: 'Notifications', icon: Bell }],
  },
];

const TITLES = [
  { pattern: /^\/dashboard$/, title: 'Dashboard' },
  { pattern: /^\/opportunities$/, title: 'Opportunities' },
  { pattern: /^\/opportunities\/\d+$/, title: 'Opportunity details' },
  { pattern: /^\/applications$/, title: 'Applications' },
  { pattern: /^\/analytics$/, title: 'Analytics' },
  { pattern: /^\/skill-gap$/, title: 'Skill gap analysis' },
  { pattern: /^\/preparation$/, title: 'Preparation centre' },
  { pattern: /^\/preparation\/[^/]+$/, title: 'Preparation topic' },
  { pattern: /^\/practice$/, title: 'Mock tests & aptitude' },
  { pattern: /^\/practice\/aptitude$/, title: 'Aptitude practice' },
  { pattern: /^\/practice\/mock-tests\/[^/]+$/, title: 'Mock test' },
  { pattern: /^\/practice\/attempts\/[^/]+$/, title: 'Attempt review' },
  { pattern: /^\/roadmap$/, title: 'Study roadmap' },
  { pattern: /^\/resume$/, title: 'Resume' },
  { pattern: /^\/profile$/, title: 'Profile' },
  { pattern: /^\/notifications$/, title: 'Notifications' },
  { pattern: /^\/admin$/, title: 'Admin overview' },
  { pattern: /^\/admin\/students$/, title: 'Students' },
  { pattern: /^\/admin\/students\/\d+$/, title: 'Student profile' },
  { pattern: /^\/admin\/opportunities$/, title: 'Manage opportunities' },
  { pattern: /^\/admin\/opportunities\/new$/, title: 'New opportunity' },
  { pattern: /^\/admin\/opportunities\/\d+\/edit$/, title: 'Edit opportunity' },
  { pattern: /^\/admin\/applications$/, title: 'Application analytics' },
  { pattern: /^\/admin\/skill-gaps$/, title: 'Skill gap trends' },
  { pattern: /^\/admin\/resources$/, title: 'Learning resources' },
];

function pageTitle(pathname) {
  return TITLES.find((entry) => entry.pattern.test(pathname))?.title || 'Smart Placement';
}

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const menuRef = useRef(null);

  const nav = isAdmin ? ADMIN_NAV : STUDENT_NAV;
  const title = pageTitle(location.pathname);
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });

  useEffect(() => {
    setSidebarOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.title = `${title} · Smart Placement`;
  }, [title]);

  useEffect(() => {
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const result = await api.get('/notifications');
        if (!cancelled) setUnread(Number(result?.meta?.unread || 0));
      } catch {
        /* notification badge is non-critical */
      }
    };
    loadUnread();
    const onChange = () => loadUnread();
    window.addEventListener('notifications:changed', onChange);
    return () => {
      cancelled = true;
      window.removeEventListener('notifications:changed', onChange);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const onKey = (event) => event.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out. See you soon!');
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Link to={isAdmin ? '/admin' : '/dashboard'} className="brand-mark">
            <span className="brand-logo">
              <GraduationCap size={22} />
            </span>
            <span className="brand-text">
              <strong>SmartPlacement</strong>
              <small>Career readiness workspace</small>
            </span>
          </Link>
          <button type="button" className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-role">
          <span className={`role-icon ${isAdmin ? 'admin' : ''}`}>{isAdmin ? <ShieldCheck size={16} /> : <Sparkles size={16} />}</span>
          <div>
            <strong>{isAdmin ? 'Placement cell' : 'Student workspace'}</strong>
            <span>{isAdmin ? 'Manage the placement drive' : 'Prepare, apply, track progress'}</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {nav.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                  {item.to === '/notifications' && unread > 0 && <span className="nav-count">{unread}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-tip">
            <CalendarDays size={16} />
            <p>
              <strong>In-app reminders only</strong>
              <span>Email and SMS delivery is not configured.</span>
            </p>
          </div>
          <button type="button" className="sidebar-user" onClick={handleLogout}>
            <Avatar name={user?.name} size="sm" tone={isAdmin ? 'amber' : 'indigo'} />
            <span>
              <strong>{user?.name}</strong>
              <small>Sign out</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <div className="topbar-title">
              <span>{isAdmin ? 'Placement cell' : 'Student hub'}</span>
              <h2>{title}</h2>
            </div>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{today}</span>
            <Link to="/notifications" className="topbar-icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
              <Bell size={19} />
              {unread > 0 && <span className="notif-dot">{unread > 9 ? '9+' : unread}</span>}
            </Link>
            <div className="user-menu" ref={menuRef}>
              <button
                type="button"
                className="user-chip"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <Avatar name={user?.name} size="sm" tone={isAdmin ? 'amber' : 'indigo'} />
                <span className="user-chip-text">
                  <strong>{user?.name}</strong>
                  <small>{isAdmin ? 'Administrator' : 'Student'}</small>
                </span>
                <ChevronDown size={15} className={menuOpen ? 'rotated' : ''} />
              </button>
              {menuOpen && (
                <div className="user-dropdown" role="menu">
                  <div className="dropdown-head">
                    <strong>{user?.name}</strong>
                    <span>{user?.email}</span>
                  </div>
                  {!isAdmin && (
                    <Link to="/profile" role="menuitem">
                      <UserRound size={16} /> My profile
                    </Link>
                  )}
                  <Link to="/notifications" role="menuitem">
                    <Bell size={16} /> Notifications
                  </Link>
                  <button type="button" role="menuitem" onClick={handleLogout}>
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Smart Placement · sample data for demonstration</span>
          <span>Self-reported skills are for preparation planning, not verified credentials.</span>
        </footer>
      </div>
    </div>
  );
}
