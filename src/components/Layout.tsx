import React, { useState } from 'react';
import { DynamicLogo } from './DynamicLogo';
import { Header } from './Header';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { AppState, StrictnessLevel, ChartType } from '../types';
import EmailModal from './EmailModal';
import { exportPalettes } from '../utils/exportUtils';
import emailjs from 'emailjs-com';

interface LayoutProps {
  state: AppState;
  onPaletteTypeChange: (type: 'categorical' | 'sequential' | 'diverging') => void;
  onChartTypeChange: (type: ChartType) => void;
  onEditPaletteName: (id: string, name: string) => void;
  onEditColorName: (id: string, index: number, name: string) => void;
  onEditColorHex: (id: string, index: number, hex: string, mode: 'light' | 'dark') => void;
  onReorderColors: (id: string, oldIndex: number, newIndex: number) => void;
  onRegeneratePalette: (id: string) => void;
  onLightModeColorChange: (color: string) => void;
  onDarkModeColorChange: (color: string) => void;
  onTokenSettingsChange: (settings: { prefix: string }) => void;
  onModeChange: (mode: 'light' | 'dark') => void;
  onStrictnessLevelChange: (level: StrictnessLevel) => void;
  getCurrentPalette: () => any;
  getCurrentBackground: () => string;
  getContrastTextColor: () => string;
}

export const Layout: React.FC<LayoutProps> = ({
  state,
  onPaletteTypeChange,
  onChartTypeChange,
  onEditPaletteName,
  onEditColorName,
  onEditColorHex,
  onReorderColors,
  onRegeneratePalette,
  onLightModeColorChange,
  onDarkModeColorChange,
  onTokenSettingsChange,
  onModeChange,
  onStrictnessLevelChange,
  getCurrentPalette,
  getCurrentBackground,
  getContrastTextColor
}) => {
  // Footer height for calculations
  const footerHeight = 60;
  
  // Email modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'css' | 'scss' | 'figma' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  // Handler for opening the modal
  const handleOpenExportModal = (format: 'json' | 'css' | 'scss' | 'figma') => {
    setExportFormat(format);
    setIsModalOpen(true);
  };

  // Handler for closing the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setExportFormat(null);
    setMessage('');
  };

  // Handler for submitting email
  const handleSubmitEmail = async (email: string) => {
    if (!exportFormat) return;
    
    setIsProcessing(true);
    setMessage('Processing your request...');
    
    try {
      // Generate the file content as a string
      const result = exportPalettes(state.palettes, state.tokenSettings.prefix, exportFormat, state.currentMode, false);
      
      if (!result || !result.content) {
        throw new Error("Failed to generate content");
      }
      
      const { content, filename, contentType } = result;
      
      // Create a unique download ID
      const downloadId = Math.random().toString(36).substring(2, 15);
      
      // Store content in localStorage (only in browser environment)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`palette_download_${downloadId}`, JSON.stringify({
          content: content,
          filename,
          contentType,
          format: exportFormat
        }));
      }
      
      // Generate download URL
      const downloadUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/download.html?id=${downloadId}`;
      
      // Send email using EmailJS
      const templateParams = {
        user_email: email,
        download_url: downloadUrl,
        export_format: exportFormat.toUpperCase(),
        timestamp: new Date().toLocaleString()
      };
      
      await emailjs.send(
        'service_ki47ycv',  // Your EmailJS service ID
        'template_pr53rdi', // Your EmailJS template ID
        templateParams,
        'fqbdVd8GGQ3HYTvnY'  // Your EmailJS user ID
      );
      
      setMessage('Success! We\'ve sent a download link to your email.');
      
      // Close modal after delay
      setTimeout(() => {
        handleCloseModal();
      }, 3000);
      
    } catch (error) {
      console.error('Error handling download:', error);
      setMessage('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col">
      <Header 
        state={state}
        onLightModeColorChange={onLightModeColorChange}
        onDarkModeColorChange={onDarkModeColorChange}
        onTokenSettingsChange={onTokenSettingsChange}
        onModeChange={onModeChange}
      />
      
      <div 
        className="flex flex-1 mt-[176px] pb-[60px]"
        style={{ 
          backgroundColor: getCurrentBackground(),
          color: getContrastTextColor(),
          position: 'relative',
          overflow: 'auto'
        }}
      >
        <LeftPanel
          state={state}
          onPaletteTypeChange={onPaletteTypeChange}
          onEditPaletteName={onEditPaletteName}
          onEditColorName={onEditColorName}
          onEditColorHex={onEditColorHex}
          onReorderColors={onReorderColors}
          onRegeneratePalette={onRegeneratePalette}
          onStrictnessLevelChange={onStrictnessLevelChange}
          getCurrentBackground={getCurrentBackground}
        />

        <RightPanel
          state={state}
          onChartTypeChange={onChartTypeChange}
          getCurrentPalette={getCurrentPalette}
          getCurrentBackground={getCurrentBackground}
          onOpenExportModal={handleOpenExportModal}
        />
      </div>
      
      {/* Footer */}
      <div 
        className="fixed bottom-0 left-0 right-0 flex flex-col shadow-sm z-10"
        style={{ 
          backgroundColor: getCurrentBackground(),
          borderTop: `1px solid ${state.currentMode === 'light' ? '#E5E7EB' : '#374151'}`,
          color: getContrastTextColor()
        }}
      >
        <div className="max-w-[1920px] mx-auto w-full flex items-center px-24">
          <div className="flex-1 py-2">
            <p className="text-sm">Check out more experiments on <a href="https://labs.crafxdesign.com" className="hover:underline">Crafx Labs</a></p>
          </div>
          <div className="flex gap-4 text-sm py-2">
            <a href="#" className="hover:underline">Privacy</a>
            <span>|</span>
            <a href="#" className="hover:underline">Terms</a>
            <span>|</span>
            <a href="#" className="hover:underline">Contact</a>
          </div>
        </div>
        <div 
          className="text-center text-xs py-1 max-w-[1920px] mx-auto w-full px-24"
          style={{ 
            borderTop: `1px solid ${state.currentMode === 'light' ? '#E5E7EB' : '#374151'}`,
            opacity: 0.8
          }}
        >
          © Crafx labs 2025
        </div>
      </div>
      
      {/* Email Modal at root level */}
      <EmailModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitEmail}
        exportType={exportFormat?.toUpperCase() || ''}
      />
      
      {/* Processing Message */}
      {isModalOpen && message && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 pointer-events-none">
          <div className="bg-white rounded-lg p-4 text-center max-w-sm">
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                {message}
              </div>
            ) : (
              <div className={message.includes('Success') ? 'text-black-500' : 'text-red-500'}>
                {message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 