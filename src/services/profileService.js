import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db } from "./firebaseFirestore";
import { storage } from "./firebaseStorage";
import { updateEmployeeProfile } from "./userService";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function saveEmployeeProfile({ displayName, phone }) {
  const normalizedName = displayName.trim();
  if (!normalizedName) throw new Error("El nombre no puede quedar vacío.");
  if (normalizedName.length > 100) throw new Error("El nombre no puede superar 100 caracteres.");
  if (phone.length > 30) throw new Error("El teléfono no puede superar 30 caracteres.");
  return updateEmployeeProfile({ displayName: normalizedName, phone: phone.trim() });
}

export async function uploadProfilePhoto(userId, file, displayName = "") {
  if (!file || !ACCEPTED_PHOTO_TYPES.has(file.type)) {
    throw new Error("Selecciona una imagen JPG, PNG o WebP.");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("La foto no puede superar 5 MB.");
  }

  const profileRef = doc(db, "publicProfiles", userId);
  const photoRef = ref(storage, `profile-photos/${userId}/avatar`);
  await uploadBytes(photoRef, file, { contentType: file.type });
  const photoURL = await getDownloadURL(photoRef);

  await setDoc(profileRef, {
    displayName: displayName.trim().slice(0, 100),
    photoURL,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return photoURL;
}
