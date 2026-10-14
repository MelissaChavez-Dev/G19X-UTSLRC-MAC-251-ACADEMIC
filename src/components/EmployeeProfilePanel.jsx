import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useProfiles } from "../hooks/useProfiles";
import { saveEmployeeProfile, uploadProfilePhoto } from "../services/profileService";
import Avatar from "./Avatar";

const inputClass =
  "w-full rounded-lg border border-outline-variant bg-surface-container-low px-space-md py-2.5 text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30";

export default function EmployeeProfilePanel() {
  const { user, profile } = useAuth();
  const { profiles } = useProfiles(user?.uid ? [user.uid] : []);
  const [displayName, setDisplayName] = useState(profile?.displayName || user?.displayName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const publicProfile = profiles[user?.uid] || {};

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await saveEmployeeProfile({ displayName, phone });
      setNotice("Tus datos personales se actualizaron.");
    } catch (saveError) {
      console.error("No se pudo actualizar el perfil del colaborador:", saveError);
      setError(saveError.message || "No se pudieron guardar tus datos.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user?.uid) return;

    setUploading(true);
    setError("");
    setNotice("");
    try {
      await uploadProfilePhoto(user.uid, file, displayName);
      setNotice("Tu foto de perfil se actualizó.");
    } catch (uploadError) {
      console.error("No se pudo actualizar la foto del colaborador:", uploadError);
      setError(uploadError.message || "No se pudo subir la foto.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg">
      <div>
        <h2 className="text-headline-sm text-on-surface">Mi perfil</h2>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Actualiza tu nombre visible, teléfono y foto para que tus compañeros te reconozcan.
        </p>
      </div>

      <div className="flex items-center gap-space-md">
        <Avatar
          name={displayName}
          photoURL={publicProfile.photoURL}
          size={72}
          className="text-headline-sm"
        />
        <div className="flex flex-col gap-space-xs">
          <p className="text-label-md font-semibold text-on-surface">{displayName || "Colaborador"}</p>
          <label className="motion-press inline-flex w-fit cursor-pointer items-center gap-space-xs rounded-full bg-surface-container-low px-space-md py-2 text-label-md text-primary hover:bg-surface-container">
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            {uploading ? "Subiendo..." : "Cambiar foto"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={handlePhotoChange}
              aria-label="Subir foto de perfil"
            />
          </label>
          <span className="text-label-sm text-on-surface-variant">JPG, PNG o WebP · máximo 5 MB</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-space-sm">
        <label className="flex flex-col gap-space-xs text-label-md text-on-surface" htmlFor="employee-profile-name">
          Nombre visible
          <input
            id="employee-profile-name"
            className={inputClass}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={100}
            required
          />
        </label>
        <label className="flex flex-col gap-space-xs text-label-md text-on-surface" htmlFor="employee-profile-phone">
          Teléfono
          <input
            id="employee-profile-phone"
            className={inputClass}
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            maxLength={30}
            placeholder="Opcional"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-space-sm border-t border-outline-variant pt-space-sm">
          <span className="text-label-sm text-on-surface-variant">
            El puesto, departamento y fecha de ingreso los administra RH.
          </span>
          <button
            type="submit"
            disabled={saving || uploading}
            className="motion-press inline-flex items-center gap-space-xs rounded-full bg-primary px-space-md py-2 text-label-md font-semibold text-on-primary disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar datos"}
          </button>
        </div>
      </form>

      {error && <p role="alert" className="rounded-lg bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-success-container px-space-md py-space-sm text-body-sm text-on-success-container">{notice}</p>}
    </section>
  );
}
