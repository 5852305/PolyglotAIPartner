import React from 'react';
import { Language } from '../types';
import { LANGUAGES } from '../constants';

interface LanguageSelectorProps {
  selected: Language;
  onSelect: (lang: Language) => void;
  disabled: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selected, onSelect, disabled }) => {
  return (
    <div className="flex items-center space-x-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
      <span className="text-slate-400 text-sm font-medium pl-2">I want to practice:</span>
      <select
        value={selected.code}
        onChange={(e) => {
          const lang = LANGUAGES.find(l => l.code === e.target.value);
          if (lang) onSelect(lang);
        }}
        disabled={disabled}
        className={`bg-transparent text-slate-100 font-bold focus:outline-none cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-slate-800">
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};
