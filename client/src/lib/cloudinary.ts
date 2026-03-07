export const CLOUDINARY_UPLOAD_PRESET = "invoice-generator";
export const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dhbwpnsc4/image/upload";

export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  return data.secure_url;
}