import { TAbstractFile, setIcon, TFolder, TFile, Menu } from "obsidian";
import { deleteFavAndRecent, updateFavAndRecent } from "./FavAndRecent";
import { constructOutlineDOM } from "./constructOutlineDOM";
import { Category, MultipleNotesOutlineViewType } from "./fileView";
import { getFileInfo, getOutline } from "./getOutline";
import { FileStatus, FileInfo, OutlineData } from "./main";
import { checkFlag, removeFlag, addFlag } from "./util";

import { remote } from "electron";

export function constructNoteDOM(
	files: TAbstractFile[],
	status: FileStatus[],
	info: FileInfo[],
	data: OutlineData[][],
	parentEl: HTMLElement,
	category: Category,
	aotEl: HTMLElement,
	srcFile: TAbstractFile,
	order: number[],
): void {
	for (let i = 0; i < files.length; i++) {
		const si = order[i]; // sorted i

		// 重複しており、かつ重複ファイルは非表示設定であればスキップ
		if (Object.values(status[si].duplicated).includes(true) && this.settings.hideDuplicated) {
			continue;
		}

		const noteType = status[si].isFolder ? "folder" : "file";

		// ノートのタイトル部分作成 (Explorerのフォルダに相当）
		// AOTフラグオンならトップに
		const belongsAOT =
			Boolean(status[si].isTop == true && !Object.values(status[si].duplicated).includes(true)) &&
			category != "main";
		let noteEl: HTMLElement;
		if (belongsAOT) {
			noteEl = aotEl.createDiv("tree-item nav-folder");
		} else {
			noteEl = parentEl.createDiv("tree-item nav-folder");
		}

		const noteTitleEl: HTMLElement = noteEl.createDiv(
			"tree-item-self is-clickable mod-collapsible nav-folder-title",
		);

		// アイコンの設定
		let nIcon;
		if (belongsAOT) {
			nIcon = "pin";
		} else {
			if (noteType == "folder") {
				nIcon = "folder";
			} else {
				nIcon = "file";
			}
		}
		setIcon(noteTitleEl, nIcon);

		//ノートタイトルの親要素がmod-rootクラスを含まないなら、view上は2階層目に位置するので、stickyの表示位置を下げるis-subfolderクラスを付与する
		if (!noteEl.parentElement.classList.contains("mod-root")) {
			noteTitleEl.classList.add("is-subfolder");
		}

		const noteChildrenEl: HTMLElement = noteEl.createDiv("tree-item-children nav-folder-children");

		// id 付加
		noteChildrenEl.id = "MNO" + this.viewType + files[si].path;

		// 折りたたみアイコン
		const noteCollapseIcon: HTMLElement = noteTitleEl.createDiv(
			"tree-item-icon collapse-icon nav-folder-collapse-indicator",
		);
		setIcon(noteCollapseIcon, "right-triangle");

		//  折りたたみアイコンクリック時の処理
		noteCollapseIcon.addEventListener("click", async (event: MouseEvent) => {
			event.stopPropagation();

			// アウトラインが読み込まれていない場合
			if (!status[si].outlineReady) {
				if (noteType == "folder") {
					// フォルダの場合
					await this.processFolder(files[si] as TFolder);
					status[si].outlineReady = true;

					noteEl.classList.remove("is-collapsed");
					noteCollapseIcon.classList.remove("is-collapsed");

					constructNoteDOM.call(
						this,
						this.targetFiles[files[si].path],
						this.fileStatus[files[si].path],
						this.fileInfo[files[si].path],
						this.outlineData[files[si].path],
						noteChildrenEl,
						"folder",
						aotEl,
						srcFile,
						this.fileOrder[files[si].path],
					);
					noteEl.appendChild(noteChildrenEl);
				} else if ((files[si] as TFile)?.extension == "md") {
					info[si] = await getFileInfo(
						this.app,
						files[si] as TFile,
						this.settings,
						false,
						this.isDataviewEnabled,
					);
					data[si] = await getOutline(this.app, files[si] as TFile, status[si], info[si], this.settings);
					status[si].outlineReady = true;

					noteEl.classList.remove("is-collapsed");
					noteCollapseIcon.classList.remove("is-collapsed");

					// noteDOMにファイル情報を追加
					attachFileInfo(noteTitleEl, status[si], info[si], data[si], this.settings.displayFileInfo);

					constructOutlineDOM.call(this, files[si], info[si], data[si], noteChildrenEl, category);
				} else {
					//md以外のファイル
				}
			} else if (status[si].isFolded) {
				// フォールドされている場合

				// 個別フォールドフラグを除去
				if (
					!this.collapseAll &&
					(!status[si].duplicated.main || !this.settings.showFiles.main) &&
					(!status[si].duplicated.outgoing || !this.settings.showFiles.outgoing) &&
					!status[si].duplicated.self
				) {
					if (checkFlag(srcFile, files[si], "fold", this.settings)) {
						removeFlag(srcFile, files[si], "fold", this.settings);
						await this.plugin.saveSettings();
					}
				}

				// オープン処理
				noteEl.classList.remove("is-collapsed");
				noteCollapseIcon.classList.remove("is-collapsed");
				status[si].isFolded = false;
				noteChildrenEl.style.display = "block";
			} else {
				// 開いている場合

				// 個別フォールドフラグを追加
				if (
					!this.collapseAll &&
					(!status[si].duplicated.main || !this.settings.showFiles.main) &&
					(!status[si].duplicated.outgoing || !this.settings.showFiles.outgoing) &&
					!status[si].duplicated.self
				) {
					addFlag(srcFile, files[si], "fold", this.settings);
				}
				await this.plugin.saveSettings();

				// フォールド処理
				noteEl.classList.add("is-collapsed");
				noteCollapseIcon.classList.add("is-collapsed");
				status[si].isFolded = true;
				noteChildrenEl.style.display = "none";
			}
		});

		// ファイル名
		let nameLabel = noteType == "folder" ? files[si].name : (files[si] as TFile).basename;
		if (noteType == "folder") {
			nameLabel = files[si].name;
		} else {
			nameLabel = (files[si] as TFile).basename;
			if ((files[si] as TFile).extension !== "md") {
				nameLabel = nameLabel + "." + (files[si] as TFile).extension;
			}
		}
		noteTitleEl.createDiv("tree-item-inner nav-folder-title-content").setText(nameLabel);

		//ファイル名の後の情報を表示
		attachFileInfo(noteTitleEl, status[si], info[si], data[si], this.settings.displayFileInfo);

		// drag&drop
		if (files[si] instanceof TFile) {
			noteTitleEl.setAttr("draggable", "true");
			noteTitleEl.addEventListener("dragstart", (event: DragEvent) => {
				const dragManager = (this.app as any).dragManager;
				const dragData = dragManager.dragFile(event, files[si]);
				dragManager.onDragStart(event, dragData);
			});
		}

		//ノートタイトルをクリックしたらそのファイルをopen
		if (noteType == "file") {
			noteTitleEl.addEventListener(
				"click",
				(event: MouseEvent) => {
					if (files[si] != this.activeFile) {
						this.holdUpdateOnce = true;
					}
					this.app.workspace.getLeaf().openFile(files[si]);
				},
				false,
			);

			//hover preview
			noteTitleEl.addEventListener("mouseover", (event: MouseEvent) => {
				this.app.workspace.trigger("hover-link", {
					event,
					source: MultipleNotesOutlineViewType,
					hoverParent: parentEl, // rootEl→parentElにした
					targetEl: noteTitleEl,
					linktext: files[si].path,
				});
			});
		}

		// コンテキストメニュー
		noteTitleEl.addEventListener("contextmenu", (event: MouseEvent) => {
			const menu = new Menu();

			menu.addSeparator();

			//Always on Top に指定/解除
			if (checkFlag(srcFile, files[si], "top", this.settings)) {
				menu.addItem((item) =>
					item
						.setTitle("MNO: Stop displaying at the top")
						.setIcon("pin-off")
						.onClick(async () => {
							removeFlag(srcFile, files[si], "top", this.settings);
							await this.plugin.saveSettings();
							await this.refreshView(true, true);
						}),
				);
			} else {
				menu.addItem((item) =>
					item
						.setTitle("MNO: Always display at the top")
						.setIcon("pin")
						.onClick(async () => {
							addFlag(srcFile, files[si], "top", this.settings);
							await this.plugin.saveSettings();
							await this.refreshView(true, true);
						}),
				);
			}

			// favoriteに追加/削除
			if (this.settings.favorite[noteType].includes(files[si].path)) {
				menu.addItem((item) =>
					item
						.setTitle("MNO: Remove from favorites")
						.setIcon("bookmark-minus")
						.onClick(async () => {
							deleteFavAndRecent.call(this, files[si].path, noteType, "favorite");
							await this.plugin.saveSettings();
						}),
				);
			} else {
				menu.addItem((item) =>
					item
						.setTitle("MNO: Add to favorites")
						.setIcon("bookmark-plus")
						.onClick(async () => {
							updateFavAndRecent.call(this, files[si].path, noteType, "favorite");
							await this.plugin.saveSettings();
						}),
				);
			}
			menu.addSeparator();

			if (noteType == "file") {
				//新規タブ に開く
				menu.addItem((item) =>
					item
						.setTitle("Open in new tab")
						.setIcon("file-plus")
						.onClick(() => {
							if (files[si] != this.activeFile) {
								this.holdUpdateOnce = true;
							}
							event.preventDefault();
							this.app.workspace.getLeaf("tab").openFile(files[si]);
						}),
				);
				//右に開く
				menu.addItem((item) =>
					item
						.setTitle("Open to the right")
						.setIcon("separator-vertical")
						.onClick(() => {
							if (files[si] != this.activeFile) {
								this.holdUpdateOnce = true;
							}
							event.preventDefault();
							this.app.workspace.getLeaf("split").openFile(files[si]);
						}),
				);
				//新規ウィンドウに開く
				menu.addItem((item) =>
					item
						.setTitle("Open in new window")
						.setIcon("scan")
						.onClick(async () => {
							if (files[si] != this.activeFile) {
								this.holdUpdateOnce = true;
							}
							// await this.app.workspace.getLeaf('window').openFile(linkTarget);
							await this.app.workspace
								.openPopoutLeaf({
									size: {
										width: this.settings.popoutSize.width,
										height: this.settings.popoutSize.height,
									},
								})
								.openFile(files[si]);
							if (this.settings.popoutAlwaysOnTop) {
								setPopoutAlwaysOnTop();
							}
						}),
				);
			}
			menu.showAtMouseEvent(event);
		});

		// もしアウトラインが準備できていなければスキップする
		if (!status[si].outlineReady) {
			noteEl.classList.add("is-collapsed");
			noteCollapseIcon.classList.add("is-collapsed");
			continue;
		}

		if (noteType == "folder") {
			// サブフォルダのDOMを作成
			constructNoteDOM.call(
				this,
				this.targetFiles[files[si].path],
				this.fileStatus[files[si].path],
				this.fileInfo[files[si].path],
				this.outlineData[files[si].path],
				noteChildrenEl,
				"folder",
				aotEl,
				srcFile,
				this.fileOrder[files[si].path],
			);
		} else {
			// アウトラインDOMを作成
			constructOutlineDOM.call(this, files[si], info[si], data[si], noteChildrenEl, category);
		}

		// 折りたたまれていれば子要素を非表示にする
		// 折りたたまれているのは以下のケース
		// collpaseAllが有効な場合、
		// ファイルビューで各カテゴリ（メイン/アウトゴーイング/自カテゴリ）に重複がある場合、
		// relatedFilesで折りたたみフラグが立っている場合
		if (
			this.collapseAll ||
			(status[si].duplicated.main && this.settings.showFiles.main) ||
			(status[si].duplicated.outgoing && this.settings.showFiles.outgoing) ||
			status[si].duplicated.self ||
			this.settings.relatedFiles?.[srcFile.path]?.[files[si].path]?.fold
		) {
			noteEl.classList.add("is-collapsed");
			noteCollapseIcon.classList.add("is-collapsed");
			status[si].isFolded = true;
			noteChildrenEl.style.display = "none";
		} else {
			status[si].isFolded = false;
		}
	}
}

// ファイル情報を付加表示
function attachFileInfo(
	targetEl: HTMLElement,
	status: FileStatus,
	info: FileInfo,
	data: OutlineData[],
	displayFileInfo: string,
): void {
	if (!status.isFolder) {
		switch (displayFileInfo) {
			case "lines":
				targetEl.dataset.subinfo = status.outlineReady ? info.numOfLines.toString() : "";
				break;
			case "tag":
				if (status.outlineReady) {
					const firsttagIndex = data.findIndex((element, index) => data[index].typeOfElement == "tag");
					if (firsttagIndex >= 0) {
						targetEl.dataset.subinfo = data[firsttagIndex].displayText;
					}
				}
				break;
			case "none":
				break;
			default:
				break;
		}
	}
}
