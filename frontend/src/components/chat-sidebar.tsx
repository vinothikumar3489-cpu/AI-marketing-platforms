import { Link } from "@tanstack/react-router";
import { Plus, Trash, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatSidebar({ chats, activeChatId, onNew, onDelete, onLogout }) {
  return (
    <aside className="w-[320px] min-w-[320px] border-r border-border/50 bg-sidebar/90 backdrop-blur-xl flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Chat History</div>
            <div className="text-xs text-muted-foreground">Each analysis lives in its own chat.</div>
          </div>
          <button onClick={onNew} className="h-9 px-3 rounded-lg bg-brand-blue/10 text-brand-blue text-sm font-medium hover:bg-brand-blue/15">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {chats.length === 0 ? (
          <div className="rounded-3xl glass p-4 text-sm text-muted-foreground">No analysis chats yet. Start a new one.</div>
        ) : (
          chats.map((chat) => {
            const active = chat.id === activeChatId;
            return (
              <div key={chat.id} className={cn("rounded-3xl p-4 border", active ? "border-brand-cyan bg-brand-cyan/10" : "border-white/10 bg-white/5")}>
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/chat/${chat.id}`} className="font-medium text-sm text-foreground hover:text-white">
                    {chat.productName || chat.title}
                  </Link>
                  <button onClick={(event) => { event.preventDefault(); onDelete(chat.id); }} className="text-muted-foreground hover:text-red-400">
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 truncate">{chat.title}</p>
              </div>
            );
          })
        )}
      </div>

      <div className="p-5 border-t border-border/50">
        <button onClick={onLogout} className="w-full rounded-2xl bg-white/5 py-3 text-sm font-medium text-foreground hover:bg-white/10 flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  );
}
