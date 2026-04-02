import { User } from "@/types";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, User as PhUser } from "@phosphor-icons/react";

interface AppHeaderProps {
  user: User;
  backTo?: string;
}

export default function AppHeader({ user, backTo }: AppHeaderProps) {
  const navigate = useNavigate();
  const isPro = user.plan?.type === "pro";

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {backTo && (
            <button onClick={() => navigate(backTo)} className="text-neutral-400 hover:text-neutral-700 transition-colors">
              <ArrowLeft size={20} weight="bold" />
            </button>
          )}
          <img
            src="https://pub-599d1182afd34ef9bba864fbaca57854.r2.dev/logotipodrovenfy.png"
            alt="Drovenfy"
            className="h-7 w-auto"
          />
        </div>

        <button
          onClick={() => navigate("/profile")}
          className="relative w-9 h-9 flex-shrink-0"
          title="Meu perfil"
        >
          <div className="w-9 h-9 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 hover:border-neutral-300 transition-all overflow-hidden">
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : user.name ? (
              <span className="text-xs font-bold uppercase">{user.name.charAt(0)}</span>
            ) : (
              <PhUser size={16} weight="bold" />
            )}
          </div>
          {isPro && (
            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white z-10">
              <Crown size={8} weight="fill" className="text-white" />
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
