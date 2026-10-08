"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/client";

interface Props {
  title: string;
  setTitle: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  titlePlaceholder?: string;
  /** 隐藏标题输入框（回帖场景）。 */
  hideTitle?: boolean;
}

/** Markdown 编辑器：标题输入 + 正文 textarea + 图片插入工具栏。 */
export function Editor({ title, setTitle, body, setBody, titlePlaceholder = "标题", hideTitle }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  function insertAtCursor(snippet: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setBody(body + snippet);
      return;
    }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const next = body.slice(0, start) + snippet + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await api<{ url: string }>("/api/upload", { method: "POST", body: fd });
      insertAtCursor(`![${file.name}](${data.url})`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {!hideTitle && (
        <div className="form-field">
          <input
            className="input"
            placeholder={titlePlaceholder}
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      )}
      <div className="form-field">
        <div className="btn-row" style={{ marginBottom: 8 }}>
          <button
            type="button"
            className="btn btn-sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "上传中…" : "插入图片"}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => insertAtCursor("**粗体**")}
          >
            粗体
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => insertAtCursor("[链接文字](https://)")}
          >
            链接
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => insertAtCursor("\n> 引用\n")}
          >
            引用
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => insertAtCursor("\n```\n代码\n```\n")}
          >
            代码块
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onPickImage}
        />
        {uploadError && <div className="form-error">{uploadError}</div>}
        <textarea
          ref={textareaRef}
          className="textarea"
          placeholder="支持 Markdown 语法，@姓名 可提醒对方"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
    </div>
  );
}
