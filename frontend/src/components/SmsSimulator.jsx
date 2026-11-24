import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Bot, 
  User, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export default function SmsSimulator({ onReportSubmitted }) {
  const [phone, setPhone] = useState('+919876543210');
  const [inputSms, setInputSms] = useState('HELP V101 1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Chat conversation history inside simulated phone
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'system',
      text: 'National Health Mission (Northeast India) Emergency SMS Gateway Online. Format: HELP <VILLAGE_CODE> <1=Diarrhea, 2=Fever, 3=Dirty Water>. Example: HELP V101 1',
      time: '12:00 PM',
    },
    {
      id: 2,
      sender: 'user',
      text: 'HELP V101 1',
      time: '12:01 PM',
    },
    {
      id: 3,
      sender: 'gateway',
      text: 'Alert received for Majuli Island Rural. Please drink boiled water and prepare ORS solution immediately. Local ASHA worker and PHC have been notified.',
      time: '12:01 PM',
      meta: { village: 'V101', type: 'DIARRHEA' },
    },
  ]);

  const quickPresets = [
    {
      label: 'Diarrhea Cluster (Majuli)',
      code: 'HELP V101 1',
      desc: 'Code 1 -> Diarrhea symptom & ORS advisory',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      label: 'Fever Outbreak (Laharighat)',
      code: 'HELP V103 2',
      desc: 'Code 2 -> Fever symptom & clinic alert',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      label: 'Contaminated Water (Majuli)',
      code: 'HELP V101 3',
      desc: 'Code 3 -> Dirty water test log & boil alert',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      label: 'Invalid Village Simulation',
      code: 'HELP V999 1',
      desc: 'Simulate unknown village error response',
      badge: 'bg-slate-700 text-slate-300 border-slate-600',
    },
  ];

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputSms).trim();
    if (!text) return;

    setLoading(true);
    setError(null);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append outgoing user SMS
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      time: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputSms('');

    try {
      const res = await api.sendSmsWebhook(phone, text);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'gateway',
        text: res.auto_reply_sms,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        meta: {
          village: res.parsed_village_code,
          type: res.parsed_report_type,
          recordId: res.record_id,
          status: res.status,
        },
      };
      setMessages((prev) => [...prev, botMsg]);
      if (onReportSubmitted) onReportSubmitted();
    } catch (err) {
      setError(err.message);
      const errMsg = {
        id: Date.now() + 1,
        sender: 'system',
        text: `Network Error: ${err.message}. Ensure backend is running at http://127.0.0.1:8000`,
        time: now,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Module Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Smartphone className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-white">Live Villager SMS & IoT Webhook Gateway</h2>
            <p className="text-xs text-slate-400">
              Zero-internet feature phone emergency reporting for remote villages via short-code parsing (POST /webhooks/sms)
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages(messages.slice(0, 1))}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear Conversation</span>
        </button>
      </div>

      {/* Main Grid: Interactive Smartphone Mockup + Presets & API Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT / CENTER: Realistic Mock Smartphone Frame (5 Cols) */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-[340px] sm:w-[360px] h-[640px] bg-slate-950 rounded-[44px] border-[10px] border-slate-800 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden relative">
            
            {/* Top Phone Speaker Notch & Camera */}
            <div className="h-6 bg-slate-950 flex items-center justify-center relative z-20">
              <div className="w-24 h-4 bg-slate-800 rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-slate-900 rounded-full mr-2"></div>
                <div className="w-8 h-1 bg-slate-900 rounded-full"></div>
              </div>
            </div>

            {/* Simulated Phone Status Bar */}
            <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="font-bold text-slate-200">108 NHM HEALTH</span>
              </div>
              <span className="font-mono text-[10px]">SMS SERVER</span>
            </div>

            {/* SMS Message Thread (Scrollable) */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-950 text-xs">
              {messages.map((msg) => {
                if (msg.sender === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3.5 py-2 shadow-md">
                        <p className="font-mono font-semibold">{msg.text}</p>
                        <p className="text-[9px] text-blue-200 text-right mt-1">{msg.time}</p>
                      </div>
                    </div>
                  );
                } else if (msg.sender === 'gateway') {
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="max-w-[85%] bg-slate-800 text-slate-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 border border-slate-700 shadow-md">
                        <div className="flex items-center space-x-1 text-[10px] text-emerald-400 font-bold mb-1">
                          <Bot className="w-3 h-3" />
                          <span>AUTO-ADVISORY RESPONSE</span>
                        </div>
                        <p className="leading-relaxed">{msg.text}</p>
                        {msg.meta && (
                          <div className="mt-2 pt-1.5 border-t border-slate-700/60 flex flex-wrap gap-1 text-[9px] font-mono">
                            {msg.meta.village && <span className="px-1.5 py-0.2 rounded bg-slate-900 text-cyan-300">Village: {msg.meta.village}</span>}
                            {msg.meta.type && <span className="px-1.5 py-0.2 rounded bg-slate-900 text-amber-300">Type: {msg.meta.type}</span>}
                            {msg.meta.recordId && <span className="px-1.5 py-0.2 rounded bg-slate-900 text-emerald-300">DB ID: #{msg.meta.recordId}</span>}
                          </div>
                        )}
                        <p className="text-[9px] text-slate-400 text-right mt-1">{msg.time}</p>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={msg.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-[11px] leading-relaxed text-center">
                      {msg.text}
                    </div>
                  );
                }
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-300 rounded-2xl px-3 py-2 text-xs flex items-center space-x-2 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                    <span>SMS Gateway processing...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom SMS Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder="Type SMS (e.g. HELP V101 1)"
                value={inputSms}
                onChange={(e) => setInputSms(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                type="submit"
                disabled={loading || !inputSms.trim()}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Bottom Phone Home Indicator */}
            <div className="h-4 bg-slate-950 flex items-center justify-center">
              <div className="w-28 h-1 bg-slate-700 rounded-full"></div>
            </div>

          </div>
        </div>

        {/* RIGHT: Quick Test Presets & Architectural Guide (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Quick Presets for Hackathon Judges */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                1-Click Preset Test Triggers
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Click any button below to instantly trigger simulated SMS messages to <code className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300">POST /webhooks/sms</code> and view the English emergency advisory auto-reply.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickPresets.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSend(preset.code)}
                  className="bg-slate-950 border border-slate-800 hover:border-blue-500/60 p-3.5 rounded-xl cursor-pointer transition hover:scale-[1.01] group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white group-hover:text-blue-400 transition">
                      {preset.label}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${preset.badge}`}>
                      {preset.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{preset.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SMS Parsing Protocol Reference */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Northeast India SMS Grammar Specification
            </h3>
            
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px]">
                <span className="text-purple-400">COMMAND FORMAT:</span> HELP &lt;VILLAGE_CODE&gt; &lt;OPTION_CODE&gt;
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="block font-bold text-blue-400 font-mono">CODE 1</span>
                  <span className="text-slate-300">Diarrhea Alert</span>
                  <span className="block text-[10px] text-slate-400 mt-1">Logs Symptom & Advises ORS</span>
                </div>
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="block font-bold text-amber-400 font-mono">CODE 2</span>
                  <span className="text-slate-300">Fever Spike</span>
                  <span className="block text-[10px] text-slate-400 mt-1">Advises Clinic & Hydration</span>
                </div>
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="block font-bold text-teal-400 font-mono">CODE 3</span>
                  <span className="text-slate-300">Dirty Tap Water</span>
                  <span className="block text-[10px] text-slate-400 mt-1">Logs Water Log & Boil Alert</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
              💡 <strong>Judge Note:</strong> The backend automatically creates database records in <code className="text-white">symptom_reports</code> or <code className="text-white">water_quality_logs</code>, triggering real-time risk score escalation.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
