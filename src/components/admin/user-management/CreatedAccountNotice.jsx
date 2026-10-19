import { Icon } from "./UserManagementUi";

export default function CreatedAccountNotice({ credentials, copied, handleCopy }) {
  return (
    <>
          {credentials && (
            <div
              className="motion-card animate-pop bg-secondary-container p-space-lg flex flex-col gap-space-sm"
              role="status"
            >
              <div className="flex items-center gap-space-sm">
                <Icon name="key" size={22} />

                <h2 className="text-headline-sm text-on-secondary-container">Cuenta creada</h2>
              </div>

              <p className="text-body-md text-on-secondary-container max-w-prose">
                Comparte esta contraseña temporal con <strong>{credentials.email}</strong>. Se muestra una sola vez y
                deberá cambiarla en su primer acceso.
              </p>

              <p className="text-label-md text-on-secondary-container">
                Número de empleado: <strong>{credentials.employeeId}</strong>
              </p>

              <div className="flex flex-wrap items-center gap-space-sm">
                <code className="flex-1 min-w-48 rounded-lg bg-surface-container-lowest px-space-md py-2.5 text-body-lg font-semibold text-on-surface tracking-wider break-all">
                  {credentials.temporaryPassword}
                </code>

                <button
                  type="button"

                  onClick={handleCopy}

                  className="motion-press inline-flex items-center gap-1 rounded-full bg-secondary text-on-secondary px-space-md py-2.5 text-label-md"
                >
                  <Icon name={copied ? "check" : "content_copy"} size={17} />

                  {copied ? "Copiada" : "Copiar"}
                </button>
              </div>
            </div>
          )}

          {/* Directorio */}


    </>
  );
}
