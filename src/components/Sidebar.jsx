import {
  ChevronDown,
  FileCode2,
  Folder,
  Plus,
  Search
} from "lucide-react";

export default function Sidebar({
  files,
  activeFileId,
  onSelectFile
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>EXPLORER</span>

        <div className="sidebar-actions">
          <button title="New file">
            <Plus size={16} />
          </button>

          <button title="Search">
            <Search size={15} />
          </button>
        </div>
      </div>

      <div className="project-tree">
        <div className="tree-project">
          <ChevronDown size={15} />

          <Folder
            size={16}
            className="folder-icon"
          />

          <span>PIXELCODE</span>
        </div>

        <div className="tree-files">
          {files.map((file) => (
            <button
              key={file.id}
              className={`file-item ${
                activeFileId === file.id
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                onSelectFile(file.id)
              }
            >
              <FileCode2
                size={16}
                className="file-icon"
              />

              <span>{file.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-bottom">
        <div className="workspace-label">
          WORKSPACE
        </div>

        <div className="workspace-info">
          <div className="workspace-avatar">
            P
          </div>

          <div>
            <strong>PixelCode</strong>
            <span>Local Project</span>
          </div>
        </div>
      </div>
    </aside>
  );
}