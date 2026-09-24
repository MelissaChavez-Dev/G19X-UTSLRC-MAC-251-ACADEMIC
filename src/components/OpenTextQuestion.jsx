export default function OpenTextQuestion({ value, onChange }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      placeholder="Escribe aquí (opcional)..."
      className="w-full rounded-md border border-outline-variant bg-surface-container-lowest p-4 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  );
}