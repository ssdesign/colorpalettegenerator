import React from 'react';
import { StrictnessLevel } from '../types';

interface StrictnessSelectorProps {
  value: StrictnessLevel;
  onChange: (level: StrictnessLevel) => void;
}

const StrictnessSelector: React.FC<StrictnessSelectorProps> = ({ value, onChange }) => {
  const options: { value: StrictnessLevel; label: string; description: string }[] = [
    {
      value: 'AALarge',
      label: 'AA Large',
      description: 'Contrast ratio of at least 3:1 for large text (18pt or 14pt bold)',
    },
    {
      value: 'AASmall',
      label: 'AA Small',
      description: 'Contrast ratio of at least 4.5:1 for small text',
    },
    {
      value: 'AAALarge',
      label: 'AAA Large',
      description: 'Contrast ratio of at least 4.5:1 for large text',
    },
    {
      value: 'AAASmall',
      label: 'AAA Small',
      description: 'Contrast ratio of at least 7:1 for small text',
    },
  ];

  return (
    <div className="p-4 rounded-lg border mb-6 backdrop-blur-sm" 
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(0, 0, 0, 0.2)'
      }}
    >
      <h3 className="text-lg font-semibold mb-4">WCAG Compliance Level</h3>
      
      <div className="grid grid-cols-1 gap-3">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-start p-3 border rounded-md cursor-pointer hover:bg-opacity-10 hover:bg-white ${
              value === option.value 
                ? 'border-blue-500 bg-blue-500 bg-opacity-20' 
                : 'border-gray-300 border-opacity-50'
            }`}
          >
            <input
              type="radio"
              name="strictnessLevel"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium">{option.label}</div>
              <div className="text-sm opacity-80">{option.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default StrictnessSelector; 