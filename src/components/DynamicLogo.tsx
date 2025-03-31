import React, { useEffect, useState } from 'react';

const generateRandomColor = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

export const DynamicLogo: React.FC = () => {
  const [logoColor, setLogoColor] = useState<string>('#FFD45D');

  useEffect(() => {
    setLogoColor(generateRandomColor());
  }, []);

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center">
        <div className="w-[120px] h-[90px] bg-white rounded-lg shadow-md p-2 flex flex-col items-center">
          <div 
            className="w-[100px] h-[70px] rounded"
            style={{ backgroundColor: logoColor }}
          />
          <span className="text-xs text-gray-500 font-mono mt-1.5">#{logoColor.substring(1).toUpperCase()}</span>
        </div>
      </div>
      <h1 className="text-2xl font-medium">
        Color<br/>
        Palette<br/>
        Generator
      </h1>
    </div>
  );
}; 