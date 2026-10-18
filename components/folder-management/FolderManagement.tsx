import { PureComponent } from 'react';
import type { ChangeEvent } from 'react';
import type { Folder } from '../../types/library';
import style from './FolderManagement.scss';

interface FolderManagementProps {
  folders: Folder[];
  addFiles: (files: FileList) => void;
}

class FolderManagement extends PureComponent<FolderManagementProps> {
  private upload: (HTMLInputElement & { allowdirs?: boolean }) | null = null;

  componentDidMount() {
    if (this.upload) {
      this.upload.allowdirs = true;
      this.upload.webkitdirectory = true;
    }
  }

  handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const { files } = event.target;

    if (files) this.props.addFiles(files);
  };

  render() {
    const { folders } = this.props;
    return (
      <section className={style.folderManagement}>
        <div className={style.sectionTitle}>Folders</div>
        <div className={style.folders}>
          {folders.map((folder) => (
            <div key={`folder-${folder.path}`} className={style.folder} title={folder.path}>
              {folder.path}
            </div>
          ))}
          <div
            className={style.addItems}
            onClick={() => {
              this.upload?.click();
            }}
          >
            Drop music folders here
            <input
              type="file"
              ref={(ref) => {
                this.upload = ref;
              }}
              className={style.fileInput}
              multiple
              onChange={this.handleFileChange}
            />
          </div>
        </div>
      </section>
    );
  }
}

export default FolderManagement;
