"use client";

import { useState } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import {
  Globe,
  Send,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface StepSocialsProps {
  data: {
    website: string;
    twitter: string;
    telegram: string;
    discord: string;
    tags: string[];
  };
  onChange: (fields: Partial<StepSocialsProps["data"]>) => void;
  onNext: () => void;
  onBack: () => void;
}

const PRESET_TAGS = [
  "Meme",
  "AI",
  "DeFi",
  "Gaming",
  "Solana",
  "NFT",
  "Utility",
  "Community",
];

export function StepSocials({
  data,
  onChange,
  onNext,
  onBack,
}: StepSocialsProps) {
  const [customTag, setCustomTag] = useState("");

  const handleAddTag = (tagToAdd: string) => {
    const cleanTag = tagToAdd.trim().replace(/^#/, "");
    if (!cleanTag) return;
    if (data.tags.includes(cleanTag)) {
      toast.info("Tag already added");
      return;
    }
    if (data.tags.length >= 8) {
      toast.error("Maximum 8 tags allowed");
      return;
    }
    onChange({ tags: [...data.tags, cleanTag] });
    setCustomTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange({ tags: data.tags.filter((t) => t !== tagToRemove) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">
          Social Links & Community Tags
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Include your project channels. DEX platforms like DexScreener &
          Birdeye index these directly from on-chain metadata.
        </p>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        {/* Website */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-emerald-400" />
            <span>Website</span>
          </label>
          <Input
            value={data.website}
            onChange={(e) => onChange({ website: e.target.value })}
            placeholder="https://yourwebsite.com"
          />
        </div>

        {/* Twitter */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <span className="font-bold text-sky-400">𝕏</span>
            <span>Twitter / X</span>
          </label>
          <Input
            value={data.twitter}
            onChange={(e) => onChange({ twitter: e.target.value })}
            placeholder="https://x.com/yourhandle"
          />
        </div>

        {/* Telegram */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-cyan-400" />
            <span>Telegram</span>
          </label>
          <Input
            value={data.telegram}
            onChange={(e) => onChange({ telegram: e.target.value })}
            placeholder="https://t.me/yourgroup"
          />
        </div>

        {/* Discord */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5 text-indigo-400" />
            <span>Discord</span>
          </label>
          <Input
            value={data.discord}
            onChange={(e) => onChange({ discord: e.target.value })}
            placeholder="https://discord.gg/invite"
          />
        </div>
      </div>

      {/* Tags section */}
      <div className="space-y-2 border-t border-border/60 pt-4">
        <label className="text-xs font-semibold text-foreground">
          Project Tags
        </label>
        <p className="text-[11px] text-muted-foreground">
          Click to add standard category tags, or type a custom tag below.
        </p>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-1.5">
          {PRESET_TAGS.map((tag) => {
            const isSelected = data.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  isSelected ? handleRemoveTag(tag) : handleAddTag(tag)
                }
                className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-500/15 text-amber-400 shadow-xs"
                    : "border-border bg-card hover:bg-secondary/70 text-muted-foreground"
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>

        {/* Custom Tag input */}
        <div className="flex gap-2 pt-1.5">
          <Input
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag(customTag);
              }
            }}
            placeholder="Add custom tag (e.g. Meta)"
            className="h-9 max-w-xs text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddTag(customTag)}
            className="h-9 gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Tag
          </Button>
        </div>

        {/* Selected Tags list */}
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs text-amber-300"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="cursor-pointer hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between border-t border-border/60 pt-4">
        <Button onClick={onBack} variant="outline" className="gap-1.5 text-xs">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          variant="amber"
          className="px-6 font-semibold gap-1.5"
        >
          Continue to Authorities
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
