import CodeEditor from "@uiw/react-textarea-code-editor";
import { MouseEvent, useCallback, useRef } from "react";
import { preamble, postamble } from "./Level0";

export const Editor = ({
  code,
  setCode,
}: {
  code: string;
  setCode: (code: string) => void;
}) => {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const handleClick = useCallback((e: MouseEvent) => {
    if (e.defaultPrevented) return;
    editorRef.current?.focus();
    editorRef.current?.setSelectionRange(
      editorRef.current?.value.length,
      editorRef.current?.value.length
    );
  }, []);

  return (
    <div
      className="w-full p-2 bg-gray-100 dark:bg-slate-800"
      onClick={handleClick}
    >
      <CodeEditor
        value={preamble}
        language="js"
        onChange={(evn) => setCode(evn.target.value)}
        padding={0}
        disabled
      />
      <CodeEditor
        value={code}
        language="js"
        onChange={(evn) => setCode(evn.target.value)}
        padding={0}
        ref={editorRef}
        onClick={(e) => {
          e.preventDefault();
        }}
      />
      <CodeEditor
        value={postamble}
        language="js"
        onChange={(evn) => setCode(evn.target.value)}
        padding={0}
        disabled
      />
    </div>
  );
};
