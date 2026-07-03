
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Section } from "@/components/ui-kit";
import { Plus, Trash2, FolderOpen, Upload, Edit2 } from "lucide-react";
import { ChatProject, fetchChats, createChat, deleteChat, setActiveChatId, updateChat } from "@/lib/chat-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/chat-history")({ component: ChatHistoryPage });

function ChatHistoryPage() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatProject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editProductName, setEditProductName] = useState("");

  const reload = async () => {
    const fetchedChats = await fetchChats();
    setChats(fetchedChats);
    setActiveId(localStorage.getItem("marketform_active_chat_id"));
  };

  useEffect(() => {
    reload();
    window.addEventListener("marketform-chat-change", reload);
    return () => window.removeEventListener("marketform-chat-change", reload);
  }, []);

  const newChat = async () => {
    const chat = await createChat("New Product Analysis", "New Product");
    setActiveChatId(chat.id);
    await reload();
    navigate({ to: "/app/product-intelligence" });
  };

  const openChat = async (id: string) => {
    setActiveChatId(id);
    await reload();
    navigate({ to: "/app/product-intelligence" });
  };

  const startEdit = (chat: ChatProject) => {
    setEditingId(chat.id);
    setEditTitle(chat.title);
    setEditProductName(chat.productName || "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateChat(editingId, editTitle, editProductName);
    setEditingId(null);
    await reload();
  };

  const filteredChats = chats.filter(
    (chat) =>
      chat.title.toLowerCase().includes(search.toLowerCase()) ||
      (chat.productName && chat.productName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <PageHeader
        eyebrow="Saved Projects"
        title="Chat History"
        description="Each history item is one product analysis project. Switching to a new product resets the dashboard context, while old project results stay saved."
      />
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats..."
          className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
        />
        <button
          onClick={newChat}
          className="px-5 h-11 rounded-xl gradient-brand text-white font-semibold flex items-center gap-2 glow-blue"
        >
          <Plus className="w-4 h-4" /> New Product Analysis
        </button>
      </div>
      <Section
        title="Product Analysis Projects"
        description="Open a project to continue Product, Market, SEO, Social, Campaign, Analytics and ROI analysis for that product."
      >
        {filteredChats.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
            <FolderOpen className="w-10 h-10 mx-auto text-brand-cyan mb-3" />
            <h3 className="font-semibold text-lg">No product projects yet</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Create a new analysis project and start with Product Analysis.
            </p>
            <button
              onClick={newChat}
              className="mt-5 px-5 h-10 rounded-xl bg-brand-blue text-white text-sm font-semibold"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "rounded-3xl border p-5 bg-white/5",
                  activeId === chat.id ? "border-brand-cyan/70" : "border-white/10"
                )}
              >
                {editingId === chat.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Title</label>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Product Name</label>
                      <input
                        value={editProductName}
                        onChange={(e) => setEditProductName(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 h-9 rounded-lg bg-brand-blue text-white text-sm font-semibold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 h-9 rounded-lg bg-white/5 border border-white/10 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => openChat(chat.id)} className="text-left flex-1">
                      <div className="text-xs uppercase tracking-wider text-brand-cyan mb-2">Product Project</div>
                      <h3 className="text-xl font-display font-bold">{chat.productName || chat.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{chat.title}</p>
                    </button>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(chat);
                        }}
                        className="h-9 w-9 rounded-lg glass grid place-items-center hover:border-brand-blue/40"
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await deleteChat(chat.id);
                          await reload();
                        }}
                        className="h-9 w-9 rounded-lg glass grid place-items-center hover:border-red-400/40"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                )}
                {editingId !== chat.id && (
                  <button
                    onClick={() => openChat(chat.id)}
                    className="mt-5 w-full h-10 rounded-xl bg-white/5 border border-white/10 hover:border-brand-blue/40 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" /> Open Product Intelligence
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
