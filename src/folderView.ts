import { setIcon, debounce, Debouncer, Menu, TFolder, Notice} from 'obsidian';

import { ItemView, WorkspaceLeaf, TFile, TAbstractFile} from 'obsidian'


import MultipleNotesOutlinePlugin, { MultipleNotesOutlineSettings, OutlineData, FileInfo, FileStatus } from 'src/main';

import { initFileStatus, getFileInfo, getOutline } from 'src/getOutline'
import { checkFlag, sortFileOrder, getTheme, setNoteTitleBackgroundColor, handleDeleteRelatedFiles, handleRenameRelatedFiles, checkRelatedFiles, checkDataview } from 'src/util';

import { drawUIFolderView } from 'src/drawUI';
import { constructNoteDOM, constructOutlineDOM } from 'src/constructDOM';
import { checkFavAndRecentFiles, deleteFavAndRecent, handleDeleteFavAndRecentFiles, handleRenameFavAndRecentFiles, updateFavAndRecent } from './FavAndRecent';

export const MultipleNotesOutlineFolderViewType = 'multiple-notes-outline-folder-view';

export class MultipleNotesOutlineFolderView extends ItemView {
	
	plugin: MultipleNotesOutlinePlugin;		
	settings:MultipleNotesOutlineSettings;

	activeFile: TFile;

	targetFolder: TFolder;
	
	targetFiles: {
		[folderPath:string]:TAbstractFile[]
	} = {};

	fileStatus: {
		[folderPath:string]:FileStatus[]
	} = {};
	
	fileInfo: {
		[folderPath:string]: FileInfo[]
	} = {};
	
	outlineData: {
		[folderPath:string]:OutlineData[][],

	} = {};

	fileOrder: {
		[folderPath:string]:number[]
	} = {};

	flagChanged: boolean = false;
	flagRegetTarget: boolean = false;
	//flagRenamed: boolean;
	flagSaveSettings: boolean = false;

	extractMode: boolean = false;
	extractTask: boolean = false;

	// include mode filter関連コメントアウト
	// includeMode: boolean;

	maxLevel: number;

	//全ファイルの折りたたみ
	collapseAll: boolean = false;


	// targetFolder が変更されたらtrueにして、スクロール位置を保持しないためのフラグ。
	hasMainChanged: boolean = false;

	//アウトラインを取得したファイル数のカウント。設定値(readLimit)を超えたら読み込みを止める。
	filecount: number = 0;

	// 変更されたファイルの配列。 一定間隔ごとにこのファイルのアウトラインを再読み込みして、更新したらこの配列を空にする
	changedFiles: TFile[] = [];
	// renamedFiles: { file: TAbstractFile, oldPath: string }[] = [];

	// viewタイプ DOMのidに付加
	viewType: 'file'|'folder' = 'folder';

	// 現在のライトモード/ダークモードの状態
	theme: 'light' | 'dark';

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
		return MultipleNotesOutlineFolderViewType;
	}

	getDisplayText(): string {
		return 'MNO - folder view';
	}

	getIcon(): string {
		return 'folders';
	}

	async onOpen(){
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

	updateSettings(){
		this.settings = this.plugin.settings;
	}

	async onClose(){
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

		// 初期の表示対象フォルダを取得（アクティブファイルのフォルダまたは最後に表示したフォルダ）
		this.activeFile = this.app.workspace.getActiveFile();
		if (this.activeFile){
			if (this.settings.openRecentAtStartup.folder && this.app.vault.getAbstractFileByPath(this.settings.recent.folder?.[0]) instanceof TFolder){
				this.targetFolder = this.app.vault.getAbstractFileByPath(this.settings.recent.folder?.[0]) as TFolder;
			} else {
				this.targetFolder = this.activeFile.parent;
			}
		} else {
			if (this.app.vault.getAbstractFileByPath(this.settings.recent.folder?.[0]) instanceof TFolder){
				this.targetFolder = this.app.vault.getAbstractFileByPath(this.settings.recent.folder?.[0]) as TFolder;
			} else {
				this.targetFolder = null;
			}
		}

		this.refreshView(true,true);


		//自動更新のためのデータ変更、ファイル追加/削除の監視 observe file change/create/delete
		const debouncerRequestRefresh:Debouncer<[]> = debounce(this.autoRefresh,3000,true);
		this.flagChanged = false;
		this.flagRegetTarget = false;

		//今後アクティブファイルに色づけする場合などは処理を追加
		// this.registerEvent(this.app.workspace.on('file-open', (file) => {
		// }));

		this.registerEvent(this.app.metadataCache.on('changed', (file) => {
			for (const folder in this.targetFiles){
				if (this.targetFiles[folder].includes(file)){
					if (!this.changedFiles.includes(file)){
						this.changedFiles.push(file);
					}
					this.flagChanged = true;
					debouncerRequestRefresh.call(this);
					break;
				}
			}
		}));

		this.registerEvent(this.app.vault.on('create',(file)=>{
			this.flagRegetTarget = true;
			debouncerRequestRefresh.call(this);
		}));

		this.registerEvent(this.app.vault.on('delete',(file)=>{
			let changedRelatedFiles = handleDeleteRelatedFiles(file,this.settings);
			if (changedRelatedFiles){
				this.flagSaveSettings = true;
			}

			let changedFavAndRecent = handleDeleteFavAndRecentFiles(file, this.settings);
			if (changedFavAndRecent){
				this.flagSaveSettings = true;
			}
			this.flagRegetTarget = true;
			debouncerRequestRefresh.call(this);
		}));

		this.registerEvent(this.app.vault.on('rename',(file, oldPath)=>{
			let changedRelatedFiles = handleRenameRelatedFiles(file,oldPath, this.settings);
			if (changedRelatedFiles){
				this.flagSaveSettings = true;
			}
			let changedFavAndRecent = handleRenameFavAndRecentFiles(file,oldPath, this.settings);
			if (changedFavAndRecent){
				this.flagSaveSettings = true;
			}
			this.flagRegetTarget = true;
			debouncerRequestRefresh.call(this);
		}));

		this.registerEvent(this.app.workspace.on('css-change', (e)=>{
			
			const newTheme = getTheme();
			if (newTheme !== this.theme){
				this.theme = newTheme;
				setNoteTitleBackgroundColor(this.theme, this.settings);
			}
		}));

	}	
		
	private async bootDelay(): Promise<void> {
		return new Promise(resolve => { setTimeout(resolve, 600);});
	}

	// ファイル修正、削除、リネームなどの際の自動更新
	private async autoRefresh(){
		if (!(this.flagChanged || this.flagRegetTarget || this.flagSaveSettings)){
			return;
		}
		if (this.flagChanged && !this.flagRegetTarget){
			for (let i=0; i < this.changedFiles.length; i++){
				for (const folder in this.targetFiles){
					let index = this.targetFiles[folder].indexOf(this.changedFiles[i]);
					if (index<0){
						continue;
					}

					//変更したファイルのファイル情報とアウトラインを更新
					this.fileInfo[folder][index] = await getFileInfo(this.app, this.targetFiles[folder][index] as TFile, this.settings, false, this.isDataviewEnabled);
					const newData = await getOutline(this.app, this.targetFiles[folder][index] as TFile, this.fileStatus[folder][index], this.fileInfo[folder][index], this.settings);
					if (newData) {
						this.outlineData[folder][index] = newData;
						this.fileStatus[folder][index].outlineReady = true;
					}

					// DOMを更新
					const updateNoteChildrenEl = document.getElementById('MNO'+this.viewType+this.targetFiles[folder][index].path);
					updateNoteChildrenEl.empty();
					constructOutlineDOM.call(this, this.targetFiles[folder][index], this.fileInfo[folder][index], this.outlineData[folder][index], updateNoteChildrenEl, 'folder');
				}
			}
		}


		if (this.flagSaveSettings){
			await this.plugin.saveSettings();
		}
		if (this.flagRegetTarget){
			this.refreshView(this.flagRegetTarget, this.flagRegetTarget);
		}
		this.changedFiles = [];
		// this.renamedFiles = [];
		this.flagRegetTarget = false;
		this.flagChanged = false;
		// this.flagRenamed = false;
		this.flagSaveSettings = false;
	}

	// リフレッシュセンター 
	// flagGetTargetがtrue: 対象ファイルを再取得
	// flagGetOutlineがtrue: アウトライン情報を再取得
	// その後UI部分とアウトライン部分を描画
	async refreshView(flagGetTarget:boolean, flagGetOutline:boolean){
		
		// 描画所要時間を測定
		const startTime = performance.now();

		//dataviewオンオフチェック
		this.isDataviewEnabled = checkDataview(this.app);

		// スクロール位置の取得
		const containerEl = document.getElementById('MNOfolderview-listcontainer');

		const previousY = containerEl?.scrollTop ? containerEl.scrollTop : 0;
		// new Notice('scroll done');


		//ターゲットフォルダが取得できていなければUIアイコンのみ描画
		if (!this.targetFolder){
			drawUIFolderView.call(this);
			return;
		}
		// フォルダに含まれるファイルを取得
		this.filecount = 0;
		if (flagGetTarget){
			if (this.targetFolder){
				this.clearDatas();
				await this.processFolder(this.targetFolder);
			}
		}

		const midTime = performance.now();
		if (this.settings.showDebugInfo){
			console.log ('Multiple Notes Outline: time required to get outlines, folder view: ',this.targetFolder.path, midTime - startTime);
		}
		drawUIFolderView.call(this);
		this.drawOutline(previousY);

		// 描画所要時間を測定
		const endTime = performance.now();
		if (this.settings.showDebugInfo){
			console.log ('Multiple Notes Outline: time required to draw outlines, folder view: ',this.targetFolder.path, endTime - midTime);
			console.log ('Multiple Notes Outline: time required to refresh view, folder view: ',this.targetFolder.path, endTime - startTime);
		}
	}

	// フォルダ内ファイルを処理（ファイル取得、ステータス初期化、情報、アウトライン取得）
	async processFolder (folder: TFolder):Promise<void> {

		this.targetFiles[folder.path] = folder.children;
		this.fileStatus[folder.path] = initFileStatus(this.targetFiles[folder.path]);
		this.fileOrder[folder.path] = [...Array(this.targetFiles[folder.path].length)].map((_, i) => i);
		sortFileOrder(this.fileOrder[folder.path], this.targetFiles[folder.path], this.fileStatus[folder.path], this.fileInfo[folder.path], this.settings);

		this.fileInfo[folder.path] = [];
		this.outlineData[folder.path] = [];


		if (folder.children.length <= this.settings.processLimit){
			[this.fileStatus[folder.path], this.fileInfo[folder.path],this.outlineData[folder.path]] = await this.getOutlines(this.targetFiles[folder.path], this.fileStatus[folder.path]);
		}
	}

	//ファイル情報、アウトライン情報を作成・取得
	async getOutlines (files: TAbstractFile[], status: FileStatus[]):Promise<[FileStatus[], FileInfo[], OutlineData[][]]> {
		let fileInfo:FileInfo[] = [];
		let outlineData: OutlineData[][] = [];
		for (let i = 0; i < files.length; i++){
			//個別のAlways on Topの判定
			if (checkFlag(this.targetFolder, files[i], 'top', this.settings) == true){
				status[i].isTop =true;
			}
			//new Notice(`checkFlagいけた ${i} ${status[i].isFolder}`);
			if (status[i].isFolder){
				// フォルダーなら新たにそのフォルダーを処理
				fileInfo.push(undefined);
				outlineData.push(undefined);
				if (!this.settings.collapseFolder){
					await this.processFolder(files[i] as TFolder);
					status[i].outlineReady = true;
				}
			} else {
				// ファイルなら情報を取得
				if (this.filecount < this.settings.readLimit || status[i].isTop ){
					const info = await getFileInfo(this.app, files[i] as TFile, this.settings, false, this.isDataviewEnabled);
					fileInfo.push(info);

					const data = await getOutline(this.app, files[i] as TFile, status[i], info, this.settings);
					if (data){
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
		}
		return [status,fileInfo,outlineData];
	}


	//  アウトライン描画	
	private drawOutline(previousY: number):void {

		// include only modeか  filter関連コメントアウト
		// this.includeMode = (this.settings.includeOnly != 'none') && (Boolean(this.settings.wordsToInclude.length) || (this.settings.includeBeginning));


		// 表示オンになっている見出しレベルの最高値
		this.maxLevel = this.settings.headingLevel.indexOf(true);


		const containerEl: HTMLElement = createDiv("nav-files-container node-insert-event");
		const rootEl: HTMLElement = containerEl.createDiv("tree-item nav-folder mod-root"); 
		const rootChildrenEl: HTMLElement = rootEl.createDiv("tree-item-children nav-folder-children"); 

		// id を付加（スクロール位置の把握用）
		containerEl.id = 'MNOfolderview-listcontainer';

		// ターゲットのフォルダ名
		const folderEl: HTMLElement = rootChildrenEl.createDiv("tree-itme nav-folder");
		const folderTitleEl: HTMLElement = folderEl.createDiv("tree-item-self is-clickable mod-collapsible nav-folder-title is-targetfolder");
		// setIcon(folderTitleEl, 'folder');
		folderTitleEl.createDiv("tree-item-inner nav-folder-title-content").setText(this.targetFolder.path);

		folderTitleEl.addEventListener(
			"contextmenu",
			(event: MouseEvent) => {
				const menu = new Menu();
				// favoriteに追加/削除
				if (this.settings.favorite.folder.includes(this.targetFolder.path)){
					menu.addItem((item)=>
						item		
							.setTitle("MNO: Remove from favorites")
							.setIcon('bookmark-minus')
							.onClick(async ()=> {
								deleteFavAndRecent.call(this, this.targetFolder.path, 'folder', 'favorite');
								await this.plugin.saveSettings();
							}));
				} else {
					menu.addItem((item)=>
						item
							.setTitle("MNO: Add to favorites")
							.setIcon('bookmark-plus')
							.onClick(async ()=> {
								updateFavAndRecent.call(this, this.targetFolder.path, 'folder','favorite');
								await this.plugin.saveSettings();
							}))
				}
				menu.showAtMouseEvent(event);
			}
		)

		const folderChildrenEl: HTMLElement = folderEl.createDiv("tree-item-children nav-folder-children");

		// Always on Top
		const categoryAOTEl: HTMLElement = folderChildrenEl.createDiv("tree-item nav-folder");


		// メインファイル
		const categoryMainEl: HTMLElement = folderChildrenEl.createDiv("tree-item nav-folder"); // mod-root を除去した
		constructNoteDOM.call(this, this.targetFiles[this.targetFolder.path], 
			this.fileStatus[this.targetFolder.path], this.fileInfo[this.targetFolder.path], this.outlineData[this.targetFolder.path],
			categoryMainEl, 'folder', categoryAOTEl, this.targetFolder, this.fileOrder[this.targetFolder.path]);
		
		// アウトライン部分の描画実行
		this.contentEl.appendChild(containerEl);

		// スクロール位置を復元
		if (this.hasMainChanged == false && previousY != 0){
			containerEl.scrollTop = previousY;
		}
		this.hasMainChanged = false;
	}

	clearDatas():void {
		this.targetFiles = {};
		this.fileStatus = {};
		this.fileInfo = {};
		this.outlineData = {};
		this.fileOrder = {};
	}

}

