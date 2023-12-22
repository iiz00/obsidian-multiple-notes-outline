import { Plugin, Pos, TFile } from 'obsidian';

import { MultipleNotesOutlineView, MultipleNotesOutlineViewType } from 'src/fileView'
import { MultipleNotesOutlineSettingTab } from 'src/setting'

import { MultipleNotesOutlineFolderView, MultipleNotesOutlineFolderViewType} from 'src/folderView';
import { ModalConfirm } from './util';

// 設定項目 
export interface MultipleNotesOutlineSettings {
	autoupdateFileView: boolean;
	suspendUpdateByClickingView: boolean;
	autoupdateFolderView: boolean;

	showFiles:{
		main: boolean,
		outgoing: boolean,
		backlink: boolean
	};

	showElements:{
		heading: boolean,
		link: boolean,
		tag: boolean,
		listItems: boolean
	};
	
	headingLevel: boolean[];

	hideLinksBetweenRelatedFiles: 'none' | 'mainOnly'|'toMainOnly'|'all';

	allRootItems: boolean;
	allTasks: boolean;
	taskOnly: boolean;
	hideCompletedTasks: boolean;
	displayFileInfo: string; // none || lines || tag
	viewPosition: string;	//right || left || tab || split || popout 

	wordsToIgnore:{		//filter
		heading: string[],
		link: string[],
		tag: string[],
		listItems: string[]
	};

	inlinePreview: boolean;
	tooltipPreview: boolean;
	tooltipPreviewDirection: string; // left || right || bottom || top


	includeOnly: string;	// none || heading, link, tag, listItems
	wordsToInclude: string[];
	includeBeginning: boolean;

	primeElement: string; // none || heading, link, tag, listItems
	wordsToExclude:{
		heading: string[],
		link: string[],
		tag: string[],
		listItems: string[]
	};
	wordsToExtract: string;

	icon:{	//icon for each type of element
		heading: string,
		link: string,
		tag: string,
		listItems: string,
		note: string,
		task: string,
		taskDone: string,
	};

	customIcon:{
		heading: string,
		link: string,
		tag: string,
		listItems: string,
		note: string,
		task: string,
		taskDone: string,
	};

	indent:{
		heading: boolean;
		link: boolean;
		tag: boolean;
		listItems: boolean;
	};
	indentFollowHeading: number; // 0 don't follow 1:same level 2: level+1

	prefix:{
		heading: string;
		link: string;
		tag: string;
		listItems: string;
		task: string;
		taskDone: string;
	};
	repeatHeadingPrefix: string; // none, level, level-1
	addCheckboxText: boolean;

	readLimit: number;
	processLimit: number;

	hideDuplicated: boolean;

	// ノートタイトルの背景色
	noteTitleBackgroundColor: string;
	customNoteTitleBackgroundColor: {
		light: string;
		dark: string;
	}
	customNoteTitleBackgroundColorHover: {
		light: string;
		dark: string;
	}

	tagsAOT: string[];

	showBacklinks: boolean;

	// ファイルの関係性に関する情報 srcPathのファイルがメインの場合、dstPathのファイルがfold：折りたたまれる、top：トップに表示
	relatedFiles: {
		[srcPath: string]: {
			[dstPath:string]: {
				'fold'?: boolean;
				'top'?: boolean
			};
		};
	}; 

	openAtStartup:{
		file: boolean;
		folder: boolean;
	}

	collapseFolder: boolean;
	sortType: 'alphabetAscending' | 'alphabetDescending' | 'ctimeDescending' | 'ctimeAscending' | 'mtimeDescending' | 'mtimeAscending';
	

	showDebugInfo: boolean;

	collapseAllAtStartup: boolean;

	showPropertyLinks: boolean;

	recent: {
		file: string[];
		folder: string[];
	};
	favorite: {
		file: string[];
		folder: string[];
	}

	numOfRecentFiles: number;
	pinAfterJump: boolean;  // fileViewにおいて履歴/お気に入りを開いたときにピンを付加するかどうか

	openRecentAtStartup: {
		file: boolean;
		folder: boolean;
	}

	popoutSize: {
		width: number;
		height: number;
	}

	popoutAlwaysOnTop: boolean;

	openLinkByClick: boolean;

} 

// 設定項目デフォルト
export const DEFAULT_SETTINGS: MultipleNotesOutlineSettings = {
	autoupdateFileView: true,
	suspendUpdateByClickingView: true,
	autoupdateFolderView: false,

	showFiles:{
		main: true,
		outgoing: true,
		backlink: true
	},
	
	showElements: {
		heading: true,
		link: true,
		tag: true,
		listItems: true
	},
	
	headingLevel: [true, true, true, false, false, false],

	hideLinksBetweenRelatedFiles: 'none',

	allRootItems: false,
	allTasks: true,
	taskOnly: false,
	hideCompletedTasks: false,
	displayFileInfo: 'lines',
	viewPosition: 'right',

	wordsToIgnore:{
		heading: [],
		link: [],
		tag: [],
		listItems: []
	},

	inlinePreview: true,
	tooltipPreview: true,
	tooltipPreviewDirection: 'left',

	
	includeOnly: 'none',
	wordsToInclude: [],
	includeBeginning: true,

	primeElement: 'none',
	wordsToExclude:{
		heading: [],
		link: [],
		tag: [],
		listItems: []
	},
	wordsToExtract: '',

	icon:{	
		heading: 'none',
		link: 'link',
		tag: 'tag',
		listItems: 'list',
		note: 'file',
		task: 'square',
		taskDone: 'check-square'
	},
	customIcon:{
		heading: 'hash',
		link: 'link',
		tag: 'tag',
		listItems: 'list',
		note:'file',
		task:'square',
		taskDone:'check-square'
	},

	indent:{
		heading: true,
		link: true,
		tag: true,
		listItems: true,
	},
	indentFollowHeading: 2,
	prefix:{
		heading: '',
		link: '',
		tag: '',
		listItems: '',
		task: '',
		taskDone: ''
	},
	repeatHeadingPrefix:'none',
	addCheckboxText: false,
	
	hideDuplicated: true,

	readLimit: 50,
	processLimit: 100,

	noteTitleBackgroundColor: 'accent',
	customNoteTitleBackgroundColor: {
		light: '#BEBEBE',
		dark: '#4E4E4E'
	},
	customNoteTitleBackgroundColorHover: {
		light: '#AEAEAE',
		dark:'#5E5E5E'
	},
	
	tagsAOT:[],

	showBacklinks: true,

	relatedFiles: {},

	openAtStartup:{
		file: false,
		folder: false
	},

	collapseFolder: true,
	sortType:  'alphabetAscending',

	showDebugInfo: false,
	collapseAllAtStartup: false,

	showPropertyLinks: true,

	recent: {
		file: [],
		folder:[]
	},
	favorite: {
		file:[],
		folder:[]
	},

	numOfRecentFiles: 30,
	pinAfterJump: true,

	openRecentAtStartup: {
		file: false,
		folder: false,
	},

	popoutSize: {
		width: 600,
		height: 800
	},
	popoutAlwaysOnTop: false,

	openLinkByClick: false,
	
}


export interface FileStatus {
	isFolded: boolean; // 現在フォールドされているか
	isTop: boolean; // Always on top フラグが立っているか
	duplicated: {
		main:boolean,
		outgoing:boolean,
		backlink:boolean,
		self:boolean
	};	 // 同じファイルが既にリスト内にあるか (file view)
	outlineReady: boolean; // outlineを取得したかどうか
	isFolder:boolean ; 
}

export interface FileInfo {
	lines: string[];
	numOfLines: number;
	backlinks?: TFile[];
	frontmatterLinks?: {
		displayText?: string;
		key: string;
		link: string;
		original: string;
	}[];
}

export interface OutlineData {	

	typeOfElement:'heading'|'link'|'tag'|'listItems';
	position:Pos;
	link?:string;
	displayText?: string;
	// level ：listItemsについては0：トップ、1：ルート、2：それ以下
	level?:number;
	task?: string|undefined;
}

export const FILE_TITLE_BACKGROUND_COLOR = {
	default: {
		light: '#F6F6F6',
		dark: '#262626'
	},
	accent: {
		light: '#E3E3E3',
		dark: '#363636'
	}
}

export const FILE_TITLE_BACKGROUND_COLOR_HOVER = {
	default: {
		light: '#E3E3E3',
		dark: '#363636'
	},
	accent: {
		light: '#D3D3D3',
		dark: '#464646'
	}
}

export default class MultipleNotesOutlinePlugin extends Plugin {

	settings: MultipleNotesOutlineSettings;
	view: MultipleNotesOutlineView;

	folderview: MultipleNotesOutlineFolderView;

	async onload() {
		
		await this.loadSettings();
		//register custome view according to Devloper Docs
		this.registerView(
			MultipleNotesOutlineViewType,
			(leaf) => (this.view =new MultipleNotesOutlineView(leaf, this, this.settings))
		);

		this.registerView(
			MultipleNotesOutlineFolderViewType,
			(leaf) => (this.folderview =new MultipleNotesOutlineFolderView(leaf, this, this.settings))
		);
	
		//コマンド追加
		this.addCommand({
			id: 'open-file-view',
			name: 'Open File View',

			callback: async ()=> {
				this.checkFileView(true);
			}
		});
		this.addCommand({
			id: 'open-folder-view',
			name: 'Open Folder View',

			callback: async ()=> {
				this.checkFolderView(true);
			}
		});

		this.addCommand({
			id: 'erase-all-fold-AOT-information',
			name: 'Erase all folding/always-on-top information',
			callback: async()=>{
				const onSubmit = async()=>{
					this.settings.relatedFiles ={};
					await this.saveSettings();
				}
				new ModalConfirm(this.app, this, 'Are you sure you want to erase all folding/always-on-top information?', onSubmit).open();
			}
		});
		this.addCommand({
			id: 'erase-non-favorite-fold-AOT-information',
			name: 'Erase folding/always-on-top information except favorite files/folders',
			callback: async()=>{
				const onSubmit = async()=>{
					for (let srcFilePath in this.settings.relatedFiles){
						if(!this.settings.favorite.file.includes(srcFilePath) && !this.settings.favorite.folder.includes(srcFilePath)){
							delete this.settings.relatedFiles[srcFilePath];
						} else{
						}
					}
					await this.saveSettings();
				}
				new ModalConfirm(this.app, this, 'Are you sure you want to erase folding/always-on-top information of not favorite files/folders?', onSubmit).open();
			}
		});
	
		// viewの更新(アップデート時用)

		this.app.workspace.onLayoutReady(async()=>{
			if (this.settings.openAtStartup.file){
				this.checkFileView(false);
			}
			if (this.settings.openAtStartup.folder){
				this.checkFolderView(false);
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MultipleNotesOutlineSettingTab(this.app, this));

	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	checkFileView = async(activateView: boolean):Promise<void> => {

		let [leaf] = this.app.workspace.getLeavesOfType(MultipleNotesOutlineViewType);
		if (!leaf) {
			switch (this.settings.viewPosition) {
				case 'right':
					leaf = this.app.workspace.getRightLeaf(false);
					break;
				case 'left':
					leaf = this.app.workspace.getLeftLeaf(false);
					break;
				case 'tab':
					leaf = this.app.workspace.getLeaf('tab');
					break;
				case 'split':
					leaf = this.app.workspace.getLeaf('split');
					break;
				case 'popout':
					leaf = this.app.workspace.getLeaf('window');
					break;
			}
			await leaf.setViewState({ type: MultipleNotesOutlineViewType});
		}

		if (activateView){
			this.app.workspace.revealLeaf(leaf);
		}

	} 

	checkFolderView = async(activateView: boolean):Promise<void> => {

		let [leaf] = this.app.workspace.getLeavesOfType(MultipleNotesOutlineFolderViewType);
		if (!leaf) {
			switch (this.settings.viewPosition) {
				case 'right':
					leaf = this.app.workspace.getRightLeaf(false);
					break;
				case 'left':
					leaf = this.app.workspace.getLeftLeaf(false);
					break;
				case 'tab':
					leaf = this.app.workspace.getLeaf('tab');
					break;
				case 'split':
					leaf = this.app.workspace.getLeaf('split');
					break;
				case 'popout':
					leaf = this.app.workspace.getLeaf('window');
					break;
			}
			await leaf.setViewState({ type: MultipleNotesOutlineFolderViewType});
		}
		if (activateView){
			this.app.workspace.revealLeaf(leaf);
		}

	} 
 
}