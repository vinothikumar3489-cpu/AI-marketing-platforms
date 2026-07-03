
import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { getActiveProject } from '@/lib/project-store';
import { PageHeader, Section } from '@/components/ui-kit';
import { AlertCircle, Sparkles, Send, Copy, ArrowRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export function AgentsPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const project = typeof window !== 'undefined' ? getActiveProject() : null;
  const chatId = project?.id || '';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!chatId) return;
    (async () => {
      try {
        const r = await api.get(`/api/chats/${chatId}/ai-assistant/messages`);
        if (r?.data?.success) {
          setMessages(r.data.messages || []);
        }
      } catch {
        // silent
      }
    })();
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || !chatId) return;

    const tempUserMessage: any = {
      id: Date.now(),
      role: 'user',
      content: inputValue
    };
    setMessages([...messages, tempUserMessage]);
    setInputValue('');
    setLoading(true);
    setError(null);

    try {
      const r = await api.post(`/api/chats/${chatId}/ai-assistant/chat`, { userMessage: inputValue });
      const assistantMessage: any = {
        id: Date.now() + 1,
        role: 'assistant',
        content: r.data.answer,
        analysisData: r.data
      };
      setMessages([...messages, tempUserMessage, assistantMessage]);
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Failed to send message';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="AI Workflow Agents" description="AI-powered tools for complete marketing solutions" />
      
      {/* Solution Generator Card */}
      <div className="p-4">
        <Link to="/app/solution-generator">
          <div className="rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-6 hover:border-blue-500/40 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Complete Marketing Solution Generator</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate a comprehensive marketing strategy with ready-to-use assets based on your intelligence modules
                  </p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Link>
      </div>

      <div className="border-t border-white/10 my-4" />
      
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        <Section title="AI Assistant Chat">
          {messages.length === 0 && (
            <div className="text-muted-foreground text-sm">
              Ask questions about your product, market, competitors, SEO, campaigns, or audience!
              Make sure you've run some analysis modules first.
            </div>
          )}
        </Section>

        {messages.map((msg, index) => (
          <div key={index} className={`max-w-3xl ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
            <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                {msg.role === 'user' ? 'You' : 'MarketForm AI'}
              </div>
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

              {msg.role === 'assistant' && msg.analysisData && (
                <div className="mt-4 space-y-3">
                  {msg.analysisData.usedContextModules && msg.analysisData.usedContextModules.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-brand-blue mb-1">Context used</div>
                      <div className="flex flex-wrap gap-2">
                        {msg.analysisData.usedContextModules.map((module: string, idx: number) => (
                          <span key={idx} className="rounded-full bg-brand-blue/20 px-3 py-1 text-xs">
                            {module}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {msg.analysisData.suggestedNextActions && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-brand-purple mb-1">Suggested next steps</div>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {msg.analysisData.suggestedNextActions.map((action: string, idx: number) => (
                          <li key={idx}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() => copyToClipboard(msg.content)}
                    className="text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Ask a question about your product, market, competitors, or SEO..."
            className="flex-1 h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !inputValue.trim()}
            className="px-6 h-12 rounded-2xl gradient-brand text-white font-semibold flex items-center gap-2 glow-blue disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AgentsPage;
