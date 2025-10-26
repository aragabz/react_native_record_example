import { useState } from 'react';
import { audioService, AudioFile, AudioUploadResponse } from '../services/audioService';

interface UseAudioUploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  uploadedFile: AudioUploadResponse | null;
}

export function useAudioUpload() {
  const [state, setState] = useState<UseAudioUploadState>({
    uploading: false,
    progress: 0,
    error: null,
    uploadedFile: null,
  });

  const uploadAudio = async (audioFile: AudioFile, userId: string = '123') => {
    setState({
      uploading: true,
      progress: 0,
      error: null,
      uploadedFile: null,
    });

    try {
      const result = await audioService.uploadAudio(
        audioFile,
        { userId },
        (progress) => {
          setState(prev => ({ ...prev, progress }));
        }
      );

      setState({
        uploading: false,
        progress: 100,
        error: null,
        uploadedFile: result,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setState({
        uploading: false,
        progress: 0,
        error: errorMessage,
        uploadedFile: null,
      });
      throw error;
    }
  };

  // const uploadAudioWithMetadata = async (
  //   audioFile: AudioFile,
  //   options: {
  //     userId?: string;
  //     metadata?: {
  //       title?: string;
  //       description?: string;
  //       tags?: string[];
  //       category?: string;
  //     };
  //   } = {}
  // ) => {
  //   setState({
  //     uploading: true,
  //     progress: 0,
  //     error: null,
  //     uploadedFile: null,
  //   });

  //   try {
  //     const result = await audioService.uploadAudioWithMetadata(
  //       audioFile,
  //       { userId: options.userId || '123', metadata: options.metadata },
  //       (progress) => {
  //         setState(prev => ({ ...prev, progress }));
  //       }
  //     );

  //     setState({
  //       uploading: false,
  //       progress: 100,
  //       error: null,
  //       uploadedFile: result,
  //     });

  //     return result;
  //   } catch (error) {
  //     const errorMessage = error instanceof Error ? error.message : 'Upload failed';
  //     setState({
  //       uploading: false,
  //       progress: 0,
  //       error: errorMessage,
  //       uploadedFile: null,
  //     });
  //     throw error;
  //   }
  // };

  const reset = () => {
    setState({
      uploading: false,
      progress: 0,
      error: null,
      uploadedFile: null,
    });
  };

  return {
    ...state,
    uploadAudio,
    // uploadAudioWithMetadata,
    reset,
  };
}