import { MarkdownView, Notice, setIcon, debounce, Debouncer, Menu, TFolder, ViewStateResult} from 'obsidian';

import { ItemView, WorkspaceLeaf, TFile, TAbstractFile} from 'obsidian'


import MultipleNotesOutlinePlugin, { MultipleNotesOutlineSettings, OutlineData, FileInfo, FileStatus } from 'src/main';

import { ModalExtract } from 'src/modalExtract'
import { getBacklinkFiles, getOutgoingLinkFiles } from 'src/getTargetFiles';
import { initFileStatus, getFileInfo, getOutline } from 'src/getOutline'
import { addFlag, changeNoteTitleBackgroundColor, checkFlag, cleanRelatedFiles, removeFlag, toggleFlag, sortFileOrder } from 'src/util';

import { drawUI, drawUIFolderView } from 'src/drawUI';
import { constructNoteDOM, constructOutlineDOM } from 'src/constructDOM';


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

	flagChanged: boolean;
	flagRegetTarget: boolean;
	flagRenamed: boolean;

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
	renamedFiles: { file: TAbstractFile, oldPath: string }[] = [];

	// viewタイプ DOMのidに付加
	viewType: string = 'MNOfolderview';

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

		this.initView();

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
			this.flagRegetTarget = true;
			debouncerRequestRefresh.call(this);
		}));

		this.registerEvent(this.app.vault.on('rename',(file, oldPath)=>{
			this.renamedFiles.push( {file, oldPath});
			this.flagRegetTarget = true;
			this.flagRenamed = true;
			debouncerRequestRefresh.call(this);
		}));
	}

	async onClose(){
		// Nothin to clean up
	}

	private async initView() {
		await this.bootDelay(); //起動直後に少しウエイト（DNOの時はこれがないとデータ取得に失敗していた）
		this.collapseAll = this.settings.collapseAllAtStartup;
		
		if (this.targetFolder){
			this.refreshView(true, true);
		} else {
			this.activeFile = this.app.workspace.getActiveFile();
			if (this.activeFile){
				this.targetFolder = this.activeFile.parent;
				this.refreshView(true,true);
			} else {
			console.log("failed to get active file");
			}
		}
	}	
		
	private async bootDelay(): Promise<void> {
		return new Promise(resolve => { setTimeout(resolve, 2100);});
	}

	// ファイル修正、削除、リネームなどの際の自動更新
	private async autoRefresh(){
		if (!(this.flagChanged || this.flagRegetTarget || this.flagRenamed)){
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
					this.fileInfo[folder][index] = await getFileInfo(this.app, this.targetFiles[folder][index] as TFile, this.settings);
					const newData = await getOutline(this.app, this.targetFiles[folder][index] as TFile, this.fileStatus[folder][index], this.fileInfo[folder][index], this.settings);
					if (newData) {
						this.outlineData[folder][index] = newData;
						this.fileStatus[folder][index].outlineReady = true;
					}

					// DOMを更新
					const updateNoteChildrenEl = document.getElementById(this.viewType+this.targetFiles[folder][index].path);
					updateNoteChildrenEl.empty();
					constructOutlineDOM.call(this, this.targetFiles[folder][index], this.fileInfo[folder][index], this.outlineData[folder][index], updateNoteChildrenEl, 'folder');
				}
			}
		}

		if (this.flagRenamed){
			for (let i=0; i < this.renamedFiles.length; i++){

				// relatedFilesをアップデート
				for (let srcFilePath in this.settings.relatedFiles){

					for (let dstFilePath in this.settings.relatedFiles[srcFilePath]){
						if (dstFilePath == this.renamedFiles[i].oldPath){
							this.settings.relatedFiles[srcFilePath][this.renamedFiles[i].file.path]= this.settings.relatedFiles[srcFilePath][dstFilePath];
							delete this.settings.relatedFiles[srcFilePath][dstFilePath];
						}
					}

					if (srcFilePath == this.renamedFiles[i].oldPath){
						this.settings.relatedFiles[this.renamedFiles[i].file.path]= this.settings.relatedFiles[srcFilePath];
						delete this.settings.relatedFiles[srcFilePath];
					}
				}
			}
			await this.plugin.saveSettings();
		}
		if (this.flagRegetTarget){
			this.refreshView(this.flagRegetTarget, this.flagRegetTarget);
		}
		this.changedFiles = [];
		this.renamedFiles = [];
		this.flagRegetTarget = false;
		this.flagChanged = false;
		this.flagRenamed = false;
	}

	// リフレッシュセンター 
	// flagGetTargetがtrue: 対象ファイルを再取得
	// flagGetOutlineがtrue: アウトライン情報を再取得
	// その後UI部分とアウトライン部分を描画
	async refreshView(flagGetTarget:boolean, flagGetOutline:boolean){
		
		// 描画所要時間を測定
		const startTime = performance.now();
		
		// ファイル名背景色を再設定
		changeNoteTitleBackgroundColor(this.plugin.settings);

		// スクロール位置の取得
		const containerEl = document.getElementById('MNOfolderview-listcontainer');

		const previousY = containerEl?.scrollTop ? containerEl.scrollTop : 0;

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
			console.log ('time required to get outlines, folder view: ',this.targetFolder.path, midTime - startTime);
		}

		drawUIFolderView.call(this);
		this.drawOutline(previousY);

		// 描画所要時間を測定
		const endTime = performance.now();
		if (this.settings.showDebugInfo){
			console.log ('time required to draw outlines, folder view: ',this.targetFolder.path, endTime - midTime);
			console.log ('time required to refresh view, folder view: ',this.targetFolder.path, endTime - startTime);
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
				if ((this.filecount < this.settings.readLimit || status[i].isTop )){
					const info = await getFileInfo(this.app, files[i] as TFile, this.settings);
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
		const folderTitleEl: HTMLElement = folderEl.createDiv("tree-item-self is-clickable mod-collapsible nav-folder-title");
		// setIcon(folderTitleEl, 'folder');
		folderTitleEl.createDiv("tree-item-inner nav-folder-title-content").setText(this.targetFolder.path);

		// Always on Top
		const categoryAOTEl: HTMLElement = rootChildrenEl.createDiv("tree-item nav-folder mod-root");


		// メインファイル
		const categoryMainEl: HTMLElement = rootChildrenEl.createDiv("tree-item nav-folder mod-root");
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

