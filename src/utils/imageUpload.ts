/**
 * Cloudinary Secure Upload Utility
 * Handles CDN media upload (Images & Videos), auto-compression, and format conversion
 */

import { getAdminSessionToken } from './adminAuth';

export interface UploadResult {
  success: boolean;
  url: string;
  error?: string;
  publicId?: string;
  resourceType?: 'image' | 'video' | 'raw';
}

/**
 * Universal media uploader for Photos and Videos
 * Works directly with File objects (from gallery/device file picker) or base64 strings
 */
export async function uploadMediaToCloudinary(
  fileOrBase64: File | string,
  resourceType: 'auto' | 'image' | 'video' = 'auto',
  folder = 'durga_puja_2026'
): Promise<UploadResult> {
  const isVideo =
    resourceType === 'video' ||
    (fileOrBase64 instanceof File && fileOrBase64.type.startsWith('video/')) ||
    (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:video/'));

  const cloudName = 'aoa1bada';
  const uploadPreset = 'Durga_puja';
  const directEndpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${isVideo ? 'video' : 'image'}/upload`;

  // 1. Direct Cloudinary Upload via FormData (Fastest & handles large video files without memory freeze)
  try {
    const formData = new FormData();
    if (fileOrBase64 instanceof File) {
      formData.append('file', fileOrBase64);
    } else {
      formData.append('file', fileOrBase64);
    }
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    const directRes = await fetch(directEndpoint, {
      method: 'POST',
      body: formData,
    });

    const directData = await directRes.json();
    if (directRes.ok && directData.secure_url) {
      let optimized = directData.secure_url;
      // Auto-quality for images only; videos use standard streaming url
      if (!isVideo && optimized.includes('/upload/')) {
        optimized = optimized.replace('/upload/', '/upload/f_auto,q_auto/');
      }
      return {
        success: true,
        url: optimized,
        publicId: directData.public_id,
        resourceType: isVideo ? 'video' : 'image',
      };
    } else if (directData.error?.message) {
      console.warn('Direct Cloudinary upload error:', directData.error.message);
    }
  } catch (directErr) {
    console.warn('Direct Cloudinary upload failed, attempting server proxy...', directErr);
  }

  // 2. Server Proxy Fallback via Admin Token
  try {
    const token = getAdminSessionToken();
    let base64Data: string;
    if (fileOrBase64 instanceof File) {
      base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(fileOrBase64);
      });
    } else {
      base64Data = fileOrBase64;
    }

    const res = await fetch('/api/upload-media', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-admin-token': token } : {}),
      },
      body: JSON.stringify({
        media: base64Data,
        resourceType: isVideo ? 'video' : 'image',
        folder,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.url) {
        return {
          success: true,
          url: data.url,
          publicId: data.publicId,
          resourceType: isVideo ? 'video' : 'image',
        };
      }
    }
  } catch (srvErr) {
    console.warn('Server media proxy failed:', srvErr);
  }

  // 3. Last-resort fallback for local preview: base64 data URL
  if (fileOrBase64 instanceof File) {
    try {
      const fallbackDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(fileOrBase64);
      });
      return {
        success: true,
        url: fallbackDataUrl,
        resourceType: isVideo ? 'video' : 'image',
      };
    } catch {
      // fallback failed
    }
  }

  return {
    success: false,
    url: '',
    error: 'वीडियो/फोटो अपलोड करने में विफलता आई। कृपया फाइल साइज या इंटरनेट कनेक्शन जांचें।',
  };
}

/**
 * Backwards compatibility alias for image uploads
 */
export async function uploadImageToCloudinary(
  fileOrBase64: File | string,
  folder = 'durga_puja_2026'
): Promise<UploadResult> {
  return uploadMediaToCloudinary(fileOrBase64, 'image', folder);
}
