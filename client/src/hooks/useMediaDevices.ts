import { useState, useEffect } from 'react';

export interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export const useMediaDevices = () => {
  const [cameras, setCameras] = useState<DeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<DeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<DeviceInfo[]>([]);
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('prompt');
  const [micPermission, setMicPermission] = useState<PermissionState>('prompt');

  const checkDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();

      setCameras(
        devices
          .filter((d) => d.kind === 'videoinput')
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${i + 1}`,
            kind: d.kind,
          }))
      );

      setMicrophones(
        devices
          .filter((d) => d.kind === 'audioinput')
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${i + 1}`,
            kind: d.kind,
          }))
      );

      setSpeakers(
        devices
          .filter((d) => d.kind === 'audiooutput')
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Speaker ${i + 1}`,
            kind: d.kind,
          }))
      );
    } catch (err) {
      console.warn('Error enumerating devices:', err);
    }
  };

  useEffect(() => {
    checkDevices();

    navigator.mediaDevices?.addEventListener('devicechange', checkDevices);

    // Check permissions if supported
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'camera' as any })
        .then((p) => {
          setCameraPermission(p.state);
          p.onchange = () => setCameraPermission(p.state);
        })
        .catch(() => {});

      navigator.permissions
        .query({ name: 'microphone' as any })
        .then((p) => {
          setMicPermission(p.state);
          p.onchange = () => setMicPermission(p.state);
        })
        .catch(() => {});
    }

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', checkDevices);
    };
  }, []);

  const testMediaStream = async (type: 'camera' | 'microphone'): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: type === 'camera',
      audio: type === 'microphone',
    });
    // Re-check devices after permission grant to get actual device labels
    checkDevices();
    return stream;
  };

  return {
    cameras,
    microphones,
    speakers,
    cameraPermission,
    micPermission,
    refreshDevices: checkDevices,
    testMediaStream,
  };
};
