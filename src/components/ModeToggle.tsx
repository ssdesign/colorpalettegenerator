import React from 'react';

interface ModeToggleProps {
  mode: 'light' | 'dark';
  onChange: (mode: 'light' | 'dark') => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <span className={`text-sm ${mode === 'light' ? 'font-semibold' : 'text-gray-500'}`}>Light</span>
      <button
        type="button"
        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
          mode === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        onClick={() => onChange(mode === 'light' ? 'dark' : 'light')}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            mode === 'dark' ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className={`text-sm ${mode === 'dark' ? 'font-semibold' : 'text-gray-500'}`}>Dark</span>
    </div>
  );
};

export default ModeToggle; 