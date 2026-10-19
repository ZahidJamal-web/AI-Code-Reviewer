
import { useState } from "react";
import {
  ChevronDown,
  FileCode2,
  Folder,
  Plus,
  Search,
  X,
} from "lucide-react";

export default function Sidebar({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [folderOpen, setFolderOpen] = useState(true);

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleCreateFile() {
    onCreateFile?.();
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>EXPLORER</span>

        <div className="sidebar-actions">
          <button
            type="button"
            title="New file"
            aria-label="Create new file"
            onClick={handleCreateFile}
          >
            <Plus size={17} />
          </button>

          <button
            type="button"
            title="Search files"
            aria-label="Search files"
            onClick={() => {
              setSearchOpen((open) => !open);
              setSearchTerm("");
            }}
          >
            {searchOpen ? <X size={15} /> : <Search size={15} />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="explorer-search">
          <Search size={14} />

          <input
            autoFocus
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Search filenames"
          />

          {searchTerm && (
            <button
              type="button"
              title="Clear search"
              onClick={() => setSearchTerm("")}
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      <div className="project-tree">
        <button
          type="button"
          className="tree-project"
          onClick={() => setFolderOpen((open) => !open)}
          aria-expanded={folderOpen}
        >
          {folderOpen ? (
            <ChevronDown size={15} />
          ) : (
            <ChevronDown className="folder-chevron-closed" size={15} />
          )}

          <Folder size={16} className="folder-icon" />

          <span>PIXELCODE</span>
        </button>

        {folderOpen && (
          <div className="tree-files">
            {filteredFiles.map((file) => (
              <button
                type="button"
                key={file.id}
                className={`file-item ${
                  activeFileId === file.id ? "active" : ""
                }`}
                onClick={() => onSelectFile(file.id)}
                title={file.name}
              >
                <FileCode2 size={16} className="file-icon" />
                <span>{file.name}</span>
              </button>
            ))}

            {filteredFiles.length === 0 && (
              <div className="explorer-empty">
                No matching files found.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sidebar-bottom">
        <div className="workspace-label">WORKSPACE</div>

        <div className="workspace-info">
          <div className="workspace-avatar">P</div>

          <div>
            <strong>PixelCode</strong>
            <span>Local Project</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
