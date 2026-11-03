import { mergeAttributes, Node } from "@tiptap/core"

/**
 * Minimal checklist nodes. The names and HTML match Tiptap's official TaskList / TaskItem,
 * so documents stay compatible if we switch to that extension later.
 */
export const TaskList = Node.create({
  name: "taskList",
  group: "block list",
  content: "taskItem+",
  parseHTML() {
    return [{ tag: 'ul[data-type="taskList"]', priority: 51 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ["ul", mergeAttributes(HTMLAttributes, { "data-type": "taskList" }), 0]
  },
})

export const TaskItem = Node.create({
  name: "taskItem",
  content: "paragraph block*",
  defining: true,
  addAttributes() {
    return {
      checked: {
        default: false,
        keepOnSplit: false,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-checked") === "true",
        renderHTML: (attrs: { checked?: boolean }) => ({ "data-checked": attrs.checked ? "true" : "false" }),
      },
    }
  },
  parseHTML() {
    return [{ tag: 'li[data-type="taskItem"]', priority: 51 }]
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "li",
      mergeAttributes(HTMLAttributes, { "data-type": "taskItem" }),
      ["label", ["input", { type: "checkbox", checked: node.attrs.checked ? "checked" : null }]],
      ["div", 0],
    ]
  },
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      Tab: () => this.editor.commands.sinkListItem(this.name),
      "Shift-Tab": () => this.editor.commands.liftListItem(this.name),
    }
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      let current = node
      const li = document.createElement("li")
      li.dataset.type = "taskItem"
      li.dataset.checked = String(Boolean(node.attrs.checked))
      const label = document.createElement("label")
      label.contentEditable = "false"
      const box = document.createElement("input")
      box.type = "checkbox"
      box.checked = Boolean(node.attrs.checked)
      box.setAttribute("aria-label", "Done")
      box.addEventListener("mousedown", (e) => e.preventDefault())
      box.addEventListener("change", () => {
        if (!editor.isEditable) {
          box.checked = !box.checked
          return
        }
        const pos = typeof getPos === "function" ? getPos() : undefined
        if (typeof pos !== "number") return
        editor
          .chain()
          .command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, { ...current.attrs, checked: box.checked })
            return true
          })
          .run()
      })
      label.append(box)
      const content = document.createElement("div")
      li.append(label, content)
      return {
        dom: li,
        contentDOM: content,
        update: (updated) => {
          if (updated.type !== current.type) return false
          current = updated
          li.dataset.checked = String(Boolean(updated.attrs.checked))
          box.checked = Boolean(updated.attrs.checked)
          return true
        },
      }
    }
  },
})
