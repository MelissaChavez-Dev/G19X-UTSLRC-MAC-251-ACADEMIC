import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { icon: "grid_view", label: "Overview", active: true },
  { icon: "assignment_add", label: "Survey Builder", active: false },
  { icon: "groups", label: "Team Directory", active: false },
  { icon: "auto_awesome", label: "AI Insights", active: false },
];

export default function Sidebar() {
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-primary-container text-on-primary z-50 flex flex-col justify-between shadow-lg">
      <div className="flex flex-col">
        <div className="h-16 px-space-md flex items-center gap-space-sm">
          <div className="h-8 w-8 rounded-md bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold">
            P
          </div>
          <div className="flex flex-col">
            <span className="text-headline-sm text-on-primary tracking-tight leading-none">PluriOne</span>
            <span className="text-label-sm text-secondary-container tracking-wider uppercase leading-none mt-1">
              Health
            </span>
          </div>
        </div>
        <nav className="px-space-sm mt-space-md flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-space-sm px-space-sm py-2.5 rounded-lg transition-colors ${
                item.active
                  ? "bg-surface-container-highest text-on-surface font-semibold"
                  : "text-inverse-on-surface opacity-40 cursor-not-allowed"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="text-body-md">{item.label}</span>
              {!item.active && <span className="text-label-sm ml-auto">Próx.</span>}
            </div>
          ))}
        </nav>
      </div>

      <div className="p-space-md flex flex-col gap-space-sm">
        <div className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface/10 backdrop-blur-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary-container animate-pulse" />
          <div className="flex flex-col">
            <span className="text-label-sm text-on-primary leading-tight">Live System Sync</span>
            <span className="text-label-sm text-inverse-on-surface opacity-75">Firestore</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-space-sm p-space-sm rounded-lg text-inverse-on-surface hover:bg-surface-container-highest hover:text-on-surface transition-colors text-left"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-body-md">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}