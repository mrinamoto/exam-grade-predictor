import { Moon, Sun, Settings, Save, GraduationCap, FileText } from 'lucide-react';

export default function Header({ theme, onToggleTheme, onOpenSettings, onSave, onPrint }) {
  return (
    <header className="topbar no-print">
      <div className="brand-lockup">
        <div className="brand-mark"><GraduationCap size={23} /></div>
        <div>
          <div className="brand-title">Exam Grade Predictor</div>
          <div className="brand-subtitle">Know where you stand. Plan what you need.</div>
        </div>
      </div>
      <nav className="header-actions" aria-label="Application actions">
        <button className="button ghost compact" onClick={onPrint}><FileText size={16} /> Report</button>
        <button className="button ghost compact" onClick={onSave}><Save size={16} /> Save Scenario</button>
        <button className="icon-button" onClick={onOpenSettings} aria-label="Open settings"><Settings size={18} /></button>
        <button className="icon-button" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>
    </header>
  );
}
