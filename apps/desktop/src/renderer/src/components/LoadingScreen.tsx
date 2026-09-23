export function LoadingScreen({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-neutral-500">{label}</div>
  );
}
