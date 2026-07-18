/** FluxWork wordmark — teal mark with a serif "F" and a brass underline. */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span
        className="relative flex-none rounded-[9px] bg-accent"
        style={{ width: 32, height: 32 }}
        aria-hidden
      >
        <span className="serif absolute inset-0 flex items-center justify-center text-paper" style={{ fontSize: 18, top: -1 }}>
          F
        </span>
        <span
          className="absolute rounded-[2px] bg-d-brass"
          style={{ left: 6, right: 6, bottom: 6, height: 2 }}
        />
      </span>
      {!compact && <span className="text-[1.05rem]">FluxWork</span>}
    </span>
  );
}
