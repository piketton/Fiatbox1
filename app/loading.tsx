export default function Loading() {
  return (
    <div className="min-h-screen bg-[#eef4fb] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <p className="text-[#1a56a0] text-lg font-semibold">Loading…</p>
        <div className="w-10 h-10 border-4 border-[#c9d9ee] border-t-[#1a56a0] rounded-full animate-spin"></div>
      </div>
    </div>
  );
}
