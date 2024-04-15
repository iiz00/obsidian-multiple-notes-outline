import { App, TFile, TAbstractFile, Scope, Setting, Modal, Pos, stripHeading } from "obsidian";
import MultipleNotesOutlinePlugin, {
	FILE_TITLE_BACKGROUND_COLOR,
	FILE_TITLE_BACKGROUND_COLOR_HOVER,
	FileInfo,
	FileStatus,
	MultipleNotesOutlineSettings,
} from "src/main";

// data.jsonのrelatedFilesを掃除：値が空配列のプロパティを削除
export function cleanRelatedFiles(
	srcFile: TAbstractFile,
	dstFile: TAbstractFile,
	settings: MultipleNotesOutlineSettings,
): void {
	if (Object.keys(settings.relatedFiles[srcFile.path][dstFile.path]).length == 0) {
		delete settings.relatedFiles[srcFile.path][dstFile.path];
	}
	if (Object.keys(settings.relatedFiles[srcFile.path]).length === 0) {
		delete settings.relatedFiles[srcFile.path];
	}
}

// data.jsonのrelatedFilesについて、srcFileとdstFileの組み合わせで、flagで指定したフラグが存在するかチェック
export function checkFlag(
	srcFile: TAbstractFile,
	dstFile: TAbstractFile,
	flag: "fold" | "top",
	settings: MultipleNotesOutlineSettings,
): boolean {
	return settings.relatedFiles[srcFile.path]?.[dstFile.path]?.[flag];
}

// relatedFilesに指定したフラグを追加
export function addFlag(
	srcFile: TAbstractFile,
	dstFile: TAbstractFile,
	flag: "fold" | "top",
	settings: MultipleNotesOutlineSettings,
): void {
	if (!settings.relatedFiles.hasOwnProperty(srcFile.path)) {
		settings.relatedFiles[srcFile.path] = {};
	}
	if (!settings.relatedFiles[srcFile.path].hasOwnProperty(dstFile.path)) {
		settings.relatedFiles[srcFile.path][dstFile.path] = {};
	}
	settings.relatedFiles[srcFile.path][dstFile.path][flag] = true;
}

//relatedFilesから指定したフラグを除去
export function removeFlag(
	srcFile: TAbstractFile,
	dstFile: TAbstractFile,
	flag: "fold" | "top",
	settings: MultipleNotesOutlineSettings,
): void {
	delete settings.relatedFiles[srcFile.path][dstFile.path][flag];
	cleanRelatedFiles(srcFile, dstFile, settings);
}

//relatedFilesの指定したフラグをトグル
export function toggleFlag(
	srcFile: TAbstractFile,
	dstFile: TAbstractFile,
	flag: "fold" | "top",
	settings: MultipleNotesOutlineSettings,
): void {
	if (checkFlag(srcFile, dstFile, flag, settings) == true) {
		removeFlag(srcFile, dstFile, flag, settings);
	} else {
		addFlag(srcFile, dstFile, flag, settings);
	}
}

// relatedFilesのrenameに対応
export function handleRenameRelatedFiles(
	renamedFile: TAbstractFile,
	oldPath: string,
	settings: MultipleNotesOutlineSettings,
): boolean {
	let renamed = false;
	for (const srcFilePath in settings.relatedFiles) {
		for (const dstFilePath in settings.relatedFiles[srcFilePath]) {
			if (dstFilePath == oldPath) {
				settings.relatedFiles[srcFilePath][renamedFile.path] =
					settings.relatedFiles[srcFilePath][dstFilePath];
				delete settings.relatedFiles[srcFilePath][dstFilePath];
				renamed = true;
			}
		}

		if (srcFilePath == oldPath) {
			settings.relatedFiles[renamedFile.path] = settings.relatedFiles[srcFilePath];
			delete settings.relatedFiles[srcFilePath];
			renamed = true;
		}
	}
	return renamed;
}

// relatedFilesのdeleteに対応
export function handleDeleteRelatedFiles(
	deletedFile: TAbstractFile,
	settings: MultipleNotesOutlineSettings,
) {
	let deleted = false;
	for (const srcFilePath in settings.relatedFiles) {
		for (const dstFilePath in settings.relatedFiles[srcFilePath]) {
			if (dstFilePath == deletedFile.path) {
				delete settings.relatedFiles[srcFilePath][dstFilePath];
				deleted = true;
			}
		}

		if (srcFilePath == deletedFile.path) {
			delete settings.relatedFiles[srcFilePath];
			deleted = true;
		}
	}
	return deleted;
}

// テーマ（ライト/ダーク）を取得
export function getTheme(): "light" | "dark" {
	const theme = app.vault.config?.theme === "moonstone" ? "light" : "dark";
	return theme;
}

// ファイルタイトルの背景色を指定ver2（css変数を設定値に基づいて変更）  ※ファイルエクスプローラのフォルダの背景色に相当
export function setNoteTitleBackgroundColor(
	theme: "light" | "dark",
	settings: MultipleNotesOutlineSettings,
) {
	switch (settings.noteTitleBackgroundColor) {
		case "none":
			break;
		case "custom":
			document
				.getElementsByTagName("body")[0]
				.style.setProperty(
					"--MNO-filetitle-background",
					settings.customNoteTitleBackgroundColor[theme],
				);
			document
				.getElementsByTagName("body")[0]
				.style.setProperty(
					"--MNO-filetitle-background-hover",
					settings.customNoteTitleBackgroundColorHover[theme],
				);
			break;
		default:
			document
				.getElementsByTagName("body")[0]
				.style.setProperty(
					"--MNO-filetitle-background",
					FILE_TITLE_BACKGROUND_COLOR[settings.noteTitleBackgroundColor][theme],
				);
			document
				.getElementsByTagName("body")[0]
				.style.setProperty(
					"--MNO-filetitle-background-hover",
					FILE_TITLE_BACKGROUND_COLOR_HOVER[settings.noteTitleBackgroundColor][theme],
				);
			break;
	}
}

// ファイル順ソート
export function sortFileOrder(
	order: number[],
	files: TAbstractFile[],
	status: FileStatus[],
	info: FileInfo[],
	settings: MultipleNotesOutlineSettings,
): void {
	switch (settings.sortType) {
		case "alphabetAscending":
			order.sort((val1, val2) => {
				if (status[val1].isFolder != status[val2].isFolder) {
					return status[val1].isFolder == true ? 1 : -1;
				}
				return files[val1].name.localeCompare(files[val2].name);
			});
			break;
		case "alphabetDescending":
			order.sort((val1, val2) => {
				if (status[val1].isFolder != status[val2].isFolder) {
					return status[val1].isFolder == true ? 1 : -1;
				}
				return files[val2].name.localeCompare(files[val1].name);
			});
			break;
		case "ctimeDescending":
			order.sort((val1, val2) => {
				if (status[val1].isFolder != status[val2].isFolder) {
					return status[val1].isFolder == true ? 1 : -1;
				}
				return (files[val2] as TFile).stat.ctime - (files[val1] as TFile).stat.ctime;
			});
			break;

		case "ctimeAscending":
			order.sort((val1, val2) => {
				if (status[val1].isFolder != status[val2].isFolder) {
					return status[val1].isFolder == true ? 1 : -1;
				}
				return (files[val1] as TFile).stat.ctime - (files[val2] as TFile).stat.ctime;
			});
			break;

		case "mtimeDescending":
			order.sort((val1, val2) => {
				if (status[val1].isFolder != status[val2].isFolder) {
					return status[val1].isFolder == true ? 1 : -1;
				}
				return (files[val2] as TFile).stat.mtime - (files[val1] as TFile).stat.mtime;
			});
			break;

		case "mtimeAscending":
			order.sort((val1, val2) => {
				if (status[val1].isFolder != status[val2].isFolder) {
					return status[val1].isFolder == true ? 1 : -1;
				}
				return (files[val1] as TFile).stat.mtime - (files[val2] as TFile).stat.mtime;
			});
			break;

		default:
			break;
	}
}

// related Files全消去
export class ModalConfirm extends Modal {
	plugin: MultipleNotesOutlinePlugin;
	scope: Scope;
	instruction: string;

	onSubmit: () => void;

	constructor(
		app: App,
		plugin: MultipleNotesOutlinePlugin,
		instruction: string,
		onSubmit: () => void,
	) {
		super(app);
		this.plugin = plugin;
		this.instruction = instruction;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("br");
		contentEl.createEl("p", {
			text: this.instruction,
		});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Execute")
					.setCta()
					.onClick(async () => {
						this.execute();
					}),
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => {
					this.close();
				}),
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	async execute(): Promise<void> {
		this.close();
		this.onSubmit();
	}
}

// 存在しないrelatedFilesのパスをクリーンアップ
export function checkRelatedFiles(app: App, settings: MultipleNotesOutlineSettings): void {
	for (const srcFilePath in settings.relatedFiles) {
		for (const dstFilePath in settings.relatedFiles[srcFilePath]) {
			//対象パスのファイル/フォルダが存在しなければ削除
			if (!app.vault.getAbstractFileByPath(dstFilePath)) {
				delete settings.relatedFiles[srcFilePath][dstFilePath];
				if (Object.keys(settings.relatedFiles[srcFilePath]).length === 0) {
					delete settings.relatedFiles[srcFilePath];
				}
			}
		}
		// 元パスのファイル/フォルダが存在しなければ削除
		if (!app.vault.getAbstractFileByPath(srcFilePath)) {
			delete settings.relatedFiles[srcFilePath];
		}
	}
}

// subpathを含むリンクのリンク先のpositionを取得
export function getSubpathPosition(app: App, file: TFile, subpath: string): Pos | null {
	const cache = app.metadataCache.getFileCache(file);
	if (!cache) {
		return null;
	}
	const checkpath = stripHeading(subpath);
	if (cache.headings?.length) {
		const index = cache.headings.findIndex(
			(element) => stripHeading(element.heading) == checkpath,
		);
		if (index >= 0) {
			return cache.headings[index].position;
		}
	}
	if (cache.sections?.length) {
		const index = cache.sections.findIndex((element) => {
			element.id ? stripHeading(element.id) : null == checkpath;
		});
		if (index >= 0) {
			return cache.sections[index].position;
		}
	}
	return null;
}

// dataviewのチェック
export function checkDataview(app: App): boolean {
	if (app.plugins.plugins["dataview"]) {
		return true;
	} else {
		return false;
	}
}

// list calloutのチェック
export function checkListCallouts(checkString: string, callouts) {
	if (!callouts) return null;
	for (let i = 0; i < callouts.length; i++) {
		if (checkString.startsWith(callouts[i].char + " ")) {
			return i;
		}
	}
	return null;
}

// list itemを描画するか判定
export function shouldDisplayListItem(data, settings, calloutsIndex): boolean {
	// 完了タスク非表示設定であれば完了タスクはスキップ
	if (settings.hideCompletedTasks == true && data.task == "x") {
		return false;
		// 非タスク非表示設定であれば非タスクはスキップ
	}
	if (settings.taskOnly == true && data.task === void 0) {
		return false;
	}
	// 全タスク表示設定でタスクなら表示
	if (settings.allTasks == true && data.task !== void 0) {
		return true;
	}
	if (settings.dispListCallouts == true && typeof calloutsIndex === "number") {
		return true;
	}
	// レベルに応じてスキップ
	if (data.level == 2 || (data.level == 1 && settings.allRootItems == false)) {
		return false;
	}
	return true;
}
