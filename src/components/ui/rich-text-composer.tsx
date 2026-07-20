"use client";

import {
  AtSign,
  Bold,
  Code2,
  Eye,
  EyeOff,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  MessageSquareQuote,
  Minimize2,
  Smile,
  Strikethrough,
  Underline
} from "lucide-react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";

export type RichTextCommand =
  | "bold"
  | "code"
  | "italic"
  | "link"
  | "ordered-list"
  | "quote"
  | "strike"
  | "underline"
  | "unordered-list";

type SelectionResult = {
  selectionEnd: number;
  selectionStart: number;
  value: string;
};

type RichTextComposerProps = {
  ariaLabel: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  helperText?: string;
  id?: string;
  maxLength?: number;
  name?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  toolbarVariant?: "full" | "task-note";
  value: string;
};

type RichTextContentProps = {
  className?: string;
  value: string;
};

const EMOJI_OPTIONS = [
  "\u{1F44D}",
  "\u{2705}",
  "\u{1F4CC}",
  "\u{1F6A8}",
  "\u{1F4DE}",
  "\u{1F4C4}",
  "\u{1F697}",
  "\u{1F64F}"
];

const INLINE_TOKEN_PATTERN = /(\*\*[^*\n]+\*\*|_[^_\n]+_|~~[^~\n]+~~|\+\+[^+\n]+\+\+|`[^`\n]+`|\[[^\]\n]+\]\((?:https?:\/\/|mailto:)[^)\s]+\)|@[A-Za-z0-9._-]+)/g;

function wrapSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  suffix: string,
  placeholder: string
): SelectionResult {
  const selected = value.slice(selectionStart, selectionEnd);
  const content = selected || placeholder;
  const nextValue = `${value.slice(0, selectionStart)}${prefix}${content}${suffix}${value.slice(selectionEnd)}`;
  const contentStart = selectionStart + prefix.length;

  return {
    value: nextValue,
    selectionStart: contentStart,
    selectionEnd: contentStart + content.length
  };
}

function prefixSelectedLines(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefixForIndex: (index: number) => string
): SelectionResult {
  const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const nextLineBreak = value.indexOf("\n", selectionEnd);
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  const selectedBlock = value.slice(lineStart, lineEnd) || "List item";
  const nextBlock = selectedBlock
    .split("\n")
    .map((line, index) => `${prefixForIndex(index)}${line}`)
    .join("\n");

  return {
    value: `${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd)}`,
    selectionStart: lineStart,
    selectionEnd: lineStart + nextBlock.length
  };
}

export function applyRichTextCommand(
  value: string,
  command: RichTextCommand,
  selectionStart: number,
  selectionEnd: number
): SelectionResult {
  switch (command) {
    case "bold":
      return wrapSelection(value, selectionStart, selectionEnd, "**", "**", "bold text");
    case "italic":
      return wrapSelection(value, selectionStart, selectionEnd, "_", "_", "italic text");
    case "underline":
      return wrapSelection(value, selectionStart, selectionEnd, "++", "++", "underlined text");
    case "strike":
      return wrapSelection(value, selectionStart, selectionEnd, "~~", "~~", "struck text");
    case "code":
      return wrapSelection(value, selectionStart, selectionEnd, "`", "`", "code");
    case "link":
      return wrapSelection(value, selectionStart, selectionEnd, "[", "](https://)", "link text");
    case "quote":
      return prefixSelectedLines(value, selectionStart, selectionEnd, () => "> ");
    case "ordered-list":
      return prefixSelectedLines(value, selectionStart, selectionEnd, (index) => `${index + 1}. `);
    case "unordered-list":
      return prefixSelectedLines(value, selectionStart, selectionEnd, () => "- ");
  }
}

function parseInlineContent(value: string): ReactNode[] {
  const parts = value.split(INLINE_TOKEN_PATTERN);

  return parts.filter(Boolean).map((part, index) => {
    const key = `${index}-${part.slice(0, 12)}`;

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("++") && part.endsWith("++")) {
      return <u key={key}>{part.slice(2, -2)}</u>;
    }
    if (part.startsWith("~~") && part.endsWith("~~")) {
      return <s key={key}>{part.slice(2, -2)}</s>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("[")) {
      const match = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)]+)\)$/);
      if (match) {
        return <a href={match[2]} key={key} rel="noreferrer" target="_blank">{match[1]}</a>;
      }
    }
    if (part.startsWith("@")) {
      return <span className="rich-text-mention" key={key}>{part}</span>;
    }

    return part;
  });
}

export function RichTextContent({ className, value }: RichTextContentProps) {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index];

    if (!line.trim()) {
      blocks.push(<span className="rich-text-spacer" key={`space-${index}`} />);
      index += 1;
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^-\s+/.test(lines[index])) {
        items.push(<li key={`bullet-${index}`}>{parseInlineContent(lines[index].replace(/^-\s+/, ""))}</li>);
        index += 1;
      }
      blocks.push(<ul key={`ul-${index}`}>{items}</ul>);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(<li key={`ordered-${index}`}>{parseInlineContent(lines[index].replace(/^\d+\.\s+/, ""))}</li>);
        index += 1;
      }
      blocks.push(<ol key={`ol-${index}`}>{items}</ol>);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(<blockquote key={`quote-${index}`}>{quoteLines.map((quoteLine, quoteIndex) => <p key={quoteIndex}>{parseInlineContent(quoteLine)}</p>)}</blockquote>);
      continue;
    }

    blocks.push(<p key={`paragraph-${index}`}>{parseInlineContent(line)}</p>);
    index += 1;
  }

  return <div className={["rich-text-content", className].filter(Boolean).join(" ")}>{blocks}</div>;
}

export function RichTextComposer({
  ariaLabel,
  className,
  compact = false,
  disabled = false,
  helperText = "Formatting, lists, links, mentions, and emoji are supported.",
  id,
  maxLength = 2000,
  name,
  onChange,
  placeholder,
  required = false,
  rows = 4,
  toolbarVariant = "full",
  value
}: RichTextComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectionRef = useRef({ start: value.length, end: value.length });
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || expanded) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 82), 260)}px`;
  }, [expanded, value]);

  function commitSelection(result: SelectionResult) {
    if (result.value.length > maxLength) {
      return;
    }

    onChange(result.value);
    selectionRef.current = { start: result.selectionStart, end: result.selectionEnd };
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  function runCommand(command: RichTextCommand) {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? selectionRef.current.start;
    const selectionEnd = textarea?.selectionEnd ?? selectionRef.current.end;
    commitSelection(applyRichTextCommand(value, command, selectionStart, selectionEnd));
  }

  function insertText(text: string) {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? selectionRef.current.start;
    const selectionEnd = textarea?.selectionEnd ?? selectionRef.current.end;
    const nextValue = `${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`;
    commitSelection({
      value: nextValue,
      selectionStart: selectionStart + text.length,
      selectionEnd: selectionStart + text.length
    });
  }

  function preserveSelection(event: PointerEvent<HTMLButtonElement>) {
    const textarea = textareaRef.current;
    if (textarea) {
      selectionRef.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      };
    }
    event.preventDefault();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }

    const shortcut = event.key.toLowerCase();
    if (shortcut === "b" || shortcut === "i" || shortcut === "u") {
      event.preventDefault();
      runCommand(shortcut === "b" ? "bold" : shortcut === "i" ? "italic" : "underline");
    }
  }

  const buttons: Array<{ command: RichTextCommand; icon: ReactNode; label: string; shortcut?: string }> = [
    { command: "bold", icon: <Bold size={16} />, label: "Bold", shortcut: "Ctrl+B" },
    { command: "italic", icon: <Italic size={16} />, label: "Italic", shortcut: "Ctrl+I" },
    { command: "underline", icon: <Underline size={16} />, label: "Underline", shortcut: "Ctrl+U" },
    { command: "strike", icon: <Strikethrough size={16} />, label: "Strikethrough" },
    { command: "unordered-list", icon: <List size={16} />, label: "Bulleted list" },
    { command: "ordered-list", icon: <ListOrdered size={16} />, label: "Numbered list" },
    { command: "quote", icon: <MessageSquareQuote size={16} />, label: "Quote" },
    { command: "code", icon: <Code2 size={16} />, label: "Inline code" },
    { command: "link", icon: <Link2 size={16} />, label: "Add link" }
  ];
  const visibleButtons = toolbarVariant === "task-note"
    ? buttons.filter((button) => button.command === "bold" || button.command === "unordered-list" || button.command === "link")
    : buttons;

  return (
    <div className={["rich-text-composer", compact ? "rich-text-composer-compact" : "", expanded ? "rich-text-composer-expanded" : "", className].filter(Boolean).join(" ")}>
      {previewOpen ? (
        <div aria-label="Formatted comment preview" className="rich-text-preview"><RichTextContent value={value} /></div>
      ) : (
        <textarea
          aria-label={ariaLabel}
          disabled={disabled}
          id={id}
          maxLength={maxLength}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => {
            selectionRef.current = {
              start: event.currentTarget.selectionStart,
              end: event.currentTarget.selectionEnd
            };
          }}
          onKeyDown={handleKeyDown}
          onSelect={(event) => {
            selectionRef.current = {
              start: event.currentTarget.selectionStart,
              end: event.currentTarget.selectionEnd
            };
          }}
          placeholder={placeholder}
          ref={textareaRef}
          required={required}
          rows={rows}
          value={value}
        />
      )}

      <div aria-label="Comment formatting" className={`rich-text-toolbar rich-text-toolbar-${toolbarVariant}`} role="toolbar">
        {visibleButtons.map((button) => (
          <button
            aria-label={button.label}
            disabled={disabled || previewOpen}
            key={button.command}
            onClick={() => runCommand(button.command)}
            onPointerDown={preserveSelection}
            title={button.shortcut ? `${button.label} (${button.shortcut})` : button.label}
            type="button"
          >
            {button.icon}
            {toolbarVariant === "task-note" ? <span>{button.command === "unordered-list" ? "Bullets" : button.label}</span> : null}
          </button>
        ))}
        <span className="rich-text-toolbar-divider" />
        <button aria-label="Mention someone" disabled={disabled || previewOpen} onClick={() => insertText("@")} onPointerDown={preserveSelection} title="Mention someone" type="button"><AtSign size={16} />{toolbarVariant === "task-note" ? <span>Mention</span> : null}</button>
        <button aria-expanded={emojiOpen} aria-label="Add emoji" disabled={disabled || previewOpen} onClick={() => setEmojiOpen((current) => !current)} onPointerDown={preserveSelection} title="Add emoji" type="button"><Smile size={16} />{toolbarVariant === "task-note" ? <span>Emoji</span> : null}</button>
        {toolbarVariant === "full" ? <button aria-label={expanded ? "Collapse comment editor" : "Expand comment editor"} disabled={disabled || previewOpen} onClick={() => setExpanded((current) => !current)} onPointerDown={preserveSelection} title={expanded ? "Collapse editor" : "Expand editor"} type="button">{expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button> : null}
        {toolbarVariant === "full" ? <button aria-label={previewOpen ? "Edit comment" : "Preview comment"} className="rich-text-preview-toggle" disabled={disabled || !value.trim()} onClick={() => setPreviewOpen((current) => !current)} onPointerDown={preserveSelection} title={previewOpen ? "Return to editing" : "Preview formatting"} type="button">{previewOpen ? <EyeOff size={16} /> : <Eye size={16} />}</button> : null}
      </div>

      {emojiOpen && !previewOpen ? (
        <div aria-label="Emoji choices" className="rich-text-emoji-menu" role="menu">
          {EMOJI_OPTIONS.map((emoji) => <button aria-label={`Insert ${emoji}`} key={emoji} onClick={() => { insertText(emoji); setEmojiOpen(false); }} onPointerDown={preserveSelection} type="button">{emoji}</button>)}
        </div>
      ) : null}

      <div className="rich-text-composer-footer">
        <span>{helperText}</span>
        <span>{value.length}/{maxLength}</span>
      </div>
    </div>
  );
}
