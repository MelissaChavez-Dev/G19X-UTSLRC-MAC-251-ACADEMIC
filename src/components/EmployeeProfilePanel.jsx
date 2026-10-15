import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useProfiles } from "../hooks/useProfiles";
import { saveEmployeeProfile, uploadProfilePhoto } from "../services/profileService";
import Avatar from "./Avatar";
import { Card, fieldClass, Icon, Notice, SectionHeader } from "./EmployeeUi";

function formatHireDate(value) {
  if (!value) return "Sin registrar";
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value.toDate?.();
  if (!date || Number.isNaN(date.getTime())) return "Sin registrar";
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

function ReadOnlyRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-space-sm py-space-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <dt className="text-label-sm text-on-surface-variant">{label}</dt>
        <dd className="truncate text-body-md text-on-surface">{value}</dd>
      </div>
    </div>
  );
}

export default function EmployeeProfilePanel() {
  const { user, profile } = useAuth();
  const { profiles } = useProfiles(user?.uid ? [user.uid] : []);
  const [draft, setDraft] = useState({});
  const [baseline, setBaseline] = useState(null); // valores guardados en esta sesión
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const publicProfile = profiles[user?.uid] || {};

  const current = baseline ?? {
    displayName: profile?.displayName || user?.displayName || "",
    phone: profile?.phone || "",
  };
  const displayName = draft.displayName ?? current.displayName;
  const phone = draft.phone ?? current.phone;
  const dirty = displayName.trim() !== current.displayName || phone.trim() !== current.phone;

  async function handleSave(event) {
    event.preventDefault();
    const next = { displayName: displayName.trim(), phone: phone.trim() };
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await saveEmployeeProfile(next);
      setBaseline(next);
      setDraft({});
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
    <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* Identidad y datos de RH */}
      <div className="flex flex-col gap-space-md">
        <Card className="flex flex-col items-center gap-space-sm text-center">
          <Avatar name={displayName} photoURL={publicProfile.photoURL} size={96} className="text-headline-md" />
          <div className="min-w-0">
            <p className="text-headline-sm text-on-surface">{displayName || "Colaborador"}</p>
            {user?.email && <p className="truncate text-body-sm text-on-surface-variant">{user.email}</p>}
          </div>
          <label className="motion-press inline-flex cursor-pointer items-center gap-space-xs rounded-full bg-primary-container px-space-md py-2 text-label-md font-semibold text-on-primary-container hover:brightness-95 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
            <Icon name="photo_camera" size={18} />
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
          <span className="text-label-sm text-on-surface-variant">JPG, PNG o WebP, máximo 5 MB</span>
        </Card>

        <Card>
          <h3 className="text-label-lg font-semibold text-on-surface">Datos administrados por RH</h3>
          <dl className="mt-space-xs divide-y divide-outline-variant/60">
            <ReadOnlyRow icon="mail" label="Correo" value={user?.email || "Sin registrar"} />
            <ReadOnlyRow icon="event" label="Fecha de ingreso" value={formatHireDate(profile?.hireDate)} />
          </dl>
          <p className="mt-space-xs text-label-sm text-on-surface-variant">
            El puesto, el departamento y la fecha de ingreso solo los modifica RH.
          </p>
        </Card>
      </div>

      {/* Formulario */}
      <Card className="flex max-w-3xl flex-col gap-space-md">
        <SectionHeader
          title="Datos personales"
          description="Tu nombre y teléfono son visibles para tus compañeros de proyecto."
        />

        <form onSubmit={handleSave} className="flex flex-col gap-space-md">
          <label className="flex flex-col gap-space-xs text-label-md text-on-surface" htmlFor="employee-profile-name">
            Nombre visible
            <input
              id="employee-profile-name"
              className={fieldClass}
              value={displayName}
              onChange={(event) => setDraft((value) => ({ ...value, displayName: event.target.value }))}
              maxLength={100}
              required
            />
          </label>
          <label className="flex flex-col gap-space-xs text-label-md text-on-surface" htmlFor="employee-profile-phone">
            Teléfono
            <input
              id="employee-profile-phone"
              className={fieldClass}
              type="tel"
              value={phone}
              onChange={(event) => setDraft((value) => ({ ...value, phone: event.target.value }))}
              maxLength={30}
              placeholder="Opcional"
            />
          </label>

          <div className="flex flex-wrap items-center justify-end gap-space-sm border-t border-outline-variant/60 pt-space-md">
            {dirty && !saving && (
              <button
                type="button"
                onClick={() => setDraft({})}
                className="motion-press rounded-full px-space-md py-2 text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low"
              >
                Descartar cambios
              </button>
            )}
            <button
              type="submit"
              disabled={!dirty || saving || uploading}
              className="motion-press inline-flex items-center gap-space-xs rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>

        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="success">{notice}</Notice>}
      </Card>
    </div>
  );
}