import { useState } from 'react';
import { X, Send, Phone, User, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';

export default function ContactFormDialog({ open, onClose }) {
  const { language } = useLanguage();
  const isDe = language === 'de';
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!open) return null;

  const labels = {
    title: isDe ? 'Kontakt aufnehmen' : 'Get in touch',
    intro: isDe ? 'Schreiben Sie kurz, worum es geht — wir melden uns zurück.' : 'Tell us briefly what you need — we will get back to you.',
    name: isDe ? 'Name' : 'Name',
    phone: isDe ? 'Telefon' : 'Phone',
    message: isDe ? 'Anliegen' : 'Request',
    send: isDe ? 'Anfrage senden' : 'Send request',
    sending: isDe ? 'Wird gesendet…' : 'Sending…',
    success: isDe ? 'Danke, Ihre Anfrage wurde gesendet.' : 'Thank you, your request has been sent.',
    error: isDe ? 'Senden fehlgeschlagen. Bitte versuchen Sie es erneut.' : 'Sending failed. Please try again.',
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      await base44.functions.invoke('sendContactRequest', form);
      setForm({ name: '', phone: '', message: '' });
      setFeedback({ type: 'success', text: labels.success });
    } catch (error) {
      setFeedback({ type: 'error', text: error.response?.data?.error || labels.error });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm p-4 flex items-center justify-center" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl shadow-black/30 space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{labels.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{labels.intro}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <Field icon={User} label={labels.name} value={form.name} onChange={(value) => update('name', value)} required />
        <Field icon={Phone} label={labels.phone} value={form.phone} onChange={(value) => update('phone', value)} required />

        <div>
          <label className="block text-xs font-medium text-primary mb-1 uppercase tracking-wider">
            <MessageSquare className="inline w-3.5 h-3.5 mr-1" />
            {labels.message}
          </label>
          <textarea
            value={form.message}
            onChange={(e) => update('message', e.target.value)}
            rows={5}
            required
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-none"
          />
        </div>

        {feedback && (
          <div className={`text-sm px-3 py-2 rounded-lg border ${feedback.type === 'success' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
            {feedback.text}
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold transition-colors"
        >
          {sending ? <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? labels.sending : labels.send}
        </button>
      </form>
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-primary mb-1 uppercase tracking-wider">
        <Icon className="inline w-3.5 h-3.5 mr-1" />
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
      />
    </div>
  );
}