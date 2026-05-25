import React, { useEffect, useRef, useState } from 'react';

export default function AIInterviewer({ reaction, question, isThinking, evalId }) {
  const lastSpokenRef = useRef("");
  const containerRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [avatar, setAvatar] = useState(() => {
    return localStorage.getItem('iLead_interviewer_avatar') || 'ava';
  });
  
  // Viseme state for lip sync: 'closed' | 'openWide' | 'openNarrow' | 'smileOpen' | 'flat'
  const [viseme, setViseme] = useState('closed');
  const [blink, setBlink] = useState(false);
  const [headTilt, setHeadTilt] = useState(0); // in degrees
  const speechTimerRef = useRef(null);

  // ─── Save Preference ────────────────────────────────────────────
  const handleAvatarChange = (newAvatar) => {
    setAvatar(newAvatar);
    localStorage.setItem('iLead_interviewer_avatar', newAvatar);
  };

  // ─── Real-Time Precision Gaze Tracking ───────────────────────────
  useEffect(() => {
    const handleMouseMove = (e) => {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      // Calculate normalized cursor offset from the center of the avatar card
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      
      // Calculate distance to scale gaze responsiveness (max distance 400px)
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = Math.min(1, distance / 400);
      
      const angle = Math.atan2(dy, dx);
      
      // Compute normalized coordinates (-1 to 1)
      const gazeX = Math.cos(angle) * scale;
      const gazeY = Math.sin(angle) * scale;
      
      // Update CSS variables for GPU-accelerated cursor animations
      container.style.setProperty('--mouse-x', gazeX.toFixed(3));
      container.style.setProperty('--mouse-y', gazeY.toFixed(3));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // ─── Inertial Physics Head Tilt sync to CSS variable ──────────────
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.style.setProperty('--head-tilt', headTilt.toFixed(2));
    }
  }, [headTilt]);

  // ─── Organic Blinking & Micro-Movements Loop ─────────────────────
  useEffect(() => {
    // 1. Natural Blinking Loop (blink every 3 to 5.5 seconds randomly)
    const triggerBlink = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
      
      const nextBlinkDelay = 3000 + Math.random() * 2500;
      blinkTimeoutId = setTimeout(triggerBlink, nextBlinkDelay);
    };
    
    let blinkTimeoutId = setTimeout(triggerBlink, 4000);

    // 2. Idle Head Tilts (tilt head slightly when listening or talking)
    const tiltInterval = setInterval(() => {
      // Small natural tilts (-1.5 to +1.5 degrees)
      setHeadTilt((Math.random() - 0.5) * 3);
    }, 3000);

    return () => {
      clearTimeout(blinkTimeoutId);
      clearInterval(tiltInterval);
    };
  }, []);

  // ─── Speech Viseme Cadence Loop ──────────────────────────────────
  // Simulates organic talking morph cycles when isSpeaking is active
  useEffect(() => {
    if (isSpeaking) {
      const visemes = ['openWide', 'openNarrow', 'smileOpen', 'openNarrow', 'openWide', 'closed'];
      let idx = 0;
      
      speechTimerRef.current = setInterval(() => {
        const isPause = Math.random() > 0.88;
        if (isPause) {
          setViseme('closed');
        } else {
          setViseme(visemes[idx % visemes.length]);
          idx++;
        }
      }, 95);
    } else {
      if (speechTimerRef.current) clearInterval(speechTimerRef.current);
      setViseme('closed');
    }

    return () => {
      if (speechTimerRef.current) clearInterval(speechTimerRef.current);
    };
  }, [isSpeaking]);

  // ─── Text-to-Speech (TTS) & Boundary Lip-Sync ────────────────────
  useEffect(() => {
    if ('speechSynthesis' in window) {
      let textToSpeak = "";
      if (reaction && !evalId) {
        textToSpeak = reaction + ". " + question;
      } else if (reaction) {
        textToSpeak = reaction;
      } else if (question) {
        textToSpeak = question;
      }
      
      const isNewEvent = evalId && evalId !== lastSpokenRef.current;
      const isIntro = !evalId && reaction && question && lastSpokenRef.current !== "intro_spoken";

      if ((isNewEvent || isIntro) && !isThinking) {
        if (evalId) lastSpokenRef.current = evalId;
        else lastSpokenRef.current = "intro_spoken";
        
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';

        utterance.onstart = () => {
          setIsSpeaking(true);
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          setViseme('closed');
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setViseme('closed');
        };

        // Real-Time Boundary Lip Sync Hook!
        utterance.onboundary = (event) => {
          if (event.name === 'word') {
            setViseme(Math.random() > 0.5 ? 'openWide' : 'smileOpen');
            setHeadTilt(prev => prev + (Math.random() > 0.5 ? 1.5 : -1.5));
            
            setTimeout(() => {
              if (window.speechSynthesis.speaking) {
                setViseme('openNarrow');
              }
            }, 55);
          }
        };
        
        const speakUtterance = () => {
          const voices = window.speechSynthesis.getVoices();
          let preferredVoice;
          if (avatar === 'marcus') {
            // Deep, authoritative male voice
            preferredVoice = voices.find(v => v.name.includes('Google US English Male')) ||
                             voices.find(v => v.name.includes('David')) ||
                             voices.find(v => v.name.includes('Male')) ||
                             voices.find(v => v.lang === 'en-US');
            utterance.pitch = 0.86;
            utterance.rate = 0.94;
          } else if (avatar === 'ava') {
            // Warm, polished female recruiter voice
            preferredVoice = voices.find(v => v.name.includes('Google US English Female')) ||
                             voices.find(v => v.name.includes('Natural Female')) ||
                             voices.find(v => v.name.includes('Zira')) ||
                             voices.find(v => v.name.includes('Female')) ||
                             voices.find(v => v.lang === 'en-US');
            utterance.pitch = 1.02;
            utterance.rate = 0.96;
          } else { // 'sophia'
            // Futuristic android female voice
            preferredVoice = voices.find(v => v.name.includes('Zira')) ||
                             voices.find(v => v.name.includes('Google US English Female')) ||
                             voices.find(v => v.name.includes('Female')) ||
                             voices.find(v => v.lang === 'en-US');
            utterance.pitch = 1.15;
            utterance.rate = 1.05;
          }

          if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log(`🎙️ ${avatar.toUpperCase()} using voice: ${preferredVoice.name}`);
          }
          
          window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = speakUtterance;
        } else {
          speakUtterance();
        }
      }
    }
  }, [evalId, reaction, question, isThinking, avatar]);

  // ─── SVG PATHS: Mouth Visemes Generator ──────────────────────────
  const getMouthPath = (character) => {
    if (character === 'ava') {
      if (isThinking) return "M 92 125 L 108 125"; // Focused flat mouth during analysis
      switch (viseme) {
        case 'openWide':
          return "M 91 122 Q 100 137 109 122 Q 100 120 91 122";
        case 'openNarrow':
          return "M 93 123 Q 100 131 107 123 Q 100 121 93 123";
        case 'smileOpen':
          return "M 90 124 Q 100 134 110 124 Q 100 121 90 124";
        case 'flat':
          return "M 93 125 L 107 125";
        case 'closed':
        default:
          return "M 90 124 Q 100 128 110 124";
      }
    } else if (character === 'marcus') {
      if (isThinking) return "M 92 122 L 108 122"; 
      switch (viseme) {
        case 'openWide':
          return "M 91 119 Q 100 134 109 119 Q 100 117 91 119";
        case 'openNarrow':
          return "M 93 120 Q 100 128 107 120 Q 100 118 93 120";
        case 'smileOpen':
          return "M 90 121 Q 100 131 110 121 Q 100 118 90 121";
        case 'flat':
          return "M 93 122 L 107 122";
        case 'closed':
        default:
          return "M 90 121 Q 100 125 110 121";
      }
    }
    return "";
  };

  // Eyebrow Adaptive Micro-Expression transform
  const getEyebrowTransform = (side) => {
    if (isThinking) {
      // Furrowed, focused brows pointing down & slightly in
      return side === 'left' 
        ? "translateY(2px) rotate(4deg)" 
        : "translateY(2px) rotate(-4deg)";
    }
    if (isSpeaking) {
      // Dynamic expressive raising
      if (viseme === 'openWide') return "translateY(-2px)";
      return "translateY(-0.8px)";
    }
    return "translateY(0px)";
  };

  // Eye Squint expression when calculating (Thinking state)
  const getEyeSquintStyle = () => {
    if (blink) return 'scaleY(0.08)';
    if (isThinking) return 'scaleY(0.75)'; // Squinting in deep analytic thought
    return 'scaleY(1)';
  };

  return (
    <div className="ai-interviewer-card card">
      <div className="ai-avatar-container" ref={containerRef}>
        {/* Soft Background Radial Glow based on Selected Avatar Theme */}
        <div className={`ai-avatar-glow bg-theme-${avatar}`}></div>

        {/* Dynamic Glassmorphic Switcher Panel */}
        <div className="avatar-switcher-container">
          <button 
            className={`avatar-switch-btn ${avatar === 'ava' ? 'active' : ''}`}
            onClick={() => handleAvatarChange('ava')}
            title="Switch to Ava (HR Director)"
          >
            👩‍💼 Ava
          </button>
          <button 
            className={`avatar-switch-btn ${avatar === 'marcus' ? 'active' : ''}`}
            onClick={() => handleAvatarChange('marcus')}
            title="Switch to Marcus (Tech Lead)"
          >
            👨‍💻 Marcus
          </button>
          <button 
            className={`avatar-switch-btn ${avatar === 'sophia' ? 'active' : ''}`}
            onClick={() => handleAvatarChange('sophia')}
            title="Switch to Sophia (Cyber Android)"
          >
            🤖 Sophia
          </button>
        </div>
        
        {/* ─── AVATAR 1: AVA (EXECUTIVE HR DIRECTOR) ─────────────────────────── */}
        {avatar === 'ava' && (
          <div className="ai-avatar-wrapper avatar-breathing">
            <svg viewBox="0 0 200 200" className="avatar-svg">
              <defs>
                <linearGradient id="avaSkin" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fff1f2" />
                  <stop offset="40%" stopColor="#fee2e2" />
                  <stop offset="100%" stopColor="#fecdd3" />
                </linearGradient>
                <linearGradient id="avaSkinShadow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fda4af" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.22" />
                </linearGradient>
                <linearGradient id="avaHair" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2c1005" />
                  <stop offset="50%" stopColor="#451e0e" />
                  <stop offset="100%" stopColor="#120300" />
                </linearGradient>
                <linearGradient id="avaHairFront" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5c2c16" />
                  <stop offset="60%" stopColor="#3d1b0d" />
                  <stop offset="100%" stopColor="#120300" />
                </linearGradient>
                <linearGradient id="avaHairReflect" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="avaBlazer" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2e2692" />
                  <stop offset="50%" stopColor="#1b1464" />
                  <stop offset="100%" stopColor="#0b0832" />
                </linearGradient>
                <linearGradient id="avaBlazerLapel" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b33ac" />
                  <stop offset="100%" stopColor="#120c4c" />
                </linearGradient>
                <linearGradient id="avaGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffe893" />
                  <stop offset="35%" stopColor="#fbbf24" />
                  <stop offset="70%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
                <linearGradient id="avaIris" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#78350f" />
                  <stop offset="45%" stopColor="#d97706" />
                  <stop offset="80%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#fffbeb" />
                </linearGradient>
                <linearGradient id="avaBackground" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
                </linearGradient>
                <filter id="avaDropShadow" x="-15%" y="-15%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#020617" floodOpacity="0.28" />
                </filter>
                <clipPath id="avaEyeClipLeft">
                  <path d="M 82 98.5 C 82 98.5, 85.5 94.5, 93 98.5 C 93 98.5, 87.5 102, 82 98.5 Z" />
                </clipPath>
                <clipPath id="avaEyeClipRight">
                  <path d="M 107 98.5 C 107 98.5, 110.5 94.5, 118 98.5 C 118 98.5, 112.5 102, 107 98.5 Z" />
                </clipPath>
              </defs>

              {/* Technical Rim Backdrop */}
              <circle cx="100" cy="100" r="83" fill="none" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1.2" strokeDasharray="3 6" />
              <circle cx="100" cy="100" r="77" fill="url(#avaBackground)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.8" />
              
              {/* Back Orbital Arc */}
              <path d="M 35 100 A 65 65 0 0 1 165 100" fill="none" stroke="rgba(139, 92, 246, 0.08)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="35" cy="100" r="2" fill="#a78bfa" />
              <circle cx="165" cy="100" r="2" fill="#a78bfa" />

              {/* 1. DYNAMIC HEAD GROUP: Breathing + Talking Tilt + Mouse Gaze */}
              <g className="avatar-head">
                
                {/* A. Hair Backing (Deep volume layers behind head) */}
                <path d="M 64 105 C 50 60, 150 60, 136 105 C 136 142, 128 148, 128 148 L 72 148 C 72 148, 64 142, 64 105 Z" fill="url(#avaHair)" />
                
                {/* Chest-level cascading back hair locks */}
                <path d="M 66 115 C 58 132, 63 151, 78 153 C 71 144, 71 129, 71 115 Z" fill="url(#avaHair)" />
                <path d="M 134 115 C 142 132, 137 151, 122 153 C 129 144, 129 129, 129 115 Z" fill="url(#avaHair)" />

                {/* B. Neck, Throat & Shadows (Extended and refined to sit under the wardrobe) */}
                <path d="M 93 130 C 93 160, 107 160, 107 130 Z" fill="url(#avaSkin)" />
                <path d="M 93 130 C 93 160, 107 160, 107 130 Z" fill="url(#avaSkinShadow)" />
                {/* Throat hollow shadow */}
                <path d="M 95 133 C 95 142, 105 142, 105 133 Z" fill="rgba(60, 20, 10, 0.15)" />
                <path d="M 93 144 C 96 138, 104 138, 107 144 Z" fill="rgba(0,0,0,0.06)" />

                {/* C. Ears */}
                {/* Left Ear */}
                <path d="M 74 100 C 69 100, 68 111, 75 114" fill="url(#avaSkin)" stroke="rgba(244,63,94,0.12)" strokeWidth="0.8" />
                {/* Right Ear */}
                <path d="M 126 100 C 131 100, 132 111, 125 114" fill="url(#avaSkin)" stroke="rgba(244,63,94,0.12)" strokeWidth="0.8" />

                {/* D. Geometric Luxury Dangling Earrings (Swings with physics) */}
                {/* Left Earring */}
                <g className="avatar-physics-earring-l">
                  {/* Diamond Stud */}
                  <circle cx="66" cy="114" r="2.2" fill="#ffffff" stroke="url(#avaGold)" strokeWidth="0.8" />
                  {/* Gold Link Chain */}
                  <line x1="66" y1="114" x2="66" y2="128" stroke="url(#avaGold)" strokeWidth="1.2" />
                  {/* Hollow Gold Circle Drop */}
                  <circle cx="66" cy="132" r="5.5" fill="none" stroke="url(#avaGold)" strokeWidth="1.6" />
                  {/* Core Floating Diamond */}
                  <circle cx="66" cy="132" r="1.8" fill="#ffffff" />
                </g>
                
                {/* Right Earring */}
                <g className="avatar-physics-earring-r">
                  {/* Diamond Stud */}
                  <circle cx="134" cy="114" r="2.2" fill="#ffffff" stroke="url(#avaGold)" strokeWidth="0.8" />
                  {/* Gold Link Chain */}
                  <line x1="134" y1="114" x2="134" y2="128" stroke="url(#avaGold)" strokeWidth="1.2" />
                  {/* Hollow Gold Circle Drop */}
                  <circle cx="134" cy="132" r="5.5" fill="none" stroke="url(#avaGold)" strokeWidth="1.6" />
                  {/* Core Floating Diamond */}
                  <circle cx="134" cy="132" r="1.8" fill="#ffffff" />
                </g>

                {/* E. Face Head Base Contour */}
                <path d="M 75 101 C 75 73, 125 73, 125 101 C 125 125, 116 136, 100 136 C 84 136, 75 125, 75 101 Z" fill="url(#avaSkin)" />
                
                {/* Ambient Jawline contour shadow */}
                <path d="M 75 105 C 75 125, 84 136, 100 136 C 116 136, 125 125, 125 105 C 125 121, 116 132, 100 132 C 84 132, 75 121, 75 105 Z" fill="rgba(244, 63, 94, 0.08)" />

                {/* F. Cosmetic Layer: Soft Glam Makeup (Cheek Blush & Eyeshadow) */}
                {/* Left Cheek Blush */}
                <circle cx="81" cy="113" r="7" fill="#f43f5e" opacity="0.07" />
                <ellipse cx="80" cy="111" rx="4" ry="2.2" fill="#ffffff" opacity="0.12" /> {/* Highlight */}
                {/* Right Cheek Blush */}
                <circle cx="119" cy="113" r="7" fill="#f43f5e" opacity="0.07" />
                <ellipse cx="120" cy="111" rx="4" ry="2.2" fill="#ffffff" opacity="0.12" />

                {/* Soft Rose Eyeshadow base */}
                <ellipse cx="87.5" cy="97" rx="9" ry="5.5" fill="#f43f5e" opacity="0.09" />
                <ellipse cx="112.5" cy="97" rx="9" ry="5.5" fill="#f43f5e" opacity="0.09" />

                {/* G. Fine Double Eyelids */}
                <path d="M 81 95.5 Q 87.5 91 93 95" stroke="#4c2718" strokeWidth="0.8" fill="none" opacity="0.5" />
                <path d="M 107 95.5 Q 112.5 91 119 95" stroke="#4c2718" strokeWidth="0.8" fill="none" opacity="0.5" />

                {/* H. Beautiful Wings Eyelashes */}
                <path d="M 79 98 Q 87 92.5 94.5 98" fill="none" stroke="#1c0a00" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 105.5 98 Q 113 92.5 121 98" fill="none" stroke="#1c0a00" strokeWidth="2.5" strokeLinecap="round" />
                {/* Dynamic Lash Wings */}
                <line x1="79" y1="98" x2="76" y2="95.5" stroke="#1c0a00" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="121" y1="98" x2="124" y2="95.5" stroke="#1c0a00" strokeWidth="1.5" strokeLinecap="round" />

                {/* I. Eyebrows (Micro-expressions) */}
                <path d="M 81 91 Q 88 87.5 94 91" stroke="#2c1005" strokeWidth="2.2" strokeLinecap="round" fill="none" style={{ transform: getEyebrowTransform('left'), transformOrigin: '87px 90px', transition: 'all 0.2s' }} />
                <path d="M 106 91 Q 112 87.5 119 91" stroke="#2c1005" strokeWidth="2.2" strokeLinecap="round" fill="none" style={{ transform: getEyebrowTransform('right'), transformOrigin: '112px 90px', transition: 'all 0.2s' }} />

                {/* J. Eyes (Hazel-Gold Deep Gradients & Specular glints, clipped perfectly to eye sockets) */}
                <g className="avatar-eye" style={{ transform: getEyeSquintStyle(), transformOrigin: '100px 98px' }}>
                  
                  {/* White Sockets */}
                  <path d="M 82 98.5 C 82 98.5, 85.5 94.5, 93 98.5 C 93 98.5, 87.5 102, 82 98.5 Z" fill="#ffffff" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
                  <path d="M 107 98.5 C 107 98.5, 110.5 94.5, 118 98.5 C 118 98.5, 112.5 102, 107 98.5 Z" fill="#ffffff" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />

                  {/* Pupil/Iris Left Eye Group (Clipped) */}
                  <g clipPath="url(#avaEyeClipLeft)">
                    <g className="avatar-gaze-eyes">
                      <circle cx="87.5" cy="98.5" r="4.2" fill="url(#avaIris)" stroke="#3f1e04" strokeWidth="0.8" />
                      <circle cx="87.5" cy="98.5" r="2.0" fill="#0c0500" />
                      {/* Hazel gold crescentric reflection */}
                      <path d="M 84.5 99.8 A 3.2 3.2 0 0 0 90.5 99.8" fill="none" stroke="#fbbf24" strokeWidth="0.6" opacity="0.6" />
                      {/* Dual specular glints */}
                      <circle cx="86.2" cy="96.8" r="1.2" fill="#ffffff" />
                      <circle cx="88.8" cy="99.8" r="0.6" fill="#ffffff" opacity="0.85" />
                    </g>
                  </g>
                  
                  {/* Pupil/Iris Right Eye Group (Clipped) */}
                  <g clipPath="url(#avaEyeClipRight)">
                    <g className="avatar-gaze-eyes">
                      <circle cx="112.5" cy="98.5" r="4.2" fill="url(#avaIris)" stroke="#3f1e04" strokeWidth="0.8" />
                      <circle cx="112.5" cy="98.5" r="2.0" fill="#0c0500" />
                      {/* Hazel gold crescentric reflection */}
                      <path d="M 109.5 99.8 A 3.2 3.2 0 0 0 115.5 99.8" fill="none" stroke="#fbbf24" strokeWidth="0.6" opacity="0.6" />
                      {/* Dual specular glints */}
                      <circle cx="111.2" cy="96.8" r="1.2" fill="#ffffff" />
                      <circle cx="113.8" cy="99.8" r="0.6" fill="#ffffff" opacity="0.85" />
                    </g>
                  </g>
                </g>

                {/* K. Dimensional Nose with 3D shadows */}
                <path d="M 98 97.5 Q 98.2 105.5 97.2 107.5" stroke="rgba(194, 65, 12, 0.12)" strokeWidth="1.8" strokeLinecap="round" fill="none" /> {/* bridge shadow */}
                <path d="M 97 107.5 C 97 108.5, 98 109, 100 109 C 102 109, 103 108.5, 103 107.5" stroke="#fca5a5" strokeWidth="2.2" strokeLinecap="round" fill="none" /> {/* tip contour */}
                <circle cx="100.5" cy="106.8" r="0.9" fill="#ffffff" opacity="0.6" /> {/* Tip Specular Highlight */}

                {/* L. High-Fashion Hair Front Bangs & Face-Framing Overlay */}
                <g>
                  {/* Left Front Sweep Bang */}
                  <path d="M 96 70 C 80 72, 73 85, 73 98 C 73 112, 77 122, 77 122 C 77 122, 78 110, 79 105 C 82 95, 90 85, 96 70 Z" fill="url(#avaHairFront)" />
                  {/* Right Front Sweep Bang (Dramatic, Glossy) */}
                  <path d="M 96 70 C 112 68, 127 75, 127 96 C 127 106, 121 112, 123 124 C 124 130, 122 134, 122 134 C 122 134, 119 122, 117 114 C 112 95, 102 85, 96 70 Z" fill="url(#avaHairFront)" />
                  {/* Forehead center swoop detail */}
                  <path d="M 96 70 Q 86 85, 76 96 Q 84 88, 96 70 Z" fill="url(#avaHair)" />

                  {/* Face-framing soft wisps */}
                  <path d="M 75 101 Q 72 110, 76 122 Q 78 110, 75 101 Z" fill="url(#avaHair)" />
                  <path d="M 125 101 Q 128 110, 124 122 Q 122 110, 125 101 Z" fill="url(#avaHair)" />

                  {/* Translucent Studio Glass Hair Highlights */}
                  <path d="M 76 74 Q 88 66, 95 72" fill="none" stroke="url(#avaHairReflect)" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 103 72 Q 112 66, 124 74" fill="none" stroke="url(#avaHairReflect)" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 104 77 Q 114 84, 118 96" fill="none" stroke="url(#avaHairReflect)" strokeWidth="1.8" strokeLinecap="round" />

                  {/* Fine Organic Flyaway Strands */}
                  <path d="M 68 85 C 62 70, 80 62, 96 60" fill="none" stroke="#5c2c16" strokeWidth="0.8" opacity="0.35" />
                  <path d="M 132 85 C 138 70, 120 62, 104 60" fill="none" stroke="#5c2c16" strokeWidth="0.8" opacity="0.35" />
                  <path d="M 125 110 C 132 120, 130 135, 128 142" fill="none" stroke="#5c2c16" strokeWidth="0.6" opacity="0.3" />
                </g>

                {/* M. Lip Outline Shading & Base Lipstick Shapes */}
                <path d="M 89 123 Q 95 120.2 100 122.2 Q 105 120.2 111 123" stroke="#f43f5e" strokeWidth="0.8" fill="none" opacity="0.4" />
                <path d="M 93 130 Q 100 133 107 130" fill="none" stroke="rgba(244, 63, 94, 0.12)" strokeWidth="2.5" strokeLinecap="round" /> {/* Lip bottom shadow */}

                {/* Static Gorgeous Lipstick Base (Cupid's Bow & Full Bottom Lip) */}
                {/* Upper Lip */}
                <path d="M 90 124 Q 95 119.5, 100 121.5 Q 105 119.5, 110 124 Q 100 123, 90 124 Z" fill="#be123c" />
                {/* Lower Lip */}
                <path d="M 90 124 Q 100 131, 110 124 Q 100 125, 90 124 Z" fill="#9f1239" />

                {/* N. Lip-Synced Morphing Mouth (Thin elegant contact line on top of lipstick) */}
                <path 
                  d={getMouthPath('ava')} 
                  fill={viseme.startsWith('open') || viseme === 'smileOpen' ? "#5c0620" : "none"} 
                  stroke="#5c0620" 
                  strokeWidth="1.6" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="avatar-mouth"
                />
                
                {/* Teeth Line */}
                {(viseme === 'openWide' || viseme === 'smileOpen') && !isThinking && (
                  <path d="M 94 123 Q 100 125 106 123" stroke="#ffffff" strokeWidth="1.2" fill="none" />
                )}
              </g>

              {/* 2. STABLE WARDROBE (Deep Velvet Blazer & Ruffled Blouse - rendered SECOND so it fits perfectly on top of neck) */}
              <g filter="url(#avaDropShadow)">
                {/* Velvet Blazer Base */}
                <path d="M 52 170 C 52 136, 148 136, 148 170 Z" fill="url(#avaBlazer)" />
                
                {/* Ruffled Silk Blouse */}
                <path d="M 80 144 Q 100 162 120 144 Z" fill="#fffdfa" />
                {/* Silk folds/rumbles */}
                <path d="M 88 144 C 92 151, 95 152, 95 162" fill="none" stroke="rgba(200,180,170,0.25)" strokeWidth="1.5" />
                <path d="M 112 144 C 108 151, 105 152, 105 162" fill="none" stroke="rgba(200,180,170,0.25)" strokeWidth="1.5" />
                <path d="M 100 144 L 100 163" fill="none" stroke="rgba(200,180,170,0.3)" strokeWidth="1.5" />
                
                {/* Elegant Satin Blazer Lapels with Gold trim */}
                <path d="M 54 170 C 54 139, 81 141, 87 144 L 95 158" fill="none" stroke="url(#avaBlazerLapel)" strokeWidth="5.5" strokeLinecap="round" />
                <path d="M 146 170 C 146 139, 119 141, 113 144 L 105 158" fill="none" stroke="url(#avaBlazerLapel)" strokeWidth="5.5" strokeLinecap="round" />
                
                {/* Fine Gold Lapel Piping */}
                <path d="M 54 170 C 54 139, 81 141, 87 144 L 95 158" fill="none" stroke="url(#avaGold)" strokeWidth="1.2" />
                <path d="M 146 170 C 146 139, 119 141, 113 144 L 105 158" fill="none" stroke="url(#avaGold)" strokeWidth="1.2" />

                {/* Royal Monogram Brooch on Lapel */}
                <g transform="translate(73, 154)">
                  <circle cx="0" cy="0" r="5" fill="url(#avaGold)" />
                  <circle cx="0" cy="0" r="3.2" fill="#1b1464" />
                  <polygon points="0,-2.5 2.5,2.5 -2.5,2.5" fill="url(#avaGold)" />
                  <circle cx="-1.2" cy="-1.2" r="1.0" fill="#ffffff" />
                </g>
              </g>

              {/* Studio Rim Highlight Ring */}
              <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
            </svg>
          </div>
        )}

        {/* ─── AVATAR 2: MARCUS (EXECUTIVE TECH LEAD) ────────────────────────── */}
        {avatar === 'marcus' && (
          <div className="ai-avatar-wrapper avatar-breathing">
            <svg viewBox="0 0 200 200" className="avatar-svg">
              <defs>
                <linearGradient id="marcusSkin" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fff2e5" />
                  <stop offset="100%" stopColor="#f3d0b2" />
                </linearGradient>
                <linearGradient id="marcusHair" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2d3748" />
                  <stop offset="50%" stopColor="#1a202c" />
                  <stop offset="100%" stopColor="#0a0e17" />
                </linearGradient>
                <linearGradient id="marcusSpecs" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#4338ca" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="marcusSuit" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#312e81" />
                  <stop offset="50%" stopColor="#1e1b4b" />
                  <stop offset="100%" stopColor="#0f0e36" />
                </linearGradient>
                <linearGradient id="tieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
                <linearGradient id="marcusBackground" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.04" />
                </linearGradient>
                <filter id="marcusDropShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
                </filter>
                <clipPath id="specsClipLeft">
                  <rect x="77" y="86" width="20" height="15" rx="3" />
                </clipPath>
                <clipPath id="specsClipRight">
                  <rect x="103" y="86" width="20" height="15" rx="3" />
                </clipPath>
              </defs>

              {/* Studio Tech Ring Backdrop */}
              <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(99, 102, 241, 0.16)" strokeWidth="1" strokeDasharray="3 6" />
              <circle cx="100" cy="100" r="76" fill="url(#marcusBackground)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.8" />

              {/* Main Avatar Group: Gaze tracking + speaking tilt */}
              <g className="avatar-head">
                
                {/* 1. Body & Clothes (High-End Suit Lapels & Tie) */}
                <g filter="url(#marcusDropShadow)">
                  {/* Suit base */}
                  <path d="M 54 170 C 54 138, 146 138, 146 170 Z" fill="url(#marcusSuit)" />
                  {/* Sharp white shirt collar */}
                  <path d="M 80 143 L 100 162 L 120 143 Z" fill="#ffffff" />
                  <path d="M 83 143 L 100 156 L 117 143 Z" fill="rgba(0,0,0,0.1)" />
                  {/* Formal Orange Silk Tie */}
                  <path d="M 97 150 L 103 150 L 105 170 L 95 170 Z" fill="url(#tieGrad)" />
                  {/* Suit Peak Lapels */}
                  <path d="M 58 170 L 82 143 L 95 158" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4.5" />
                  <path d="M 142 170 L 118 143 L 105 158" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4.5" />
                  {/* Pocket Square */}
                  <polygon points="68,154 75,148 78,154" fill="url(#tieGrad)" />
                </g>
                
                {/* Neck */}
                <path d="M 94 128 C 94 144, 106 144, 106 128 Z" fill="url(#marcusSkin)" />
                <path d="M 94 130 C 94 135, 106 135, 106 130 Z" fill="rgba(0,0,0,0.08)" />

                {/* 2. Head Shape */}
                <path d="M 75 95 C 75 67, 125 67, 125 95 C 125 119, 122 131, 100 131 C 78 131, 75 119, 75 95 Z" fill="url(#marcusSkin)" />

                {/* 3. Modern Styled Pompadour Hair */}
                <g>
                  {/* Base hair volume */}
                  <path d="M 75 87 C 73 66, 78 54, 100 54 C 122 54, 127 66, 125 87 C 124 79, 120 71, 100 70 C 80 71, 76 79, 75 87 Z" fill="url(#marcusHair)" />
                  {/* Soft highlights */}
                  <path d="M 80 58 Q 100 49 120 58 Q 100 54 80 58 Z" fill="rgba(255, 255, 255, 0.05)" />
                </g>

                {/* 4. Elegant Groomed Beard */}
                <path d="M 75 97 C 75 120, 77 130, 100 131 C 123 130, 125 120, 125 97 Q 118 104 116 113 Q 100 116 84 113 Q 82 104 75 97 Z" fill="url(#marcusHair)" opacity="0.94" />

                {/* 5. Eyebrows (Micro-expressions) */}
                <path d="M 80 84 Q 87 81 94 84" stroke="#0a0e17" strokeWidth="2.8" strokeLinecap="round" fill="none" style={{ transform: getEyebrowTransform('left'), transformOrigin: '87px 83px', transition: 'all 0.2s' }} />
                <path d="M 106 84 Q 113 81 120 84" stroke="#0a0e17" strokeWidth="2.8" strokeLinecap="round" fill="none" style={{ transform: getEyebrowTransform('right'), transformOrigin: '113px 83px', transition: 'all 0.2s' }} />

                {/* 6. Gaze-Tracking Editorial Almond Eyes */}
                <g className="avatar-eye" style={{ transform: getEyeSquintStyle(), transformOrigin: '100px 92px' }}>
                  {/* Eye Sockets */}
                  <path d="M 80 93 C 80 93, 85 88, 92 93 C 92 93, 86 97, 80 93 Z" fill="#ffffff" stroke="rgba(0,0,0,0.12)" strokeWidth="0.5" />
                  <path d="M 108 93 C 108 93, 113 88, 120 93 C 120 93, 114 97, 108 93 Z" fill="#ffffff" stroke="rgba(0,0,0,0.12)" strokeWidth="0.5" />

                  {/* Pupil gaze tracking */}
                  <g className="avatar-gaze-eyes">
                    {/* Left Eye Pupil */}
                    <circle cx="86" cy="93" r="3.6" fill="#4338ca" />
                    <circle cx="86" cy="93" r="2.0" fill="#0c0a21" />
                    <circle cx="84.8" cy="91.8" r="0.9" fill="#ffffff" />
                    {/* Right Eye Pupil */}
                    <circle cx="114" cy="93" r="3.6" fill="#4338ca" />
                    <circle cx="114" cy="93" r="2.0" fill="#0c0a21" />
                    <circle cx="112.8" cy="91.8" r="0.9" fill="#ffffff" />
                  </g>
                </g>

                {/* Blush highlights */}
                <circle cx="80" cy="107" r="5" fill="#dc2626" opacity="0.08" />
                <circle cx="120" cy="107" r="5" fill="#dc2626" opacity="0.08" />

                {/* 7. Premium Designer Glasses Frame */}
                <rect x="77" y="86" width="20" height="15" rx="3" fill="url(#marcusSpecs)" stroke="#0a0e17" strokeWidth="1.8" />
                <rect x="103" y="86" width="20" height="15" rx="3" fill="url(#marcusSpecs)" stroke="#0a0e17" strokeWidth="1.8" />
                <line x1="97" y1="91" x2="103" y2="91" stroke="#0a0e17" strokeWidth="1.8" />
                {/* Sides */}
                <path d="M 74 90 L 77 90" stroke="#0a0e17" strokeWidth="1.8" />
                <path d="M 123 90 L 126 90" stroke="#0a0e17" strokeWidth="1.8" />

                {/* Glasses glare reflections (anti-parallax cursor sweep!) */}
                <g clipPath="url(#specsClipLeft)">
                  <line x1="62" y1="105" x2="92" y2="75" stroke="#ffffff" strokeWidth="2.5" opacity="0.32" className="avatar-gaze-shine" />
                </g>
                <g clipPath="url(#specsClipRight)">
                  <line x1="88" y1="105" x2="118" y2="75" stroke="#ffffff" strokeWidth="2.5" opacity="0.32" className="avatar-gaze-shine" />
                </g>

                {/* 8. Professional Executive Headset */}
                <path d="M 75 73 A 25 25 0 0 1 125 73" fill="none" stroke="#475569" strokeWidth="2.5" />
                <rect x="71" y="85" width="5" height="18" rx="2.5" fill="#0a0e17" />
                <rect x="124" y="85" width="5" height="18" rx="2.5" fill="#0a0e17" />
                
                {/* Headset Mic boom */}
                <g className="avatar-physics-mic">
                  <path d="M 125 94 C 125 107, 115 117, 104 117" fill="none" stroke="#64748b" strokeWidth="1.8" />
                  <ellipse cx="103" cy="117" rx="3.2" ry="2.0" fill="#0a0e17" />
                  {/* Pulse speaking indicator node */}
                  <circle cx="103" cy="117" r="1.1" fill={isSpeaking ? "#10b981" : "#dc2626"} />
                </g>

                {/* 9. Nose */}
                <path d="M 99 96 L 99 105 C 99 107, 101 107, 101 105" stroke="#d5a37f" strokeWidth="1.6" strokeLinecap="round" fill="none" />

                {/* 10. Lip-Synced Mouth */}
                <path 
                  d={getMouthPath('marcus')} 
                  fill={viseme.startsWith('open') || viseme === 'smileOpen' ? "#7f1d1d" : "none"} 
                  stroke="#7f1d1d" 
                  strokeWidth="2.8" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="avatar-mouth"
                />
                
                {/* Teeth Line */}
                {(viseme === 'openWide' || viseme === 'smileOpen') && !isThinking && (
                  <path d="M 94 121 L 106 121" stroke="#ffffff" strokeWidth="0.8" fill="none" />
                )}
              </g>

              {/* Studio Rim Highlight Ring */}
              <circle cx="100" cy="100" r="77" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
            </svg>
          </div>
        )}

        {/* ─── AVATAR 3: SOPHIA (CYBERNETIC CYBORG HOLOGRAPHIC) ──────────────── */}
        {avatar === 'sophia' && (
          <div className="ai-avatar-wrapper">
            <svg viewBox="0 0 200 200" className="avatar-svg" style={{ overflow: 'visible' }}>
              <defs>
                <radialGradient id="sophiaGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="sophiaVisorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
                <linearGradient id="circuitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.2" />
                </linearGradient>
                <filter id="cyberVisor" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <style>{`
                @keyframes sophiaPulseHUD {
                  0% { transform: rotate(0deg) scale(1.02); opacity: 0.3; }
                  50% { transform: rotate(180deg) scale(0.98); opacity: 0.65; }
                  100% { transform: rotate(360deg) scale(1.02); opacity: 0.3; }
                }
                @keyframes orbitNode {
                  0% { transform: rotate(0deg) translate(64px) rotate(0deg); }
                  100% { transform: rotate(360deg) translate(64px) rotate(-360deg); }
                }
                @keyframes visorsweep {
                  0%, 100% { fill: rgba(14, 165, 233, 0.15); stroke: #ec4899; }
                  50% { fill: rgba(236, 72, 153, 0.18); stroke: #0ea5e9; }
                }
                @keyframes neonpulse {
                  0%, 100% { filter: drop-shadow(0 0 3px #ec4899); opacity: 0.8; }
                  50% { filter: drop-shadow(0 0 12px #0ea5e9); opacity: 1; }
                }
                @keyframes waveScale {
                  0% { transform: scaleY(0.25); }
                  100% { transform: scaleY(1.75); }
                }
              `}</style>

              {/* Glowing Aura Background */}
              <circle cx="100" cy="100" r="85" fill="url(#sophiaGlow)" />

              {/* Futuristic Cyber HUD Rings */}
              <circle cx="100" cy="100" r="81" fill="none" stroke="#0ea5e9" strokeWidth="1.2" strokeDasharray="30 80 60 50" style={{ transformOrigin: 'center', animation: 'sophiaPulseHUD 6s linear infinite' }} />
              <circle cx="100" cy="100" r="75" fill="none" stroke="#ec4899" strokeWidth="1" strokeDasharray="15 35 25 75" style={{ transformOrigin: 'center', animation: 'sophiaPulseHUD 9s linear infinite reverse' }} />

              {/* Floating tracking HUD points */}
              <g className="avatar-gaze-eyes" style={{ transformOrigin: '100px 100px' }}>
                <circle cx="100" cy="100" r="68" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                <circle cx="100" cy="100" r="4.5" fill="#0ea5e9" filter="url(#cyberVisor)" style={{ transformOrigin: '100px 100px', animation: 'orbitNode 3.5s linear infinite' }} />
                <circle cx="100" cy="100" r="3.5" fill="#ec4899" filter="url(#cyberVisor)" style={{ transformOrigin: '100px 100px', animation: 'orbitNode 5s linear infinite reverse' }} />
              </g>

              {/* Cyber Android Group */}
              <g className="avatar-head">
                
                {/* Cyber Body Outer structure */}
                <path d="M 58 162 C 58 136, 142 136, 142 162 Z" fill="none" stroke="rgba(14, 165, 233, 0.35)" strokeWidth="1.8" strokeDasharray="8 4" />
                <path d="M 68 162 L 132 162" stroke="url(#sophiaVisorGrad)" strokeWidth="2.5" strokeLinecap="round" />

                {/* neck equalizer waveforms */}
                <g transform="translate(80, 136)" style={{ opacity: isSpeaking ? 1 : 0.45 }}>
                  <line x1="5" y1="5" x2="5" y2="20" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin: '5px 12px', animation: isSpeaking ? 'waveScale 0.28s ease-in-out infinite alternate' : 'none' }} />
                  <line x1="12" y1="2" x2="12" y2="23" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin: '12px 12px', animation: isSpeaking ? 'waveScale 0.4s ease-in-out infinite alternate-reverse' : 'none' }} />
                  <line x1="20" y1="7" x2="20" y2="18" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin: '20px 12px', animation: isSpeaking ? 'waveScale 0.22s ease-in-out infinite alternate' : 'none' }} />
                  <line x1="28" y1="2" x2="28" y2="23" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin: '28px 12px', animation: isSpeaking ? 'waveScale 0.45s ease-in-out infinite alternate-reverse' : 'none' }} />
                  <line x1="35" y1="5" x2="35" y2="20" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin: '35px 12px', animation: isSpeaking ? 'waveScale 0.32s ease-in-out infinite alternate' : 'none' }} />
                </g>

                {/* Translucent Silicon Face outline */}
                <polygon points="76,82 100,56 124,82 118,124 100,136 82,124" fill="rgba(10, 15, 30, 0.85)" stroke="#0ea5e9" strokeWidth="2.2" strokeLinejoin="round" />
                <line x1="76" y1="82" x2="124" y2="82" stroke="rgba(14, 165, 233, 0.3)" strokeWidth="1" />
                <line x1="100" y1="56" x2="100" y2="136" stroke="rgba(14, 165, 233, 0.2)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="82" y1="124" x2="118" y2="124" stroke="rgba(14, 165, 233, 0.3)" strokeWidth="1" />

                {/* Circuit Details on Faceplate */}
                <path d="M 82 70 L 92 80 L 100 80" fill="none" stroke="url(#circuitGrad)" strokeWidth="1.2" />
                <path d="M 118 70 L 108 80 L 100 80" fill="none" stroke="url(#circuitGrad)" strokeWidth="1.2" />
                <circle cx="82" cy="70" r="1.5" fill="#0ea5e9" />
                <circle cx="118" cy="70" r="1.5" fill="#0ea5e9" />

                {/* Visor */}
                <g style={{ transform: blink ? 'scaleY(0.08)' : 'scaleY(1)', transformOrigin: '100px 88px' }}>
                  <polygon points="80,85 100,81 120,85 117,94 100,98 83,94" fill="rgba(14, 165, 233, 0.18)" stroke="#ec4899" strokeWidth="1.8" filter="url(#cyberVisor)" style={{ animation: 'visorsweep 4s ease-in-out infinite' }} />
                  <line x1="85" y1="90" x2="115" y2="90" stroke="url(#sophiaVisorGrad)" strokeWidth="2.8" strokeLinecap="round" filter="url(#cyberVisor)" style={{ animation: 'neonpulse 2.5s ease-in-out infinite' }} />
                  <circle cx="91" cy="90" r="1.8" fill="#ffffff" />
                  <circle cx="109" cy="90" r="1.8" fill="#ffffff" />
                </g>

                <polygon points="82,88 95,85 91,95 82,88" fill="#ffffff" opacity="0.3" className="avatar-gaze-shine" />

                {/* HUD Data Text */}
                <path d="M 124 82 L 138 72 L 148 72" fill="none" stroke="rgba(236, 72, 153, 0.5)" strokeWidth="1.2" />
                <text x="141" y="67" fill="#ec4899" fontSize="6.5" fontFamily="monospace" fontWeight="900" style={{ letterSpacing: '0.5px' }}>SYS: SOPHIA</text>
                
                <path d="M 76 82 L 62 72 L 52 72" fill="none" stroke="rgba(14, 165, 233, 0.5)" strokeWidth="1.2" />
                <text x="44" y="67" fill="#0ea5e9" fontSize="6.5" fontFamily="monospace" fontWeight="900" textAnchor="end" style={{ letterSpacing: '0.5px' }}>CORE_V8.4</text>

                {/* Digital Pixel Mouth */}
                <g transform="translate(85, 114)">
                  <line x1="0" y1="5" x2="30" y2="5" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
                  {isSpeaking && !isThinking ? (
                    <>
                      <line x1="6" y1="0" x2="6" y2="10" stroke="#ffffff" strokeWidth="1.8" style={{ animation: 'waveScale 0.25s linear infinite alternate' }} />
                      <line x1="11" y1="-3" x2="11" y2="13" stroke="#0ea5e9" strokeWidth="1.8" style={{ animation: 'waveScale 0.18s linear infinite alternate-reverse' }} />
                      <line x1="15" y1="-6" x2="15" y2="16" stroke="#ec4899" strokeWidth="2.2" style={{ animation: 'waveScale 0.28s linear infinite alternate' }} />
                      <line x1="19" y1="-3" x2="19" y2="13" stroke="#0ea5e9" strokeWidth="1.8" style={{ animation: 'waveScale 0.16s linear infinite alternate-reverse' }} />
                      <line x1="24" y1="0" x2="24" y2="10" stroke="#ffffff" strokeWidth="1.8" style={{ animation: 'waveScale 0.22s linear infinite alternate' }} />
                    </>
                  ) : isThinking ? (
                    <>
                      <circle cx="6" cy="5" r="1.5" fill="#ec4899" style={{ animation: 'neonpulse 0.5s ease-in-out infinite' }} />
                      <circle cx="15" cy="5" r="1.5" fill="#ec4899" style={{ animation: 'neonpulse 0.5s ease-in-out infinite 0.15s' }} />
                      <circle cx="24" cy="5" r="1.5" fill="#ec4899" style={{ animation: 'neonpulse 0.5s ease-in-out infinite 0.3s' }} />
                    </>
                  ) : (
                    <>
                      <circle cx="6" cy="5" r="1.5" fill="#0ea5e9" />
                      <circle cx="15" cy="5" r="2.0" fill="#ffffff" />
                      <circle cx="24" cy="5" r="1.5" fill="#0ea5e9" />
                    </>
                  )}
                </g>
              </g>
            </svg>
          </div>
        )}
        
        {/* Advanced Loader Overlay (Analyzing state) */}
        {isThinking && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(5, 8, 16, 0.78)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            zIndex: 8
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '3.5px solid rgba(37, 99, 235, 0.1)',
              borderTopColor: 'var(--accent-primary)',
              animation: 'spin 0.7s linear infinite'
            }} />
            <span style={{
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.72rem',
              fontWeight: 900,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              textShadow: '0 0 12px rgba(37, 99, 235, 0.45)'
            }}>
              Analyzing Response
            </span>
          </div>
        )}
      </div>
      
      <div className="ai-speech-bubble">
        {reaction ? (
          <p className="interviewer-text reaction">
            <span>{reaction}</span>
          </p>
        ) : (
          <p className="interviewer-text">
            Hello! I'm your AI interviewer today. Let's get started with your placement prep session.
          </p>
        )}
        
        <div className="interviewer-question-box">
          <span className="q-label">Current Question:</span>
          <p className="q-text">{question}</p>
        </div>
      </div>
    </div>
  );
}
