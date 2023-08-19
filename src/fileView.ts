import { setIcon, debounce, Debouncer } from 'obsidian';

import { ItemView, WorkspaceLeaf, TFile, TAbstractFile} from 'obsidian'


import MultipleNotesOutlinePlugin, { MultipleNotesOutlineSettings, OutlineData, FileInfo, FileStatus } from 'src/main';

import { getBacklinkFiles, getOutgoingLinkFiles } from 'src/getTargetFiles';
import { initFileStatus, getFileInfo, getOutline } from 'src/getOutline'
import { addFlag, changeNoteTitleBackgroundColor, checkFlag, cleanRelatedFiles, removeFlag, toggleFlag, sortFileOrder } from 'src/util';

import { drawUI } from 'src/drawUI';
import { constructNoteDOM, constructOutlineDOM } from 'src/constructDOM';

export const MultipleNotesOutlineViewType = 'multiple-notes-outline';

export type Category = 'main'|'outgoing'|'backlink';

export class MultipleNotesOutlineView extends ItemView {
	
	plugin: MultipleNotesOutlinePlugin;		
	settings:MultipleNotesOutlineSettings;

	activeFile: TFile;
	targetFiles: {
		main:TFile[],
		outgoing:TFile[],
		backlink:TFile[],
	} = {
		main:[],
		outgoing:[],
		backlink:[]
	};

	fileStatus: {
		main: FileStatus[],
		outgoing: FileStatus[],
		backlink: FileStatus[],
	} = {
		main:[],
		outgoing:[],
		backlink:[]
	}
	
	fileInfo: {
		main: FileInfo[],
		outgoing: FileInfo[],
		backlink: FileInfo[],
	} = {
		main:[],
		outgoing:[],
		backlink:[]
	};
	
	outlineData: {
		main:OutlineData[][],
		outgoing: OutlineData[][],
		backlink: OutlineData[][]
	} = {
		main:[],
		outgoing:[],
		backlink:[]
	};

	fileOrder: {
		main: number[],
		outgoing: number[],
		backlink: number[],
	} = {
		main:[],
		outgoing:[],
		backlink:[]
	}

	flagChanged: boolean;
	flagRegetTarget: boolean;
	flagRenamed: boolean;

	extractMode: boolean = false;
	extractTask: boolean = false;

	// include mode いったんコメントアウト
	// includeMode: boolean;

	maxLevel: number;

	//全ファイルの折りたたみ
	collapseAll: boolean = false;
	//カテゴリ単位の折りたたみ
	collapseCategory: {outgoing: boolean, backlink: boolean} = {
		outgoing:false,
		backlink: false
	}

	//プラグインビュー経由で別ファイルを開いた際に、ビューの更新を保留するためのフラグ。
	//ビューから別ファイルに移動したらtrueにして、一回だけビューの更新をスキップする。
	holdUpdateOnce: boolean = false;

	// targetFiles.main が変更されたらtrueにして、スクロール位置を保持しないためのフラグ。
	hasMainChanged: boolean = false;

	//アウトラインを取得したファイル数のカウント。設定値(readLimit)を超えたら読み込みを止める。
	filecount: number = 0;

	// 変更されたファイルの配列。 一定間隔ごとにこのファイルのアウトラインを再読み込みして、更新したらこの配列を空にする
	changedFiles: TFile[] = [];
	renamedFiles: { file: TFile, oldPath: string }[] = [];

	// viewタイプ DOMのidに付加
	viewType: string = 'MNOfileview';

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
		return 'MNO - file view';
	}
  
	getIcon(): string {
		return 'files';
	}

	
	async onOpen(){

		this.initView();

		//自動更新のためのデータ変更、ファイル追加/削除の監視 observe file change/create/delete
		const debouncerRequestRefresh:Debouncer<[]> = debounce(this.autoRefresh,3000,true);
		this.flagChanged = false;
		this.flagRegetTarget = false; 

		this.registerEvent(this.app.workspace.on('file-open', (file) => {
			if (file instanceof TFile){
				this.activeFile = file;

				if (!this.settings.autoupdateFileView || (this.settings.suspendUpdateByClickingView && this.holdUpdateOnce)){
					// autoupdateがfalseか、 viewからの直接の遷移の場合更新しない設定であれば更新をスキップ
				} else {
					this.targetFiles.main[0] = this.activeFile;
					this.hasMainChanged = true;
					this.refreshView(true,true);
				}
				this.holdUpdateOnce = false;
			}
		}));

		this.registerEvent(this.app.metadataCache.on('changed', (file) => {
			let category: Category;
			for (category in this.targetFiles){
				if (this.targetFiles[category].includes(file)){
					if (!this.changedFiles.includes(file)){
						this.changedFiles.push(file);
					}
					this.flagChanged = true;
					debouncerRequestRefresh.call(this);
					//単にdebouncerRequestRefresh()だとthisがグローバルオブジェクトになってしまう
					break;
				}
			}
		}));

		// ファイルビューにおいてはcreateは無関係
		// this.registerEvent(this.app.vault.on('create',(file)=>{
		// 	if (file instanceof TFile){
		// 		this.flagRegetAll = true;
		// 		debouncerRequestRefresh.call(this);
		// 	}
		// }));


		this.registerEvent(this.app.vault.on('delete',(file)=>{
			if (file instanceof TFile){

				// メインファイル以外の削除の場合ビューを遷移しない処理
				if (file == this.activeFile && file != this.targetFiles.main[0]){
					this.holdUpdateOnce = true;
				}

				this.flagRegetTarget = true;
				debouncerRequestRefresh.call(this);
			}
		}));

		this.registerEvent(this.app.vault.on('rename',(file, oldPath)=>{
			if (file instanceof TFile){
				this.renamedFiles.push( {file, oldPath});
				this.flagRenamed = true;
				debouncerRequestRefresh.call(this);
			}
		}));
	}

	async onClose(){
		// Nothin to clean up
	}

	private async initView() {
		await this.bootDelay(); //起動直後に少しウエイト（DNOの時はこれがないとデータ取得に失敗していた）
		this.collapseAll = this.settings.collapseAllAtStartup;

		this.activeFile = this.app.workspace.getActiveFile();
		if (this.activeFile){
			this.targetFiles.main[0]= this.activeFile;
			this.refreshView(true, true);
		} else {
			console.log("failed to get active file");
		}
	}

	private async bootDelay(): Promise<void> {
		return new Promise(resolve => { setTimeout(resolve, 200);});
	}

	// ファイル修正、削除、リネームなどの際の自動更新
	private async autoRefresh(){
		if (!(this.flagChanged || this.flagRegetTarget || this.flagRenamed)){
			return;
		}
		
		if (this.flagChanged){
			for (let i=0; i < this.changedFiles.length; i++){
				let category: Category;
				for (category in this.targetFiles){
					let index = this.targetFiles[category].indexOf(this.changedFiles[i]);
					if (index<0){
						continue;
					}

					//変更したファイルのファイル情報とアウトラインを更新
					this.fileInfo[category][index] = await getFileInfo(this.app, this.targetFiles[category][index],this.settings);
					const newData = await getOutline(this.app, this.targetFiles[category][index], this.fileStatus[category][index], this.fileInfo[category][index], this.settings);
					if (newData) {
						this.outlineData[category][index] = newData;
						this.fileStatus[category][index].outlineReady = true;
					}

					// DOMを更新
					const updateNoteChildrenEl = document.getElementById(this.viewType+this.targetFiles[category][index].path);
					updateNoteChildrenEl.empty();
					constructOutlineDOM.call(this, this.targetFiles[category][index], this.fileInfo[category][index],this.outlineData[category][index], updateNoteChildrenEl, category);
				}
			}
			this.changedFiles =[];
		}

		if (this.flagRenamed){
			for (let i=0; i < this.renamedFiles.length; i++){
				// viewに対象ファイルがあればアップデート
				let category: Category;
				for (category in this.targetFiles){
					let index = this.targetFiles[category].findIndex( (targetfile)=> targetfile.path == this.renamedFiles[i].oldPath);  // TFileかpathにあわせて比較する必要
					if (index<0){
						continue;
					}

					//変更したファイルのファイル情報とアウトラインを更新
					this.targetFiles[category][index] = this.renamedFiles[i].file;
					this.fileInfo[category][index] = await getFileInfo(this.app, this.targetFiles[category][index], this.settings);
					const newData = await getOutline(this.app, this.targetFiles[category][index],this.fileStatus[category][index], this.fileInfo[category][index], this.settings);
					if (newData){
						this.outlineData[category][index] = newData; 
						this.fileStatus[category][index].outlineReady = true;
					}
					
				}

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
			this.renamedFiles =[];
		}
		if (this.flagRegetTarget){
			this.refreshView(this.flagRegetTarget, this.flagRegetTarget);
		}
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
		const containerEl = document.getElementById('MNOfileview-listcontainer');

		const previousY = containerEl?.scrollTop ? containerEl.scrollTop : 0;

		// メインターゲットファイルのfileInfoとoutlineを取得
		this.filecount = 0;
		if (flagGetTarget){

			this.fileStatus.main = initFileStatus(this.targetFiles.main);
			this.fileOrder.main = [...Array(this.targetFiles.main.length)].map((_, i) => i);
			[this.fileStatus.main, this.fileInfo.main,this.outlineData.main] = await this.getOutlines(this.targetFiles.main, this.fileStatus.main);

			// 現ファイル情報をもとにアウトゴーイングリンク/バックリンク先のファイルを取得
			this.targetFiles.outgoing = getOutgoingLinkFiles(this.app, this.targetFiles.main[0], this.outlineData.main[0]);
			this.fileStatus.outgoing = initFileStatus(this.targetFiles.outgoing);
			this.fileOrder.outgoing = [...Array(this.targetFiles.outgoing.length)].map((_, i) => i);

			this.targetFiles.backlink = this.fileInfo.main[0].backlinks;
			this.fileStatus.backlink = initFileStatus(this.targetFiles.backlink);
			this.fileOrder.backlink = [...Array(this.targetFiles.backlink.length)].map((_, i) => i);

			//重複チェック
			this.checkDuplicated(this.targetFiles.outgoing, this.targetFiles.main, 'main', this.fileStatus.outgoing);
			this.checkDuplicated(this.targetFiles.outgoing, this.targetFiles.outgoing, 'self', this.fileStatus.outgoing);
			this.checkDuplicated(this.targetFiles.backlink, this.targetFiles.main, 'main', this.fileStatus.backlink);
			this.checkDuplicated(this.targetFiles.backlink, this.targetFiles.outgoing, 'outgoing', this.fileStatus.backlink);
			this.checkDuplicated(this.targetFiles.backlink, this.targetFiles.backlink, 'self', this.fileStatus.backlink);

		}
		// アウトゴーイング/バックリンクファイルのfileInfoとoutlineを取得
		// ファイル数がprocessLimitを超過していないときのみ読み込む
		if(flagGetOutline && this.targetFiles.outgoing.length + this.targetFiles.backlink.length <= this.settings.processLimit){

			[this.fileStatus.outgoing, this.fileInfo.outgoing,this.outlineData.outgoing] = await this.getOutlines(this.targetFiles.outgoing, this.fileStatus.outgoing);
			[this.fileStatus.backlink, this.fileInfo.backlink,this.outlineData.backlink] = await this.getOutlines(this.targetFiles.backlink, this.fileStatus.backlink);
			sortFileOrder(this.fileOrder.backlink, this.targetFiles.backlink, this.fileStatus.backlink, this.fileInfo.backlink, this.settings);
		}

		const midTime = performance.now();
		if (this.settings.showDebugInfo){
			console.log ('time required to get outlines, file view: ',this.targetFiles.main[0], midTime - startTime);
		}

		drawUI.call(this);
		this.drawOutline(previousY);

		// 描画所要時間を測定
		const endTime = performance.now();
		if (this.settings.showDebugInfo){
			console.log ('time required to draw outlines, file view: ',this.targetFiles.main[0], endTime - midTime, previousY);

			console.log ('time required to refresh view, file view',this.targetFiles.main[0].path, endTime - startTime);
		}
	}

	//ファイル情報、アウトライン情報を作成・取得
	async getOutlines (files: TFile[], status: FileStatus[]):Promise<[FileStatus[], FileInfo[], OutlineData[][]]> {
		let fileInfo:FileInfo[] = [];
		let outlineData: OutlineData[][] = [];
		for (let i = 0; i < files.length; i++){
			//個別のAlways on Topの判定
			if (checkFlag(this.targetFiles.main[0], files[i], 'top', this.settings) == true){
				status[i].isTop =true;
			}

			if ((this.filecount < this.settings.readLimit || status[i].isTop ) && !Object.values(status[i].duplicated).includes(true)){
				const info = await getFileInfo(this.app, files[i], this.settings);
				fileInfo.push(info);
				const data = await getOutline(this.app, files[i], status[i], info, this.settings);
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
		containerEl.id = 'MNOfileview-listcontainer';

		// Always on Top
		const categoryAOTEl: HTMLElement = rootChildrenEl.createDiv("tree-item nav-folder mod-root");

		// main file
		if (this.settings.showFiles.main){
			const categoryMainEl: HTMLElement = rootChildrenEl.createDiv("tree-item nav-folder mod-root");
			constructNoteDOM.call(this, this.targetFiles.main, this.fileStatus.main, this.fileInfo.main, this.outlineData.main, 
				categoryMainEl, 'main', categoryAOTEl, this.targetFiles.main[0], this.fileOrder.main);
		}

		// outgoing link files
		if (this.settings.showFiles.outgoing){
			this.constructCategoryDOM('outgoing', 'links-going-out', 'Outgoing Link Files', rootChildrenEl, categoryAOTEl);
		}

		// backlink files
		if (this.settings.showFiles.backlink){
			this.constructCategoryDOM('backlink', 'links-coming-in', 'Backlink Files', rootChildrenEl, categoryAOTEl);
		}
		
		// アウトライン部分の描画実行
		this.contentEl.appendChild(containerEl);

		// スクロール位置を復元
		if (this.hasMainChanged == false && previousY !=0){
			containerEl.scrollTop = previousY;
		}
		this.hasMainChanged = false;
	}

	// カテゴリー部分のDOMを作成
	private constructCategoryDOM(category: 'outgoing'|'backlink', cIcon: string, cText: string, parentEl:HTMLElement, aotEl:HTMLElement):void {
		const categoryEl: HTMLElement = parentEl.createDiv("tree-item nav-folder");
		const categoryTitleEl: HTMLElement = categoryEl.createDiv("tree-item-self is-clickable mod-collapsible nav-folder-title");
		setIcon(categoryTitleEl, cIcon);

		categoryTitleEl.createDiv("tree-item-inner nav-folder-title-content").setText(cText);
		
		//折りたたみアイコン
		const categoryCollapseIcon:HTMLElement = categoryTitleEl.createDiv("tree-item-icon collapse-icon nav-folder-collapse-indicator");
		setIcon(categoryCollapseIcon,"right-triangle");
		categoryCollapseIcon.addEventListener(
			"click",
			async (event: MouseEvent) => {
				event.stopPropagation();
				if (this.collapseCategory[category]){
					this.collapseCategory[category] = false;
					this.refreshView(false,false);
				} else {
					this.collapseCategory[category] = true;
					categoryEl.classList.add('is-collapsed');
					categoryCollapseIcon.classList.add('is-collapsed');
					categoryChildrenEl.style.display = 'none';
				}
			}
		)

		const categoryChildrenEl:HTMLElement = categoryEl.createDiv("tree-item-children nav-folder-children");
		
		// 折りたたまれていれば子要素を非表示にする
		if (!this.collapseCategory[category]){

			constructNoteDOM.call(this, this.targetFiles[category], this.fileStatus[category], this.fileInfo[category], this.outlineData[category],
				 categoryChildrenEl, category, aotEl, this.targetFiles.main[0],this.fileOrder[category]);
		} else {
			categoryEl.classList.add('is-collapsed');
			categoryCollapseIcon.classList.add('is-collapsed');
		}
	}

	// targetFilesの重複チェック   category:別カテゴリであればそのカテゴリ名を、同一カテゴリであればselfを指定
	checkDuplicated(files:TFile[],compare:TFile[],category:'main'|'outgoing'|'backlink'|'self', status:FileStatus[]):FileStatus[]{
		fileloop: for (let i = 0; i < files.length; i++){

			for (let j = 0; j < compare.length; j++){
				if (category == 'self' && j>= i){
					break;
				}

				if (compare[j].path === files[i].path){
					status[i].duplicated[category] = true;
					continue fileloop;
				}
			}
			
		}
		return status;
	}

}

