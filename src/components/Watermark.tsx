import React from 'react';

interface WatermarkProps {
  showOnLogin?: boolean;
}

const Watermark: React.FC<WatermarkProps> = ({ showOnLogin = false }) => {
  return (
    <div 
      className={`fixed inset-0 pointer-events-none z-0 flex items-center justify-center ${
        showOnLogin ? '' : 'ml-64'
      }`}
      style={{
        backgroundImage: `url('https://d64gsuwffb70l.cloudfront.net/6875f34d022e5850b7a1da72_1753181541893_cc174566.png')`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: showOnLogin ? 'center' : 'center',
        backgroundSize: '55%',
        opacity: 0.1
      }}
    />
  );
};

export default Watermark;