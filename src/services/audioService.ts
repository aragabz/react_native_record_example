import api, { api as namedApi } from './api';
import * as RNFS from 'react-native-fs';
import { Platform } from 'react-native';

export interface AudioUploadResponse {
  success?: boolean;
  message?: string;
  data?: any;
  audioPath?: string; // Path to the saved audio response
  // Add other fields based on your API response
}

export interface AudioFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export interface VoiceChatOptions {
  userId: string;
}

// Test API import
console.log('AudioService: API import check:', {
  defaultApiExists: !!api,
  namedApiExists: !!namedApi,
  defaultApiType: typeof api,
  namedApiType: typeof namedApi,
  defaultHasPost: typeof api?.post,
  namedHasPost: typeof namedApi?.post,
});

export const audioService = {
  // Upload audio file to voice chat endpoint
  uploadAudio: async (
    audioFile: AudioFile,
    options: VoiceChatOptions = { userId: '123' },
    onUploadProgress?: (progress: number) => void,
  ): Promise<AudioUploadResponse> => {
    const formData = new FormData();

    // Add the audio file to FormData with 'file' field name as per curl command
    formData.append('file', {
      uri: audioFile.uri,
      name: audioFile.name,
      type: audioFile.type || 'audio/mpeg',
    } as any);

    console.log('API object type:', typeof api);
    console.log('API object exists:', !!api);
    console.log('API post method exists:', typeof api?.post);

    const apiToUse = api || namedApi;
    if (!apiToUse) {
      throw new Error('Both API instances are undefined');
    }

    const response = await apiToUse.post('/chat/voice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        userId: options.userId,
      },
      responseType: 'arraybuffer', // Handle binary response
      onUploadProgress: progressEvent => {
        if (onUploadProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onUploadProgress(progress);
        }
      },
    });

    // Save binary response as audio file
    const timestamp = Date.now();
    const responseAudioPath =
      Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/response_${timestamp}.wav`
        : `${RNFS.ExternalDirectoryPath}/response_${timestamp}.wav`;

    // Convert ArrayBuffer to base64
    try {
      const arrayBuffer = response.data;

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Empty audio response received');
      }

      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);

      // Write audio file
      await RNFS.writeFile(responseAudioPath, base64Audio, 'base64');

      console.log(
        `Audio response saved: ${bytes.byteLength} bytes -> ${responseAudioPath}`,
      );
    } catch (conversionError) {
      console.error('Failed to convert audio response:', conversionError);
      throw new Error(`Audio conversion failed: ${conversionError.message}`);
    }

    console.log('Response audio saved to:', responseAudioPath);

    return {
      success: true,
      message: 'Audio response received',
      audioPath: responseAudioPath,
    };
  },

  // Get uploaded audio info
  getAudioInfo: async (audioId: string): Promise<AudioUploadResponse> => {
    const apiToUse = api || namedApi;
    const response = await apiToUse.get<AudioUploadResponse>(
      `/audio/${audioId}`,
    );
    return response.data;
  },

  // Delete uploaded audio
  deleteAudio: async (audioId: string): Promise<void> => {
    const apiToUse = api || namedApi;
    await apiToUse.delete(`/audio/${audioId}`);
  },

  // Get user's uploaded audios
  getUserAudios: async (): Promise<AudioUploadResponse[]> => {
    const apiToUse = api || namedApi;
    const response = await apiToUse.get<AudioUploadResponse[]>('/audio/user');
    return response.data;
  },
};

export default audioService;
