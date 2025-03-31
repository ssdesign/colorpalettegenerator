import React from 'react';
import { Palette } from '../types';
import { exportPalettes } from '../utils/exportUtils';
import Image from 'next/image';

interface ExportOptionsProps {
  palettes: Palette[];
  tokenPrefix: string;
  mode: 'light' | 'dark';
  textColor: string;
  inactiveTextColor: string;
  borderColor: string;
}

const ExportOptions: React.FC<ExportOptionsProps> = ({ 
  palettes, 
  tokenPrefix, 
  mode,
  textColor,
  inactiveTextColor,
  borderColor
}) => {
  const handleExport = (format: 'json' | 'css' | 'scss' | 'figma') => {
    exportPalettes(palettes, tokenPrefix, format, mode);
  };

  return (
    <div className="p-3 rounded-lg border backdrop-blur-sm" 
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor
      }}
    >
      <h3 className="text-lg font-semibold mb-3" style={{ color: textColor }}>Export palette</h3>
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => handleExport('json')}
          className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          style={{ 
            borderColor,
            color: textColor
          }}
        >
          <Image src="/json.png" alt="JSON" width={16} height={16} />
          <span>JSON</span>
        </button>
        <button
          onClick={() => handleExport('css')}
          className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          style={{ 
            borderColor,
            color: textColor
          }}
        >
          <Image src="/css.png" alt="CSS" width={16} height={16} />
          <span>CSS</span>
        </button>
        <button
          onClick={() => handleExport('scss')}
          className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          style={{ 
            borderColor,
            color: textColor
          }}
        >
          <Image src="/scss.png" alt="SCSS" width={16} height={16} />
          <span>SCSS</span>
        </button>
        <button
          onClick={() => handleExport('figma')}
          className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          style={{ 
            borderColor,
            color: textColor
          }}
        >
          <Image src="/figma.png" alt="Figma" width={16} height={16} />
          <span>Figma</span>
        </button>
      </div>
    </div>
  );
};

export default ExportOptions; 