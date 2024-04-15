import { setIcon, debounce, Debouncer } from "obsidian";

import { ItemView, WorkspaceLeaf, TFile } from "obsidian";

import MultipleNotesOutlinePlugin, {
	MultipleNotesOutlineSettings,
	OutlineData,
	FileInfo,
	FileStatus,
} from "src/main";

import { getOutgoingLinkFiles } from "src/getTargetFiles";
import { initFileStatus, getFileInfo, getOutline } from "src/getOutline";
import {
	checkFlag,
	sortFileOrder,
	getTheme,
	setNoteTitleBackgroundColor,
	handleDeleteRelatedFiles,
	handleRenameRelatedFiles,
	checkRelatedFiles,
	checkDataview,
} from "src/util";

import { drawUI } from "src/drawUI";
import { constructNoteDOM, constructOutlineDOM } from "src/constructDOM";
import {
	checkFavAndRecentFiles,
	handleDeleteFavAndRecentFiles,
	handleRenameFavAndRecentFiles,
	updateFavAndRecent,
} from "./FavAndRecent";

export const MultipleNotesOutlineViewType = "multiple-notes-outline";

export type Category = "main" | "outgoing" | "backlink";

export class MultipleNotesOutlineView extends ItemView {
	plugin: MultipleNotesOutlinePlugin;
	settings: MultipleNotesOutlineSettings;

	activeFile: TFile;
	targetFiles: {
		main: TFile[];
		outgoing: TFile[];
		backlink: TFile[];
	} = {
		main: [],
		outgoing: [],
		backlink: [],
	};

	fileStatus: {
		main: FileStatus[];
		outgoing: FileStatus[];
		backlink: FileStatus[];
	} = {
		main: [],
		outgoing: [],
		backlink: [],
	};

	fileInfo: {
		main: FileInfo[];
		outgoing: FileInfo[];
		backlink: FileInfo[];
	} = {
		main: [],
		outgoing: [],
		backlink: [],
	};

	outlineData: {
		main: OutlineData[][];
		outgoing: OutlineData[][];
		backlink: OutlineData[][];
	} = {
		main: [],
		outgoing: [],
		backlink: [],
	};

	fileOrder: {
		main: number[];
		outgoing: number[];
		backlink: number[];
	} = {
		main: [],
		outgoing: [],
		backlink: [],
	};

	flagChanged = false;
	flagRegetTarget = false;
	// flagRenamed: boolean;
	flagSaveSettings = false;

	extractMode = false;
	extractTask = false;

	// include mode フィルター関連 コメントアウト
	// includeMode: boolean;

	maxLevel: number;

	//全ファイルの折りたたみ
	collapseAll = false;
	//カテゴリ単位の折りたたみ
	collapseCategory: { outgoing: boolean; backlink: boolean } = {
		outgoing: false,
		backlink: false,
	};

	//プラグインビュー経由で別ファイルを開いた際に、ビューの更新を保留するためのフラグ。
	//ビューから別ファイルに移動したらtrueにして、一回だけビューの更新をスキップする。
	holdUpdateOnce = false;

	// targetFiles.main が変更されたらtrueにして、スクロール位置を保持しないためのフラグ。
	hasMainChanged = false;

	//アウトラインを取得したファイル数のカウント。設定値(readLimit)を超えたら読み込みを止める。
	filecount = 0;

	// 変更されたファイルの配列。 一定間隔ごとにこのファイルのアウトラインを再読み込みして、更新したらこの配列を空にする
	changedFiles: TFile[] = [];
	// renamedFiles: { file: TFile, oldPath: string }[] = [];

	// viewタイプ DOMのidにも付加
	viewType: "file" | "folder" = "file";

	// 現在のライトモード/ダークモードの状態
	theme: "light" | "dark";

	pinnedMode = false;

	isDataviewEnabled = false;

	constructor(
		leaf: WorkspaceLeaf,
		plugin: MultipleNotesOutlinePlugin,
		settings: MultipleNotesOutlineSettings,
	) {
		super(leaf);
		this.plugin = plugin;
		this.settings = settings;
	}

	getViewType(): string {
		return MultipleNotesOutlineViewType;
	}

	getDisplayText(): string {
		return "MNO - file view";
	}

	getIcon(): string {
		return "files";
	}

	async onOpen() {
		await this.initView();

		// Dataviewのロードを待機したところ、却って遅かった。
		// if (checkDataview(this.app)){
		// 	const dataviewAPI = getAPI();
		// 	// dataviewがindex-readyでない場合のみ描画を待機
		// 	if (!dataviewAPI.index.initialized){
		// 		this.registerEvent(this.app.metadataCache.on("dataview:index-ready", async() => {
		// 			await this.initView();
		// 		}));
		// 	} else {
		// 		await this.initView();
		// 	}
		// } else {
		// 	await this.initView();
		// }
	}

	updateSettings() {
		this.settings = this.plugin.settings;
	}

	async onClose() {
		// Nothin to clean up
	}

	private async initView() {
		await this.bootDelay();

		checkRelatedFiles(this.app, this.settings);
		checkFavAndRecentFiles(this.app, this.settings, this.viewType);

		this.collapseAll = this.settings.collapseAllAtStartup;

		// ノートタイトル背景色の設定
		this.theme = getTheme();
		setNoteTitleBackgroundColor(this.theme, this.settings);

		// 初期の表示対象ファイルを取得（アクティブファイルまたは最後に表示したファイル）
		this.activeFile = this.app.workspace.getActiveFile();
		if (this.activeFile) {
			if (
				this.settings.openRecentAtStartup.file &&
				this.app.vault.getAbstractFileByPath(this.settings.recent.file?.[0]) instanceof
					TFile
			) {
				this.targetFiles.main[0] = this.app.vault.getAbstractFileByPath(
					this.settings.recent.file?.[0],
				) as TFile;
				if (this.settings.pinAfterJump && this.settings.autoupdateFileView) {
					this.pinnedMode = true;
				}
			} else {
				this.targetFiles.main[0] = this.activeFile;
			}
		} else {
			if (
				this.app.vault.getAbstractFileByPath(this.settings.recent.file?.[0]) instanceof
				TFile
			) {
				this.targetFiles.main[0] = this.app.vault.getAbstractFileByPath(
					this.settings.recent.file?.[0],
				) as TFile;
				if (this.settings.pinAfterJump && this.settings.autoupdateFileView) {
					this.pinnedMode = true;
				}
			} else {
				this.targetFiles.main[0] = null;
			}
		}
		this.refreshView(true, true);

		//自動更新のためのデータ変更、ファイル追加/削除の監視 observe file change/create/delete
		const debouncerRequestRefresh: Debouncer<[], null> = debounce(this.autoRefresh, 3000, true);

		this.flagChanged = false;
		this.flagRegetTarget = false;

		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (file instanceof TFile && file !== this.activeFile) {
					this.activeFile = file;

					if (
						!this.settings.autoupdateFileView ||
						(this.settings.suspendUpdateByClickingView && this.holdUpdateOnce) ||
						this.pinnedMode == true
					) {
						// autoupdateがfalseか、 viewからの直接の遷移の場合更新しない設定であれば更新をスキップ
					} else if (
						this.targetFiles.main[0].extension == "canvas" &&
						this.targetFiles.outgoing.includes(this.activeFile)
					) {
						// canvasがメインの際、canvasに含まれるファイルを開いてもviewを更新しない
					} else {
						this.targetFiles.main[0] = this.activeFile;
						this.hasMainChanged = true;

						updateFavAndRecent.call(this, this.activeFile.path, "file", "recent");

						this.refreshView(true, true);
					}
					this.holdUpdateOnce = false;
				}
			}),
		);

		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				let category: Category;
				for (category in this.targetFiles) {
					if (this.targetFiles[category].includes(file)) {
						if (!this.changedFiles.includes(file)) {
							this.changedFiles.push(file);
						}
						this.flagChanged = true;
						debouncerRequestRefresh.call(this);
						break;
					}
				}
			}),
		);

		// ファイルビューにおいてはcreateは現状無関係
		// this.registerEvent(this.app.vault.on('create',(file)=>{
		// 	if (file instanceof TFile){
		// 		this.flagRegetAll = true;
		// 		debouncerRequestRefresh.call(this);
		// 	}
		// }));

		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file instanceof TFile) {
					// メインファイル以外の削除の場合ビューを 遷移しない処理
					if (file == this.activeFile && file != this.targetFiles.main[0]) {
						this.holdUpdateOnce = true;
					}
					const changedRelatedFiles = handleDeleteRelatedFiles(file, this.settings);
					if (changedRelatedFiles) {
						this.flagSaveSettings = true;
					}

					const changedFavAndRecent = handleDeleteFavAndRecentFiles(file, this.settings);
					if (changedFavAndRecent) {
						this.flagSaveSettings = true;
					}
					this.flagRegetTarget = true;
					debouncerRequestRefresh.call(this);
				}
			}),
		);

		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (file instanceof TFile) {
					const changedRelatedFiles = handleRenameRelatedFiles(
						file,
						oldPath,
						this.settings,
					);
					if (changedRelatedFiles) {
						this.flagSaveSettings = true;
					}

					const changedFavAndRecent = handleRenameFavAndRecentFiles(
						file,
						oldPath,
						this.settings,
					);
					if (changedFavAndRecent) {
						this.flagSaveSettings = true;
					}

					this.flagRegetTarget = true;

					debouncerRequestRefresh.call(this);
				}
			}),
		);

		this.registerEvent(
			this.app.workspace.on("css-change", (e) => {
				const newTheme = getTheme();
				if (newTheme !== this.theme) {
					this.theme = newTheme;
					setNoteTitleBackgroundColor(this.theme, this.settings);
				}
			}),
		);
	}

	private async bootDelay(): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(resolve, this.settings.bootDelayTime);
		});
	}

	// ファイル修正、削除、リネームなどの際の自動更新
	private async autoRefresh() {
		const startTime = performance.now();

		if (!(this.flagChanged || this.flagRegetTarget || this.flagSaveSettings)) {
			return;
		}

		if (this.flagChanged && !this.flagRegetTarget) {
			for (let i = 0; i < this.changedFiles.length; i++) {
				let category: Category;
				for (category in this.targetFiles) {
					const index = this.targetFiles[category].indexOf(this.changedFiles[i]);
					if (index < 0) {
						continue;
					}

					//変更したファイルのファイル情報とアウトラインを更新
					this.fileInfo[category][index] = await getFileInfo(
						this.app,
						this.targetFiles[category][index],
						this.settings,
						true,
						this.isDataviewEnabled,
					);
					const newData = await getOutline(
						this.app,
						this.targetFiles[category][index],
						this.fileStatus[category][index],
						this.fileInfo[category][index],
						this.settings,
					);
					if (newData) {
						this.outlineData[category][index] = newData;
						this.fileStatus[category][index].outlineReady = true;
					}

					// DOMを更新
					const updateNoteChildrenEl = document.getElementById(
						"MNO" + this.viewType + this.targetFiles[category][index].path,
					);
					updateNoteChildrenEl.empty();
					constructOutlineDOM.call(
						this,
						this.targetFiles[category][index],
						this.fileInfo[category][index],
						this.outlineData[category][index],
						updateNoteChildrenEl,
						category,
					);
				}
			}
		}

		// if (this.flagRenamed){
		// 	for (let i=0; i < this.renamedFiles.length; i++){

		// 		// 暫定的にrename時はリロードする処理に変更
		// 		// viewに対象ファイルがあればアップデート
		// 		// let category: Category;
		// 		// for (category in this.targetFiles){
		// 		// 	let index = this.targetFiles[category].findIndex( (targetfile)=> targetfile.path == this.renamedFiles[i].oldPath);  // TFileかpathにあわせて比較する必要
		// 		// 	if (index<0){
		// 		// 		continue;
		// 		// 	}

		// 		// 	//変更したファイルのファイル情報とアウトラインを更新
		// 		// 	this.targetFiles[category][index] = this.renamedFiles[i].file;
		// 		// 	this.fileInfo[category][index] = await getFileInfo(this.app, this.targetFiles[category][index], this.settings);
		// 		// 	const newData = await getOutline(this.app, this.targetFiles[category][index],this.fileStatus[category][index], this.fileInfo[category][index], this.settings);
		// 		// 	if (newData){
		// 		// 		this.outlineData[category][index] = newData;
		// 		// 		this.fileStatus[category][index].outlineReady = true;
		// 		// 	}

		// 		// }

		// 		// relatedFilesをアップデート
		// 		for (let srcFilePath in this.settings.relatedFiles){

		// 			for (let dstFilePath in this.settings.relatedFiles[srcFilePath]){
		// 				if (dstFilePath == this.renamedFiles[i].oldPath){
		// 					this.settings.relatedFiles[srcFilePath][this.renamedFiles[i].file.path]= this.settings.relatedFiles[srcFilePath][dstFilePath];
		// 					delete this.settings.relatedFiles[srcFilePath][dstFilePath];
		// 				}
		// 			}

		// 			if (srcFilePath == this.renamedFiles[i].oldPath){
		// 				this.settings.relatedFiles[this.renamedFiles[i].file.path]= this.settings.relatedFiles[srcFilePath];
		// 				delete this.settings.relatedFiles[srcFilePath];
		// 			}
		// 		}
		// 	}
		// 	await this.plugin.saveSettings();
		// }

		if (this.flagSaveSettings) {
			await this.plugin.saveSettings();
		}

		if (this.flagRegetTarget) {
			this.refreshView(this.flagRegetTarget, this.flagRegetTarget);
		}
		this.changedFiles = [];
		this.flagRegetTarget = false;
		this.flagChanged = false;
		this.flagSaveSettings = false;
		const endTime = performance.now();
		if (this.settings.showDebugInfo) {
			console.log(
				"Multiple Notes Outline: time required to auto refresh, file view: ",
				endTime - startTime,
			);
		}
	}

	// リフレッシュセンター
	// flagGetTargetがtrue: 対象ファイルを再取得
	// flagGetOutlineがtrue: アウトライン情報を再取得
	// その後UI部分とアウトライン部分を描画
	async refreshView(flagGetTarget: boolean, flagGetOutline: boolean) {
		// 描画所要時間を測定
		const startTime = performance.now();

		//dataviewオンオフチェック
		this.isDataviewEnabled = checkDataview(this.app);

		// スクロール位置の取得
		const containerEl = document.getElementById("MNOfileview-listcontainer");

		const previousY = containerEl?.scrollTop ? containerEl.scrollTop : 0;

		// メインターゲットが取得できていなければUIアイコンのみ描画
		if (!this.targetFiles.main[0]) {
			drawUI.call(this);
			return;
		}

		// メインターゲットファイルのfileInfoとoutlineを取得
		this.filecount = 0;
		if (this.targetFiles.main[0] && flagGetTarget) {
			this.fileStatus.main = initFileStatus(this.targetFiles.main);
			this.fileOrder.main = [...Array(this.targetFiles.main.length)].map((_, i) => i);
			[this.fileStatus.main, this.fileInfo.main, this.outlineData.main] =
				await this.getOutlines(this.targetFiles.main, this.fileStatus.main);

			// 現ファイル情報をもとにアウトゴーイングリンク/バックリンク先のファイルを取得
			this.targetFiles.outgoing = getOutgoingLinkFiles(
				this.app,
				this.targetFiles.main[0],
				this.fileInfo.main[0],
				this.outlineData.main[0],
			);
			this.fileStatus.outgoing = initFileStatus(this.targetFiles.outgoing);
			this.fileOrder.outgoing = [...Array(this.targetFiles.outgoing.length)].map((_, i) => i);

			this.targetFiles.backlink = this.fileInfo.main[0]?.backlinks;
			this.fileStatus.backlink = initFileStatus(this.targetFiles.backlink);
			this.fileOrder.backlink = [...Array(this.targetFiles.backlink.length)].map((_, i) => i);

			//重複チェック
			this.checkDuplicated(
				this.targetFiles.outgoing,
				this.targetFiles.main,
				"main",
				this.fileStatus.outgoing,
			);
			this.checkDuplicated(
				this.targetFiles.outgoing,
				this.targetFiles.outgoing,
				"self",
				this.fileStatus.outgoing,
			);
			this.checkDuplicated(
				this.targetFiles.backlink,
				this.targetFiles.main,
				"main",
				this.fileStatus.backlink,
			);
			this.checkDuplicated(
				this.targetFiles.backlink,
				this.targetFiles.outgoing,
				"outgoing",
				this.fileStatus.backlink,
			);
			this.checkDuplicated(
				this.targetFiles.backlink,
				this.targetFiles.backlink,
				"self",
				this.fileStatus.backlink,
			);
		}
		// アウトゴーイング/バックリンクファイルのfileInfoとoutlineを取得
		// ファイル数がprocessLimitを超過していないときのみ読み込む
		if (
			flagGetOutline &&
			this.targetFiles.outgoing.length + this.targetFiles.backlink.length <=
				this.settings.processLimit
		) {
			[this.fileStatus.outgoing, this.fileInfo.outgoing, this.outlineData.outgoing] =
				await this.getOutlines(this.targetFiles.outgoing, this.fileStatus.outgoing);
			[this.fileStatus.backlink, this.fileInfo.backlink, this.outlineData.backlink] =
				await this.getOutlines(this.targetFiles.backlink, this.fileStatus.backlink);
			sortFileOrder(
				this.fileOrder.backlink,
				this.targetFiles.backlink,
				this.fileStatus.backlink,
				this.fileInfo.backlink,
				this.settings,
			);
		}

		const midTime = performance.now();
		if (this.settings.showDebugInfo) {
			console.log(
				"Multiple Notes Outline: time required to get outlines, file view: ",
				this.targetFiles.main[0].path,
				midTime - startTime,
			);
		}

		drawUI.call(this);
		this.drawOutline(previousY);

		// 描画所要時間を測定
		const endTime = performance.now();
		if (this.settings.showDebugInfo) {
			console.log(
				"Multiple Notes Outline: time required to draw outlines, file view: ",
				this.targetFiles.main[0].path,
				endTime - midTime,
				previousY,
			);

			console.log(
				"Multiple Notes Outline: time required to refresh view, file view",
				this.targetFiles.main[0].path,
				endTime - startTime,
			);
		}
	}

	//ファイル情報、アウトライン情報を作成・取得
	async getOutlines(
		files: TFile[],
		status: FileStatus[],
	): Promise<[FileStatus[], FileInfo[], OutlineData[][]]> {
		const fileInfo: FileInfo[] = [];
		const outlineData: OutlineData[][] = [];
		for (let i = 0; i < files.length; i++) {
			//個別のAlways on Topの判定
			if (checkFlag(this.targetFiles.main[0], files[i], "top", this.settings) == true) {
				status[i].isTop = true;
			}

			if (
				(this.filecount < this.settings.readLimit || status[i].isTop) &&
				!Object.values(status[i].duplicated).includes(true)
			) {
				// files.length ==1 の場合、メインターゲットファイルを対象にしている可能性があるため、必ずbacklink filesを取得する。
				const info = await getFileInfo(
					this.app,
					files[i],
					this.settings,
					Boolean(files.length == 1),
					this.isDataviewEnabled,
				);
				fileInfo.push(info);
				const data = await getOutline(this.app, files[i], status[i], info, this.settings);
				if (data) {
					outlineData.push(data);
					status[i].outlineReady = true;
				} else {
					outlineData.push(undefined);
				}
			} else {
				fileInfo.push(undefined);
				outlineData.push(undefined);
			}

			this.filecount++;
		}
		return [status, fileInfo, outlineData];
	}

	//  アウトライン描画
	private drawOutline(previousY: number): void {
		// include only modeか  filter関連コメントアウト
		// this.includeMode = (this.settings.includeOnly != 'none') && (Boolean(this.settings.wordsToInclude.length) || (this.settings.includeBeginning));

		// 表示オンになっている見出しレベルの最高値
		this.maxLevel = this.settings.headingLevel.indexOf(true);

		const containerEl: HTMLElement = createDiv("nav-files-container node-insert-event");
		const rootEl: HTMLElement = containerEl.createDiv("tree-item nav-folder mod-root");
		const rootChildrenEl: HTMLElement = rootEl.createDiv(
			"tree-item-children nav-folder-children",
		);

		// id を付加（スクロール位置の把握用）
		containerEl.id = "MNOfileview-listcontainer";

		// Always on Top
		const categoryAOTEl: HTMLElement = rootChildrenEl.createDiv(
			"tree-item nav-folder mod-root",
		);

		// main file
		if (this.settings.showFiles.main) {
			const categoryMainEl: HTMLElement = rootChildrenEl.createDiv(
				"tree-item nav-folder mod-root",
			);
			constructNoteDOM.call(
				this,
				this.targetFiles.main,
				this.fileStatus.main,
				this.fileInfo.main,
				this.outlineData.main,
				categoryMainEl,
				"main",
				categoryAOTEl,
				this.targetFiles.main[0],
				this.fileOrder.main,
			);
		}

		// outgoing link files
		if (this.settings.showFiles.outgoing) {
			this.constructCategoryDOM(
				"outgoing",
				"links-going-out",
				"Outgoing Link Files",
				rootChildrenEl,
				categoryAOTEl,
			);
		}

		// backlink files
		if (this.settings.showFiles.backlink) {
			this.constructCategoryDOM(
				"backlink",
				"links-coming-in",
				"Backlink Files",
				rootChildrenEl,
				categoryAOTEl,
			);
		}

		// アウトライン部分の描画実行
		this.contentEl.appendChild(containerEl);

		// スクロール位置を復元
		if (this.hasMainChanged == false && previousY != 0) {
			containerEl.scrollTop = previousY;
		}
		this.hasMainChanged = false;
	}

	// categoryのDOMを作成
	private constructCategoryDOM(
		category: "outgoing" | "backlink",
		cIcon: string,
		cText: string,
		parentEl: HTMLElement,
		aotEl: HTMLElement,
	): void {
		const categoryEl: HTMLElement = parentEl.createDiv("tree-item nav-folder");
		const categoryTitleEl: HTMLElement = categoryEl.createDiv(
			"tree-item-self is-clickable mod-collapsible nav-folder-title",
		);
		setIcon(categoryTitleEl, cIcon);

		categoryTitleEl.createDiv("tree-item-inner nav-folder-title-content").setText(cText);

		//折りたたみアイコン
		const categoryCollapseIcon: HTMLElement = categoryTitleEl.createDiv(
			"tree-item-icon collapse-icon nav-folder-collapse-indicator",
		);
		setIcon(categoryCollapseIcon, "right-triangle");
		categoryCollapseIcon.addEventListener("click", async (event: MouseEvent) => {
			event.stopPropagation();
			if (this.collapseCategory[category]) {
				this.collapseCategory[category] = false;
				this.refreshView(false, false);
			} else {
				this.collapseCategory[category] = true;
				categoryEl.classList.add("is-collapsed");
				categoryCollapseIcon.classList.add("is-collapsed");
				categoryChildrenEl.style.display = "none";
			}
		});

		const categoryChildrenEl: HTMLElement = categoryEl.createDiv(
			"tree-item-children nav-folder-children",
		);

		// 折りたたまれていれば子要素を非表示にする
		if (!this.collapseCategory[category]) {
			constructNoteDOM.call(
				this,
				this.targetFiles[category],
				this.fileStatus[category],
				this.fileInfo[category],
				this.outlineData[category],
				categoryChildrenEl,
				category,
				aotEl,
				this.targetFiles.main[0],
				this.fileOrder[category],
			);
		} else {
			categoryEl.classList.add("is-collapsed");
			categoryCollapseIcon.classList.add("is-collapsed");
		}
	}

	// targetFilesの重複チェック   category:別カテゴリであればそのカテゴリ名を、同一カテゴリであればselfを指定
	checkDuplicated(
		files: TFile[],
		compare: TFile[],
		category: "main" | "outgoing" | "backlink" | "self",
		status: FileStatus[],
	): FileStatus[] {
		fileloop: for (let i = 0; i < files.length; i++) {
			for (let j = 0; j < compare.length; j++) {
				if (category == "self" && j >= i) {
					break;
				}

				if (compare[j].path === files[i].path) {
					status[i].duplicated[category] = true;
					continue fileloop;
				}
			}
		}
		return status;
	}
}
