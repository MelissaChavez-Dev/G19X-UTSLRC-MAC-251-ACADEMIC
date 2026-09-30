export default function LoadingScreen({ message = "Cargando..." }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-space-md bg-surface">
      <div className="w-12 h-12 rounded-full bg-primary-container animate-ambient" />
      <p className="text-body-md text-on-surface-variant">{message}</p>
    </div>
  );
}
