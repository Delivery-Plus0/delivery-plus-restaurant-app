import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { t } from '@/i18n/core';

/** The backend's presigned POST (shared S3StorageService): post `fields` plus the file to `uploadUrl`. */
export type PresignedUpload = {
  uploadUrl: string;
  objectKey: string;
  expiresIn: number;
  method: 'POST';
  fields: Record<string, string>;
};

export type PickedImage = { uri: string; mimeType: ImageMimeType; fileName: string; fileSize?: number };

/** What the backend's upload policy accepts (JPEG, PNG, WebP). */
export type ImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp';
const ACCEPTED: ImageMimeType[] = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** The picked file's type, from its MIME type or file name; null when the backend won't accept it. */
export function acceptedMimeType(mimeType: string | null | undefined, fileName: string | null | undefined): ImageMimeType | null {
  const declared = mimeType?.toLowerCase();
  if (declared && (ACCEPTED as string[]).includes(declared)) return declared as ImageMimeType;
  if (declared === 'image/jpg') return 'image/jpeg';
  const extension = fileName?.toLowerCase().split('.').pop();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return null;
}

/** A clear reason the picked file can't be uploaded, before asking the backend (which checks again). */
export function pickedImageProblem(type: ImageMimeType | null, fileSize?: number, maxBytes = MAX_IMAGE_BYTES): string | null {
  if (!type) return t('Choose a JPEG, PNG or WebP image.');
  if (fileSize !== undefined && fileSize > maxBytes) return t('Choose an image under {mb} MB.', { mb: Math.round(maxBytes / (1024 * 1024)) });
  return null;
}

/**
 * Lets the user pick one image from their library (the camera on native when `source` is
 * 'camera'). Returns null when they cancel or deny access; throws a readable message otherwise.
 */
export async function pickImage(source: 'library' | 'camera' = 'library', maxBytes = MAX_IMAGE_BYTES): Promise<PickedImage | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, allowsEditing: false };
  if (source === 'camera' && Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
  }
  const result = source === 'camera' && Platform.OS !== 'web' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const fileName = asset.fileName ?? `image-${Date.now()}.jpg`;
  const mimeType = acceptedMimeType(asset.mimeType, fileName);
  const problem = pickedImageProblem(mimeType, asset.fileSize ?? undefined, maxBytes);
  if (problem) throw new Error(problem);
  return { uri: asset.uri, mimeType: mimeType as ImageMimeType, fileName, fileSize: asset.fileSize ?? undefined };
}

/** Uploads the picked image straight to storage with the backend's presigned POST. */
export async function uploadToPresigned(presigned: PresignedUpload, image: PickedImage): Promise<void> {
  const form = new FormData();
  for (const [key, value] of Object.entries(presigned.fields)) form.append(key, value);
  if (Platform.OS === 'web') {
    const blob = await (await fetch(image.uri)).blob();
    form.append('file', new File([blob], image.fileName, { type: image.mimeType }));
  } else {
    // React Native's FormData takes a { uri, name, type } descriptor for files.
    form.append('file', { uri: image.uri, name: image.fileName, type: image.mimeType } as unknown as Blob);
  }
  const response = await fetch(presigned.uploadUrl, { method: 'POST', body: form });
  if (!response.ok) throw new Error(t('The upload did not go through. Check your connection and try again.'));
}
