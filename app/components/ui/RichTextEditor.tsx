"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  type LucideIcon,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

// El contenido se toma de `value` solo al montar; para reiniciarlo, desmonta
// el editor. Sin extensión de imagen: Odoo rechaza `data:image/` en las notas.
export default function RichTextEditor({
  value,
  onChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false },
      }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rich-text min-h-64 p-4 md:p-6 text-sm focus:outline-none",
        "aria-label": "Notas",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      h2: editor?.isActive("heading", { level: 2 }) ?? false,
      h3: editor?.isActive("heading", { level: 3 }) ?? false,
      bulletList: editor?.isActive("bulletList") ?? false,
      orderedList: editor?.isActive("orderedList") ?? false,
    }),
  });

  const tools: {
    label: string;
    icon: LucideIcon;
    isActive?: boolean;
    run: () => void;
  }[] = [
    {
      label: "Negritas",
      icon: Bold,
      isActive: active?.bold,
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: "Cursivas",
      icon: Italic,
      isActive: active?.italic,
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: "Título",
      icon: Heading2,
      isActive: active?.h2,
      run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Subtítulo",
      icon: Heading3,
      isActive: active?.h3,
      run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "Lista con viñetas",
      icon: List,
      isActive: active?.bulletList,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Lista numerada",
      icon: ListOrdered,
      isActive: active?.orderedList,
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div className="rounded-2xl border border-base-content/10 bg-base-content/[0.03] overflow-hidden focus-within:border-primary/50 transition-colors">
      <div className="flex flex-wrap gap-1 p-2 border-b border-base-content/10">
        {tools.map(({ label, icon: Icon, isActive, run }) => (
          <button
            key={label}
            type="button"
            onClick={run}
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
              isActive
                ? "chip-selected"
                : "text-base-content/60 hover:bg-base-content/5"
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
