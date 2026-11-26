import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { drawerBridge } from '@/messaging/drawer-bridge';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback 1: execCommand inside iframe
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      if (ok) return true;
    } catch {
      // Fall through to host-page bridge fallback
    }

    // Fallback 2: copy via host page content script when iframe Permissions-Policy blocks clipboard
    if (drawerBridge.isEmbedded()) {
      const res = await drawerBridge.send({ type: 'COPY_TEXT', text });
      return res.ok;
    }
    return false;
  }
}

export function CopyButton({ text, label, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied' : `Copy ${label ?? text}`}
      className={`fw-btn fw-btn-secondary fw-btn-sm ${className}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-[var(--fw-positive)]" strokeWidth={1.5} />
      ) : (
        <Copy className="h-3.5 w-3.5 text-[var(--fw-text-muted)]" strokeWidth={1.5} />
      )}
      {label && <span>{copied ? 'Copied' : label}</span>}
    </button>
  );
}
