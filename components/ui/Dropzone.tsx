"use client";

import { useCallback, useRef, useState } from "react";
import { UploadIcon } from "@/components/icons";

export function Dropzone({
  onFiles,
  multiple = false,
  accept = ".pdf,.png,.jpg,.jpeg",
  title = "Drag & drop your file here",
  hint = "Supports PDF, PNG, JPG (Max 10MB)",
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  title?: string;
  hint?: string;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      onFiles(Array.from(fileList));
    },
    [onFiles]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        isDragOver
          ? "border-primary bg-primary-soft/40"
          : "border-border bg-bg-sunken hover:border-primary/50 hover:bg-surface-hover"
      }`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        <UploadIcon size={26} />
      </div>
      <div>
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="mt-1 text-xs text-text-faint">or</p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
        className="btn-primary btn-sm"
      >
        Choose {multiple ? "Files" : "File"}
      </button>
      <p className="text-xs text-text-faint">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
