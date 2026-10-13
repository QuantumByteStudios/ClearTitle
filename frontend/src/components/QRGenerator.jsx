import React from "react";
import { QRCodeSVG } from "qrcode.react";

export function QRGenerator({ value, size = 180 }) {
  if (!value) return null;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-inner border border-zinc-200 inline-block">
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        includeMargin={true}
      />
      <span className="text-[10px] text-zinc-500 font-mono mt-2 tracking-tight">
        Scan to Verify On-Chain
      </span>
    </div>
  );
}

