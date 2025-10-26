import React from 'react';

interface WelcomeScreenProps {
  onUploadClick: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onUploadClick }) => {
  const guideSteps = [
    {
      icon: '📤',
      title: '1. Upload Receipt',
      description: 'Snap a photo with your camera or upload an image file.',
    },
    {
      icon: '🤖',
      title: '2. AI Analysis',
      description: 'Our AI scans the receipt, automatically extracting all items, taxes, and tips.',
    },
    {
      icon: '💬',
      title: '3. Split the Bill',
      description: 'Use the smart chat ("Alice had the burger") or tap items to assign them.',
    },
    {
      icon: '📊',
      title: '4. Get Summary',
      description: 'Instantly see a clear breakdown of who owes what to share or export.',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8 bg-surface dark:bg-surface-dark rounded-lg shadow-md border border-border dark:border-border-dark overflow-y-auto">
      <div className="flex-grow flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">📄✨</div>
        <h2 className="text-3xl font-bold mb-3 text-text-primary dark:text-text-primary-dark">Welcome to Splitly AI</h2>
        <p className="max-w-md mb-8 text-text-secondary dark:text-text-secondary-dark">The smartest way to split bills. Just upload a receipt and let our AI do the heavy lifting.</p>
        <button 
          onClick={onUploadClick}
          className="bg-secondary dark:bg-secondary-dark hover:bg-secondary-focus dark:hover:bg-secondary-focus-dark text-on-secondary dark:text-on-secondary-dark font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 mb-12"
        >
          Upload Your First Receipt
        </button>
      </div>

      <div className="w-full max-w-4xl flex-shrink-0">
        <h3 className="text-2xl font-bold mb-6 text-text-primary dark:text-text-primary-dark">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {guideSteps.map((step, index) => (
            <div key={index} className="bg-background dark:bg-background-dark p-4 rounded-lg border border-border dark:border-border-dark h-full">
              <div className="text-3xl mb-3">{step.icon}</div>
              <h4 className="font-bold text-text-primary dark:text-text-primary-dark mb-1">{step.title}</h4>
              <p className="text-sm text-text-secondary dark:text-text-secondary-dark">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
