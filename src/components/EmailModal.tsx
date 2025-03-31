import { useState } from 'react';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => void;
  exportType: string;
}

const EmailModal = ({ isOpen, onClose, onSubmit, exportType }: EmailModalProps) => {
  const [email, setEmail] = useState('');
  const [isValid, setIsValid] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setIsValid(validateEmail(value));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
        <h2 className="text-xl font-semibold mb-4">Get Your {exportType} File</h2>
        <p className="mb-4">Enter your email to receive the download link:</p>
        
        <input
          type="email"
          value={email}
          onChange={handleChange}
          placeholder="your.email@example.com"
          className="w-full px-3 py-2 border rounded mb-4"
        />
        
        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(email)}
            disabled={!isValid}
            className={`px-4 py-2 rounded text-white ${
              isValid ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Send Download Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;