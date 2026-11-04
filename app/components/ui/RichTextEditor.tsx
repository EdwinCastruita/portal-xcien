"use client";

import Image from "@tiptap/extension-image";
import {
  type Editor,
  EditorContent,
  useEditor,
  useEditorState,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  /** Sube la imagen y devuelve la URL con la que se inserta en el HTML. */
  onUploadImage: (file: File) => Promise<string>;
}

const imageFiles = (files?: FileList | null) =>
  Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));

// El contenido se toma de `value` solo al montar; para reiniciarlo, desmonta
// el editor. Odoo rechaza `data:image/` en las notas: las imágenes se suben
// con `onUploadImage` y se insertan por URL.
export default function RichTextEditor({
  value,
  onChange,
  onUploadImage,
}: RichTextEditorProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  // `handlePaste`/`handleDrop` se fijan al crear el editor: leen el editor
  // y el callback actuales desde refs.
  const editorRef = useRef<Editor | null>(null);
  const uploadRef = useRef(onUploadImage);
  uploadRef.current = onUploadImage;

  // Se inserta en la posición dada (al soltar) o en la selección actual.
  const insertImages = async (files: File[], pos?: number) => {
    for (const file of files) {
      setUploading((n) => n + 1);
      try {
        const src = await uploadRef.current(file);
        const chain = editorRef.current?.chain().focus();
        if (pos === undefined) chain?.setImage({ src, alt: file.name }).run();
        else
          chain
            ?.insertContentAt(pos, {
              type: "image",
              attrs: { src, alt: file.name },
            })
            .run();
      } catch {
        // `onUploadImage` ya muestra el error.
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false },
      }),
      Image.configure({ allowBase64: false }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rich-text min-h-64 p-4 md:p-6 text-sm focus:outline-none",
        "aria-label": "Notas",
      },
      handlePaste: (_view, event) => {
        const files = imageFiles(event.clipboardData?.files);
        if (!files.length) return false;
        insertImages(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = imageFiles(event.dataTransfer?.files);
        if (moved || !files.length) return false;
        const pos = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        })?.pos;
        insertImages(files, pos);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });
  editorRef.current = editor;

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
        {/* Tooltips hacia abajo: el contenedor recorta lo que sobresale. */}
        {tools.map(({ label, icon: Icon, isActive, run }) => (
          <div key={label} className="tooltip tooltip-bottom" data-tip={label}>
            <button
              type="button"
              onClick={run}
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
          </div>
        ))}
        <div
          className="tooltip tooltip-bottom"
          data-tip={
            uploading > 0
              ? "Subiendo imagen…"
              : "Insertar imagen (también puedes pegarla o arrastrarla)"
          }
        >
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading > 0}
            aria-label="Insertar imagen"
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors text-base-content/60 hover:bg-base-content/5 disabled:opacity-50"
          >
            {uploading > 0 ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4" />
            )}
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          multiple
          hidden
          onChange={(e) => {
            insertImages(imageFiles(e.target.files));
            e.target.value = "";
          }}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
