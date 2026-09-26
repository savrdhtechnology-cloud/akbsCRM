import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  Mail,
  CheckCheck,
  User,
  Sparkles,
  FileText
} from 'lucide-react';
import { Lead } from '../types';

interface CommunicationViewProps {
  leads: Lead[];
}

export const CommunicationView: React.FC<CommunicationViewProps> = ({ leads }) => {
  const [selectedLead, setSelectedLead] = useState<Lead>(leads[1]); // shona choudhary
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [messageText, setMessageText] = useState(
    'Namaste Shona ji, Greetings from AKBS Poultry Farming Pvt. Ltd.! We received your inquiry regarding broiler poultry farm setup. Our turnkey proposal including 15,000 birds EC shed and 25% NABARD capital subsidy is ready. Please let us know a suitable time for technical discussion.'
  );

  const [messageHistory, setMessageHistory] = useState([
    {
      id: 'm-1',
      sender: 'shona choudhary',
      text: 'Namaste sir, I have 2 acres land near Nagaur. Wanted to know 15,000 birds broiler farm total investment and subsidy.',
      time: '5:57 pm',
      isCustomer: true
    },
    {
      id: 'm-2',
      sender: 'AKBS Admin',
      text: 'Namaste Shona ji! Thank you for contacting AKBS Poultry. An Environmental Controlled (EC) shed for 15,000 birds requires approx ₹ 38-42 Lakhs with automatic feeding lines. NABARD 25% subsidy is applicable.',
      time: '6:05 pm',
      isCustomer: false
    }
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    const outgoing = messageText.trim();
    setMessageHistory(prev => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        sender: 'AKBS Admin',
        text: outgoing,
        time: 'Just now',
        isCustomer: false
      }
    ]);

    if (channel === 'whatsapp') {
      const phone = selectedLead.phone.replace(/[^0-9]/g, '');
      const withCountry = phone.length === 10 ? `91${phone}` : phone;
      window.open(`https://wa.me/${withCountry}?text=${encodeURIComponent(outgoing)}`, '_blank', 'noopener,noreferrer');
    } else if (channel === 'email') {
      window.location.href = `mailto:${selectedLead.email || ''}?subject=${encodeURIComponent('AKBS Poultry Farming')}&body=${encodeURIComponent(outgoing)}`;
    }
    setMessageText('');
  };

  const applyTemplate = (tpl: string) => {
    setMessageText(tpl);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
          Direct Farmer Communication
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Send WhatsApp updates, SMS reminders, and official quotation emails to poultry inquiries
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[650px]">
        {/* Left: Farmers List */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recent Inquiries & Conversations
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {leads.slice(0, 10).map((l) => (
              <div
                key={l.id}
                onClick={() => setSelectedLead(l)}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedLead.id === l.id ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{l.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{l.time}</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">{l.notes}</div>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-700 font-medium">
                  <span>{l.phone}</span>
                  <span>·</span>
                  <span>{l.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Message Window */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between overflow-hidden">
          {/* Top Bar of active chat */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0b2818] text-white flex items-center justify-center font-bold text-xs">
                {selectedLead.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-900">{selectedLead.name}</h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  {selectedLead.phone} · {selectedLead.location}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setChannel('whatsapp')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  channel === 'whatsapp' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                WhatsApp
              </button>
              <button
                onClick={() => setChannel('email')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  channel === 'email' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Email
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#fafcfb]">
            {messageHistory.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.isCustomer ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-lg p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                    m.isCustomer
                      ? 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                      : 'bg-emerald-700 text-white rounded-br-xs'
                  }`}
                >
                  <p>{m.text}</p>
                  <div className={`text-[9px] mt-1 flex items-center gap-1 justify-end font-mono ${
                    m.isCustomer ? 'text-slate-400' : 'text-emerald-200'
                  }`}>
                    <span>{m.time}</span>
                    {!m.isCustomer && <CheckCheck className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Poultry Templates */}
          <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-slate-400 shrink-0 font-medium text-[10px]">Templates:</span>
            <button
              onClick={() => applyTemplate(`Namaste ${selectedLead.name} ji, Here is the turnkey quotation for your ${selectedLead.birdCapacity.toLocaleString()} broiler farm shed. Total cost: ₹ ${(selectedLead.birdCapacity * 250 / 100000).toFixed(2)} Lakhs. NABARD subsidy eligible.`)}
              className="px-2 py-1 bg-white border border-slate-200 hover:border-emerald-500 rounded-md text-slate-700 shrink-0"
            >
              Turnkey Quotation
            </button>
            <button
              onClick={() => applyTemplate(`Namaste ${selectedLead.name} ji, Our technical field officer Er. Ankit Mishra is available tomorrow for site layout inspection. Please confirm location address.`)}
              className="px-2 py-1 bg-white border border-slate-200 hover:border-emerald-500 rounded-md text-slate-700 shrink-0"
            >
              Site Visit Booking
            </button>
            <button
              onClick={() => applyTemplate(`Namaste ji, Today's Broiler live farm gate mandi rate: ₹ 118/kg. Day-old-chicks (DOC) rate: ₹ 36/chick.`)}
              className="px-2 py-1 bg-white border border-slate-200 hover:border-emerald-500 rounded-md text-slate-700 shrink-0"
            >
              Daily Mandi Rates
            </button>
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-200 flex items-center gap-2 bg-white">
            <textarea
              rows={2}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={`Type a ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'} message to ${selectedLead.name}...`}
              className="flex-1 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
            />
            <button
              type="submit"
              className="px-4 py-3 bg-[#0b2818] hover:bg-[#123e27] text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
