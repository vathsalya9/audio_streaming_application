import React, { useState, useRef, useEffect } from 'react';
import SimplePeer from 'simple-peer';
import './AudioStream.css'; 

const AudioStream = () => {
  const [peer, setPeer] = useState(null);
  const [isInitiator, setIsInitiator] = useState(false);
  const [stream, setStream] = useState(null);
  const [devices, setDevices] = useState([]);
  const [filterEnabled, setFilterEnabled] = useState(false);
  const audioRef = useRef();
  const audioContext = useRef(null);
  const gainNode = useRef(null);
  const biquadFilter = useRef(null);

  const getUserAudio = async (deviceId) => {
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: deviceId ? { exact: deviceId } : undefined },
      });
      setStream(userStream);
      audioRef.current.srcObject = userStream;
    } catch (error) {
      console.error('Error accessing audio stream:', error);
    }
  };

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      setDevices(devices.filter(device => device.kind === 'audioinput'));
    });
  }, []);

  const initializePeer = (initiator) => {
    console.log('Initializing peer. Initiator:', initiator);
    
    const newPeer = new SimplePeer({
      initiator,
      trickle: false,
      stream,
    });
  
    newPeer.on('signal', data => {
      console.log('SIGNAL', JSON.stringify(data));
    });
  
    newPeer.on('stream', remoteStream => {
      console.log('Received remote stream');
      audioRef.current.srcObject = remoteStream;
    });
  
    newPeer.on('error', err => {
      console.error('Peer error:', err);
    });
  
    setPeer(newPeer);
    setIsInitiator(initiator);
  };
  
  const connectPeers = (signalData) => {
    try {
      const parsedData = JSON.parse(signalData);
      if (peer) {
        console.log('Connecting peers...');
        peer.signal(parsedData);
      } else {
        console.error("Peer is not initialized. Please click 'Start Streaming' or 'Join Streaming' before pasting the signal data.");
      }
    } catch (error) {
      console.error("Failed to parse signal data:", error);
    }
  };  

  const setupAudioFilters = () => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      gainNode.current = audioContext.current.createGain();
      biquadFilter.current = audioContext.current.createBiquadFilter();
      biquadFilter.current.type = 'lowshelf';
      biquadFilter.current.frequency.setValueAtTime(200, audioContext.current.currentTime);
      gainNode.current.gain.setValueAtTime(0.75, audioContext.current.currentTime);
    }

    const source = audioContext.current.createMediaStreamSource(stream);
    source.connect(biquadFilter.current);
    biquadFilter.current.connect(gainNode.current);
    gainNode.current.connect(audioContext.current.destination);
  };

  const toggleFilter = () => {
    setFilterEnabled(!filterEnabled);
    if (!filterEnabled) {
      setupAudioFilters();
    } else {
      gainNode.current.disconnect();
      biquadFilter.current.disconnect();
    }
  };

  return (
    <div className="audio-container">
      <h1>Audio Streaming</h1>
      <select onChange={(e) => getUserAudio(e.target.value)} className="audio-select">
        <option value="">Select Audio Input</option>
        {devices.map(device => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Microphone ${device.deviceId}`}
          </option>
        ))}
      </select>
      <audio ref={audioRef} controls autoPlay className="audio-player" />
      <div className="button-container">
        <button onClick={() => getUserAudio()} className="audio-button">Start Audio</button>
        <button onClick={() => initializePeer(true)} className="audio-button">Start Streaming</button>
        <button onClick={() => initializePeer(false)} className="audio-button">Join Streaming</button>
        <button onClick={toggleFilter} className="audio-button">{filterEnabled ? 'Disable Filter' : 'Enable Filter'}</button>
      </div>
      <textarea onChange={(e) => connectPeers(e.target.value)} placeholder="Paste signal data here" className="signal-data" />
    </div>
  );
};

export default AudioStream;
