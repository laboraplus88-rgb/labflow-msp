"use client";

import { useState } from "react";
import { Eye, EyeOff, RefreshCw, Copy } from "lucide-react";

export function generatePassword(length = 12) {
  const sets = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
    "!@#$%&*?",
  ];
  const all = sets.join("");
  const rand = (max: number) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % max;
  };

  // Garantiza al menos un carácter de cada tipo
  const chars = sets.map((s) => s[rand(s.length)]);
  while (chars.length < length) chars.push(all[rand(all.length)]);

  // Mezcla
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function PasswordField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [mode, setMode] = useState<"auto" | "custom">("auto");
  const [show, setShow] = useState(false);

  const setAuto = () => {
    setMode("auto");
    onChange(generatePassword());
    setShow(true);
  };

  const setCustom = () => {
    setMode("custom");
    onChange("");
    setShow(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Contraseña *</label>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={setAuto}
          className={`rounded-md border px-3 py-1 ${
            mode === "auto" ? "bg-teal-700 text-white" : ""
          }`}
        >
          Generar automática
        </button>
        <button
          type="button"
          onClick={setCustom}
          className={`rounded-md border px-3 py-1 ${
            mode === "custom" ? "bg-teal-700 text-white" : ""
          }`}
        >
          Personalizada
        </button>
      </div>

      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={mode === "auto"}
          placeholder="Mínimo 8 caracteres"
          className="w-full rounded-md border px-3 py-2 pr-28"
        />
        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
          {mode === "auto" && (
            <button
              type="button"
              title="Regenerar"
              onClick={() => onChange(generatePassword())}
            >
              <RefreshCw size={16} />
            </button>
          )}
          <button
            type="button"
            title="Copiar"
            onClick={() => navigator.clipboard.writeText(value)}
          >
            <Copy size={16} />
          </button>
          <button
            type="button"
            title="Mostrar/ocultar"
            onClick={() => setShow((s) => !s)}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Cópiela y entréguela al usuario: no se podrá volver a ver después de
        guardar.
      </p>
    </div>
  );
}
