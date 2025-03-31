import React, { useState } from 'react';
import chroma from 'chroma-js';
import { TokenSettings as TokenSettingsType } from '../types';

interface TokenSettingsProps {
  settings: TokenSettingsType;
  onSettingsChange: (settings: TokenSettingsType) => void;
}

const TokenSettings: React.FC<TokenSettingsProps> = ({ settings, onSettingsChange }) => {
  const [prefix, setPrefix] = useState(settings.prefix);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSettingsChange({ prefix });
  };

  return (
    <div className="p-4 rounded-lg border mb-6 backdrop-blur-sm" 
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(0, 0, 0, 0.2)'
      }}
    >
      <h3 className="text-lg font-semibold mb-4">Token Settings</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="prefix" className="block text-sm font-medium mb-1">
            Token Prefix
          </label>
          <div className="flex">
            <input
              type="text"
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g., company.dataviz"
              className="flex-1 px-3 py-2 border rounded-l-md bg-white text-gray-900"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-r-md"
            >
              Apply
            </button>
          </div>
          <p className="mt-2 text-sm opacity-80">
            Example: {prefix}.categorical.palette-name.01
          </p>
        </div>
      </form>
    </div>
  );
};

export default TokenSettings; 