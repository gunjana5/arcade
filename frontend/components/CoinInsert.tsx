"use client";

// drag (or tap-arm) a coin into a cabinet slot to open that game
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// custom mime so random text drops dont count as a coin
const COIN_MIME = "application/x-arcade-coin";

type CoinCtx = {
  armed: boolean;
  arm: () => void;
  disarm: () => void;
};

const Ctx = createContext<CoinCtx | null>(null);

export function CoinProvider({ children }: { children: ReactNode }) {
  // armed = touch path: tap coin then tap a slot
  const [armed, setArmed] = useState(false);

  const arm = useCallback(() => setArmed(true), []);
  const disarm = useCallback(() => setArmed(false), []);

  useEffect(() => {
    if (!armed) return undefined;
    // escape / click-away clears the armed coin
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setArmed(false);
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("[data-coin], [data-coin-slot]")) return;
      setArmed(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [armed]);

  return <Ctx.Provider value={{ armed, arm, disarm }}>{children}</Ctx.Provider>;
}

function useCoin() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("CoinProvider missing");
  return ctx;
}

export function ArcadeCoin() {
  const { armed, arm, disarm } = useCoin();

  return (
    <button
      type="button"
      data-coin
      draggable
      aria-pressed={armed}
      aria-label={armed ? "coin ready - tap a cabinet slot" : "drag or tap coin to insert"}
      className={`arcade-coin ${armed ? "is-armed" : ""}`}
      onDragStart={(e) => {
        // text/plain backup - safari is flaky with custom mime types
        e.dataTransfer.setData(COIN_MIME, "1");
        e.dataTransfer.setData("text/plain", "coin");
        e.dataTransfer.effectAllowed = "copy";
        disarm();
      }}
      onClick={(e) => {
        e.stopPropagation();
        // second tap on the coin cancels
        if (armed) disarm();
        else arm();
      }}
    >
      <Image
        src="/icons/coin.svg"
        alt=""
        width={56}
        height={56}
        unoptimized
        draggable={false}
        style={{ imageRendering: "pixelated" }}
      />
      <span className="arcade-coin-label">{armed ? "READY" : "COIN"}</span>
    </button>
  );
}

export function CoinSlot({ gameId, label }: { gameId: string; label: string }) {
  const router = useRouter();
  const { armed, disarm } = useCoin();
  const [flash, setFlash] = useState(false);
  const [over, setOver] = useState(false);

  const insert = useCallback(() => {
    // green flash then navigate so the drop feels like it landed
    setFlash(true);
    disarm();
    window.setTimeout(() => {
      router.push(`/games/${gameId}`);
    }, 280);
  }, [disarm, gameId, router]);

  return (
    <button
      type="button"
      data-coin-slot
      aria-label={`insert coin for ${label}`}
      className={`arcade-coin-slot ${over ? "is-over" : ""} ${flash ? "is-flash" : ""} ${armed ? "is-armed-target" : ""}`}
      onDragOver={(e) => {
        // without preventDefault the browser refuses the drop
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        const types = Array.from(e.dataTransfer.types);
        const payload = e.dataTransfer.getData(COIN_MIME) || e.dataTransfer.getData("text/plain");
        if (payload === "1" || payload === "coin" || types.includes(COIN_MIME)) {
          insert();
        }
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // touch: only when coin is armed
        if (armed) insert();
      }}
      onKeyDown={(e) => {
        // keyboard users can activate the slot without dragging
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          insert();
        }
      }}
    >
      <span className="arcade-coin-slot-well" aria-hidden />
      <span className="arcade-coin-slot-text">INSERT</span>
    </button>
  );
}
