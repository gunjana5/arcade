"use client";

export function ThinkingIndicator({ isThinking }: { isThinking: boolean }) {
  // parent flips isThinking around ai fetch - hide when idle
  if (!isThinking) return null;
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="flex items-center gap-1.5" aria-hidden>
        {/* delays are in globals.css (.think-dot--N) */}
        <span className="think-dot think-dot--0" />
        <span className="think-dot think-dot--1" />
        <span className="think-dot think-dot--2" />
      </div>
      <span className="font-vt text-xl text-neon-cyan tracking-widest">AI THINKING...</span>
    </div>
  );
}
