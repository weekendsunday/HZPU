"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Markdown 渲染：GFM + @姓名 高亮。 */
export function MarkdownView({ content }: { content: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {mentionify(content)}
      </ReactMarkdown>
    </div>
  );
}

/** 把 @姓名 包成链接语法，配合下方 a 渲染器输出高亮 span。 */
function mentionify(content: string): string {
  return content.replace(
    /(^|[^\w@])@([A-Za-z0-9_\-\u4e00-\u9fa5]{1,20})/g,
    "$1[@$2](#mention-$2)"
  );
}

const components = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    if (href && href.startsWith("#mention-")) {
      return <span className="mention">@{String(children).replace(/^@/, "")}</span>;
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow">
        {children}
      </a>
    );
  },
};
