import React from 'react';

interface InfoBlockProps {
  content: string;
}

const InfoBlock: React.FC<InfoBlockProps> = ({ content }) => {
  return (
    <div className="info-block">
      <pre>{content}</pre>
    </div>
  );
};

export default InfoBlock; 