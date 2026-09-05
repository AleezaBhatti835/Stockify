import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxesStacked } from '@fortawesome/free-solid-svg-icons';

function WelcomeScreen({ onComplete }) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing system...');

  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 40) + 30;
      if (currentProgress > 100) currentProgress = 100;
      
      setProgress(currentProgress);

      if (currentProgress < 30) {
        setLoadingText('Initializing system...');
      } else if (currentProgress < 60) {
        setLoadingText('Loading inventory modules...');
      } else if (currentProgress < 90) {
        setLoadingText('Securing connection...');
      } else {
        setLoadingText('Dashboard Ready!');
      }

      if (currentProgress === 100) {
        clearInterval(interval);
      }
    }, 400);

    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 4000);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  // UI ENGINE: Adaptive fullscreen splash interface utilizing injected CSS keyframes for dynamic loading animations and seamless exit transitions.
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      /* Forest Green Theme Gradient */
      background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
      color: '#ffffff',
      fontFamily: "'Inter', Arial, sans-serif",
      zIndex: 99999,
      opacity: isFadingOut ? 0 : 1,
      visibility: isFadingOut ? 'hidden' : 'visible',
      transition: 'opacity 0.5s ease-out, visibility 0.5s ease-out',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }
        @keyframes floatFast {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(-3deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.15); transform: scale(1); }
          50% { box-shadow: 0 0 50px rgba(16, 185, 129, 0.3); transform: scale(1.02); }
        }
      `}</style>

      {/* Decorative Background Glows */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '350px', height: '350px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.08)', filter: 'blur(50px)' }}></div>
      <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', backgroundColor: 'rgba(5, 150, 105, 0.06)', filter: 'blur(70px)' }}></div>

      {/* ABSTRACT INVENTORY SHAPES & SHIFTING NODES */}
      
      {/* Shape 1: Stacked Inventory Layers (Top Left) */}
      <div style={{ position: 'absolute', top: '18%', left: '12%', animation: 'floatSlow 6s infinite ease-in-out', display: 'flex', flexDirection: 'column', gap: '6px', opacity: 0.25 }}>
        <div style={{ width: '45px', height: '14px', background: '#34d399', borderRadius: '4px', transform: 'skewX(-15deg)' }}></div>
        <div style={{ width: '60px', height: '14px', background: '#10b981', borderRadius: '4px', transform: 'skewX(-15deg)' }}></div>
        <div style={{ width: '50px', height: '14px', background: '#059669', borderRadius: '4px', transform: 'skewX(-15deg)' }}></div>
      </div>

      {/* Shape 2: Modular Grid / Dashboard Card Wireframe (Top Right) */}
      <div style={{ position: 'absolute', top: '20%', right: '14%', animation: 'floatFast 5.5s infinite ease-in-out', width: '55px', height: '45px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '8px', padding: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', opacity: 0.3 }}>
        <div style={{ background: '#34d399', borderRadius: '3px' }}></div>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}></div>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}></div>
        <div style={{ background: '#059669', borderRadius: '3px' }}></div>
      </div>

      {/* Shape 3: Data Node Cluster (Bottom Left) */}
      <div style={{ position: 'absolute', bottom: '20%', left: '15%', animation: 'floatFast 7s infinite ease-in-out', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.25 }}>
        <div style={{ width: '12px', height: '12px', background: '#34d399', borderRadius: '50%', boxShadow: '0 0 10px #34d399' }}></div>
        <div style={{ width: '30px', height: '2px', background: '#34d399' }}></div>
        <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div>
        <div style={{ width: '20px', height: '2px', background: '#10b981' }}></div>
        <div style={{ width: '16px', height: '16px', background: '#059669', borderRadius: '4px' }}></div>
      </div>

      {/* Shape 4: Floating Bar / Metric Bars (Bottom Right) */}
      <div style={{ position: 'absolute', bottom: '22%', right: '16%', animation: 'floatSlow 6.5s infinite ease-in-out', display: 'flex', alignItems: 'flex-end', gap: '5px', opacity: 0.25, height: '35px' }}>
        <div style={{ width: '8px', height: '15px', background: '#34d399', borderRadius: '2px' }}></div>
        <div style={{ width: '8px', height: '28px', background: '#10b981', borderRadius: '2px' }}></div>
        <div style={{ width: '8px', height: '20px', background: '#34d399', borderRadius: '2px' }}></div>
        <div style={{ width: '8px', height: '35px', background: '#059669', borderRadius: '2px' }}></div>
      </div>

      {/* Main Content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '420px',
        padding: '20px',
        position: 'relative',
        zIndex: 10
      }}>
        
        {/* Logo Area */}
        <div style={{
          width: '110px',
          height: '110px',
          borderRadius: '50%',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '44px',
          marginBottom: '28px',
          backgroundColor: 'rgba(6, 78, 59, 0.5)',
          backdropFilter: 'blur(12px)',
          animation: 'pulseGlow 3s infinite ease-in-out'
        }}>
          <FontAwesomeIcon icon={faBoxesStacked} style={{ color: '#34d399' }} />
        </div>

        {/* Text Area */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '34px', fontWeight: '800', letterSpacing: '0.5px' }}>Stockify</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#a7f3d0', letterSpacing: '0.3px', fontWeight: '500' }}>Elevating Inventory Management</p>
        </div>
        
        {/* Progress & Loading Section */}
        <div style={{ width: '100%', maxWidth: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#6ee7b7', fontWeight: '500' }}>
            <span>{loadingText}</span>
            <span>{progress}%</span>
          </div>
          
          {/* Progress Bar Track */}
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            {/* Progress Bar Fill */}
            <div style={{ 
              height: '100%', 
              width: `${progress}%`,
              backgroundColor: '#34d399',
              borderRadius: '4px',
              transition: 'width 0.4s ease-out',
              boxShadow: '0 0 12px rgba(52, 211, 153, 0.6)'
            }}></div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default WelcomeScreen;