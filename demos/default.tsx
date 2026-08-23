import React from 'react';
import { LoopingWords } from '@/components/ui/looping-words-with-gsap';

const DemoPage: React.FC = () => {
  const words = ["CINEMA", "STORIES", "GENIUS", "VOICES", "FUTURES", "VISIONARIES"];

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#040204' }}>
      <div style={{ fontSize: '4.5rem', fontFamily: 'Oswald, sans-serif', color: '#FFFFFF', display: 'flex', alignItems: 'center' }}>
        <span>CHAMPIONING STUDENT&nbsp;</span>
        <LoopingWords words={words} />
      </div>
    </div>
  );
};

export default DemoPage;
