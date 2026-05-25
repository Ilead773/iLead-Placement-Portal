import React, { useRef, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function CandidateVideo({ onProctorAlert, onGazeChange, isActive }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [proctorLoading, setProctorLoading] = useState(true);
  const [proctorStatus, setProctorStatus] = useState('Initializing AI...');
  
  const faceMeshRef = useRef(null);
  const frameLoopRef = useRef(null);
  
  // Real-Time Personalized Eye Gaze Self-Calibration
  const calibrationCount = useRef(0);
  const calibrationSumX = useRef(0);
  const calibrationSumY = useRef(0);
  const baselineX = useRef(0.5);
  const baselineY = useRef(0.5);
  const isCalibrated = useRef(false);
  const faceAbsentStartTime = useRef(null);
  const streamRef = useRef(null);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // 1. Dynamic Script Loader for MediaPipe Face Mesh
  useEffect(() => {
    let scriptActive = true;
    
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        // If FaceMesh is already defined on the global window object, resolve immediately
        if (window.FaceMesh) {
          resolve();
          return;
        }

        // If the script element is already added to the document (e.g. from an earlier mount)
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
          // Poll for window.FaceMesh to be defined, resolving once it is ready
          const interval = setInterval(() => {
            if (window.FaceMesh) {
              clearInterval(interval);
              resolve();
            }
          }, 50);

          // Timeout after 10 seconds to prevent hanging
          setTimeout(() => {
            clearInterval(interval);
            if (window.FaceMesh) {
              resolve();
            } else {
              reject(new Error("Timeout waiting for FaceMesh script initialization"));
            }
          }, 10000);
          return;
        }

        // Create the script tag if it doesn't exist
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        
        script.onload = () => {
          // Double check that window.FaceMesh is defined
          const interval = setInterval(() => {
            if (window.FaceMesh) {
              clearInterval(interval);
              resolve();
            }
          }, 20);
          setTimeout(() => clearInterval(interval), 2000);
        };
        
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
      });
    };

    async function initMediaPipe() {
      try {
        setProctorStatus('Loading Camera...');
        // Load Pinned, Stable MediaPipe Face Mesh CDN Script
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js');
        
        if (!scriptActive) return;
        
        if (window.FaceMesh) {
          const faceMesh = new window.FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`
          });

          faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.3,
            minTrackingConfidence: 0.3
          });

          faceMesh.onResults((results) => {
            if (!scriptActive) return;
            handleProctorResults(results);
          });

          faceMeshRef.current = faceMesh;
          setProctorLoading(false);
          setProctorStatus('Camera Active');
          console.log("🟢 Pinned MediaPipe Face Mesh initialized successfully.");
        } else {
          throw new Error("FaceMesh library not loaded successfully.");
        }
      } catch (err) {
        console.error("❌ MediaPipe Loading Error:", err);
        setProctorLoading(false);
        setProctorStatus('Camera Ready');
        // Fallback gracefully so candidate can still take mock interview even if CDN is blocked/offline
        toast.error("Proctoring AI download failed. Standard tab-switching proctoring remains active.");
      }
    }

    initMediaPipe();

    return () => {
      scriptActive = false;
    };
  }, []);

  // 2. Setup Webcam Stream and Frame Processing Loop
  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        const constraints = {
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
          audio: false
        };
        let mediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (innerErr) {
          console.warn("Retrying webcam with basic video parameters...", innerErr);
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        
        if (!active) {
          if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
          }
          return;
        }
        setStream(mediaStream);
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setError("Camera access denied or not found");
      }
    }

    startCamera();

    // Setup active throttled frame capture loop (12 fps for CPU efficiency)
    const processFrame = async () => {
      if (!active) return;
      if (
        isActiveRef.current && 
        videoRef.current && 
        videoRef.current.readyState >= 2 && 
        videoRef.current.videoWidth > 0 && 
        videoRef.current.videoHeight > 0 &&
        faceMeshRef.current
      ) {
        try {
          await faceMeshRef.current.send({ image: videoRef.current });
        } catch (e) {
          console.error("FaceMesh frame processing failed:", e);
        }
      }
      
      frameLoopRef.current = setTimeout(() => {
        if (active) requestAnimationFrame(processFrame);
      }, 85); // Throttled to ~12fps
    };

    processFrame();

    return () => {
      active = false;
      clearTimeout(frameLoopRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // 3. Process MediaPipe Face Mesh Coordinates
  const handleProctorResults = (results) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const faceCount = results.multiFaceLandmarks ? results.multiFaceLandmarks.length : 0;
    
    if (faceCount === 0) {
      if (!faceAbsentStartTime.current) {
        faceAbsentStartTime.current = Date.now();
      }
      const elapsed = Date.now() - faceAbsentStartTime.current;
      if (elapsed > 8000) { // 8s grace period
        onProctorAlert('face_absent', 'Face not detected');
        onGazeChange('No Face Present');
      }
      return;
    } else {
      faceAbsentStartTime.current = null;
    }

    // 1 Face present -> calculate gaze direction and draw mesh
    const landmarks = results.multiFaceLandmarks[0];
    
    // Gaze landmarks: Left iris center (468), Right iris center (473)
    // Left eye corner outer (33), inner (133), top (159), bottom (145)
    // Right eye corner inner (362), outer (263), top (386), bottom (374)
    const leftIris = landmarks[468];
    const leftInner = landmarks[133];
    const leftOuter = landmarks[33];
    const leftTop = landmarks[159];
    const leftBottom = landmarks[145];
    
    const rightIris = landmarks[473];
    const rightInner = landmarks[362];
    const rightOuter = landmarks[263];
    const rightTop = landmarks[386];
    const rightBottom = landmarks[374];
    
    if (leftIris && leftInner && leftOuter && rightIris && rightInner && rightOuter) {
      const getHorizontalRatio = (iris, inner, outer) => {
        const min_x = Math.min(inner.x, outer.x);
        const max_x = Math.max(inner.x, outer.x);
        if (max_x === min_x) return 0.5;
        return (iris.x - min_x) / (max_x - min_x);
      };
      
      const getVerticalRatio = (iris, top, bottom) => {
        const min_y = Math.min(top.y, bottom.y);
        const max_y = Math.max(top.y, bottom.y);
        if (max_y === min_y) return 0.5;
        return (iris.y - min_y) / (max_y - min_y);
      };
      
      const ratioL = getHorizontalRatio(leftIris, leftInner, leftOuter);
      const ratioR = getHorizontalRatio(rightIris, rightInner, rightOuter);
      const avgRatioX = (ratioL + ratioR) / 2;
      
      const vRatioL = getVerticalRatio(leftIris, leftTop, leftBottom);
      const vRatioR = getVerticalRatio(rightIris, rightTop, rightBottom);
      const avgRatioY = (vRatioL + vRatioR) / 2;
      
      // ─── Gaze Self-Calibration Logic ─────────────────────────────
      if (!isCalibrated.current) {
        calibrationSumX.current += avgRatioX;
        calibrationSumY.current += avgRatioY;
        calibrationCount.current += 1;
        
        onGazeChange(`Calibrating Gaze (${Math.round((calibrationCount.current / 20) * 100)}%)`);

        if (calibrationCount.current >= 20) {
          baselineX.current = calibrationSumX.current / 20;
          baselineY.current = calibrationSumY.current / 20;
          isCalibrated.current = true;
          console.log(`👁️ Gaze calibration complete! Baselines: X=${baselineX.current.toFixed(4)}, Y=${baselineY.current.toFixed(4)}`);
        }
        
        // Return early while calibrating to avoid premature alerts
        return;
      }
      
      // Calculate delta relative to calibrated eye baseline:
      const diffX = avgRatioX - baselineX.current;
      const diffY = avgRatioY - baselineY.current;
      
      let gaze = 'Eye Contact';
      
      // Self-calibrated mirror-view boundaries:
      if (diffX < -0.16) {
        gaze = 'Looking Right';
        onProctorAlert('gaze_away', 'Looking Right');
      } else if (diffX > 0.16) {
        gaze = 'Looking Left';
        onProctorAlert('gaze_away', 'Looking Left');
      } else if (diffY > 0.18) {
        gaze = 'Looking Down';
        onProctorAlert('gaze_away', 'Looking Down');
      } else if (diffY < -0.18) {
        gaze = 'Looking Up';
        onProctorAlert('gaze_away', 'Looking Up');
      } else {
        gaze = 'Eye Contact';
        onProctorAlert('gaze_good', '');
      }
      
      onGazeChange(gaze);
    }
    

  };

  return (
    <div className="candidate-video-card proctor-video-hud glass-panel">
      <div className="video-container">
        {error ? (
          <div className="video-error">
            <div className="video-error-icon-box">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
                <line x1="1" y1="1" x2="23" y2="23" stroke="#ef4444" strokeWidth="2.5" />
              </svg>
            </div>
            <h4 className="video-error-title">Camera Off</h4>
            <p className="video-error-desc">
              Please give permission to use your camera in your browser settings.
            </p>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="webcam-feed"
            />
            <canvas 
              ref={canvasRef} 
              className="proctor-canvas-overlay"
            />
            <div className="video-overlay">
              <div className="video-overlay-top">
                <span className={`live-badge ${proctorLoading ? 'loading' : 'secure-active'}`}>
                  {proctorStatus}
                </span>
              </div>
              <div className="video-overlay-bottom">
                <span className="candidate-name">🔴 Live Video</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
