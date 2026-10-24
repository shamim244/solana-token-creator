"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Button } from "../../ui/button";
import {
  Upload,
  X,
  Link as LinkIcon,
  Image as ImageIcon,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface StepDetailsProps {
  data: {
    name: string;
    symbol: string;
    decimals: number;
    supply: string;
    description: string;
    imageUrl: string;
    imageFile: File | null;
  };
  onChange: (fields: Partial<StepDetailsProps["data"]>) => void;
  onNext: () => void;
}

export function StepDetails({ data, onChange, onNext }: StepDetailsProps) {
  const [useUrl, setUseUrl] = useState(
    Boolean(data.imageUrl && !data.imageFile)
  );
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be under 5MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    onChange({ imageFile: file, imageUrl: previewUrl });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveImage = () => {
    onChange({ imageFile: null, imageUrl: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleContinue = () => {
    if (!data.name.trim()) {
      toast.error("Token name is required");
      return;
    }
    if (!data.symbol.trim()) {
      toast.error("Token symbol is required");
      return;
    }
    if (!data.supply.trim() || Number(data.supply) <= 0) {
      toast.error("Please enter a valid supply greater than 0");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Token Essentials</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Define your token identity, initial supply, and logo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Token Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>
              Token Name <span className="text-amber-500">*</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              {data.name.length}/32
            </span>
          </label>
          <Input
            value={data.name}
            maxLength={32}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Solana Velocity"
            className="font-medium"
          />
        </div>

        {/* Token Symbol */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>
              Symbol / Ticker <span className="text-amber-500">*</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              {data.symbol.length}/10
            </span>
          </label>
          <Input
            value={data.symbol}
            maxLength={10}
            onChange={(e) => onChange({ symbol: e.target.value.toUpperCase() })}
            placeholder="e.g. VELO"
            className="font-mono font-bold uppercase"
          />
        </div>

        {/* Decimals Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>
              Decimals <span className="text-amber-500">*</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              Standard: 6 or 9
            </span>
          </label>
          <div className="flex gap-2">
            {[6, 9].map((dec) => (
              <button
                key={dec}
                type="button"
                onClick={() => onChange({ decimals: dec })}
                className={`flex-1 cursor-pointer rounded-lg border py-2 text-xs font-semibold transition-all ${
                  data.decimals === dec
                    ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary/60"
                }`}
              >
                {dec} Decimals {dec === 6 ? "(Raydium/Meme)" : "(Solana SPL)"}
              </button>
            ))}
          </div>
        </div>

        {/* Total Supply with Presets */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Total Supply <span className="text-amber-500">*</span>
          </label>
          <Input
            type="number"
            min="1"
            value={data.supply}
            onChange={(e) => onChange({ supply: e.target.value })}
            placeholder="1000000000"
            className="font-mono"
          />
          <div className="flex gap-1.5 pt-1">
            {["1000000", "100000000", "1000000000"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange({ supply: preset })}
                className="cursor-pointer rounded border border-border/80 bg-secondary/40 px-2 py-0.5 text-[10px] font-mono text-muted-foreground transition hover:border-amber-500 hover:text-amber-400"
              >
                {Number(preset).toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">
          Description{" "}
          <span className="text-[10px] text-muted-foreground font-normal">
            (Optional)
          </span>
        </label>
        <Textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Brief summary of your project or utility..."
          rows={3}
        />
      </div>

      {/* Logo Upload / URL Switch */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">
            Token Logo
          </label>
          <button
            type="button"
            onClick={() => setUseUrl(!useUrl)}
            className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-amber-400 hover:underline"
          >
            {useUrl ? (
              <Upload className="h-3 w-3" />
            ) : (
              <LinkIcon className="h-3 w-3" />
            )}
            {useUrl ? "Upload File instead" : "Paste Image URL instead"}
          </button>
        </div>

        {useUrl ? (
          <Input
            value={data.imageUrl}
            onChange={(e) =>
              onChange({ imageUrl: e.target.value, imageFile: null })
            }
            placeholder="https://example.com/logo.png"
            className="font-mono text-xs"
          />
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center transition-all ${
              dragOver
                ? "border-amber-500 bg-amber-500/5"
                : "border-border hover:border-muted-foreground bg-card/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            {data.imageUrl ? (
              <div className="relative flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.imageUrl}
                  alt="Token Logo Preview"
                  className="h-16 w-16 rounded-xl border border-border object-cover shadow-sm"
                />
                <div className="text-left">
                  <p className="text-xs font-medium text-foreground">
                    Logo selected
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Click to replace
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage();
                    }}
                    className="mt-1 flex items-center gap-1 text-[10px] font-medium text-destructive hover:underline"
                  >
                    <X className="h-3 w-3" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <ImageIcon className="mx-auto h-8 w-8 text-muted" />
                <p className="text-xs font-medium text-foreground">
                  Drag and drop your logo, or{" "}
                  <span className="text-amber-400">browse</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  PNG, JPG, WebP up to 5MB (1000×1000 recommended)
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-3">
        <Button
          onClick={handleContinue}
          variant="amber"
          className="px-6 font-semibold"
        >
          Continue to Socials
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
