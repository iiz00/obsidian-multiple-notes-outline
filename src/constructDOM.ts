import { TFile, setIcon, Menu, MarkdownView, App, TAbstractFile, TFolder, setTooltip, parseLinktext, getLinkpath } from 'obsidian';

import { OutlineData, FileInfo, FileStatus } from 'src/main';
import { MultipleNotesOutlineViewType, Category } from './fileView';
import { getFileInfo, getOutline } from 'src/getOutline';
import { addFlag, checkFlag, checkListCallouts, cleanRelatedFiles, getSubpathPosition, removeFlag, shouldDisplayListItem, toggleFlag } from 'src/util';
import { deleteFavAndRecent, updateFavAndRecent } from './FavAndRecent';


export function constructNoteDOM (files:TAbstractFile[], status: FileStatus[], info: FileInfo[], data:OutlineData[][], 
    parentEl:HTMLElement, category:Category, aotEl:HTMLElement, srcFile: TAbstractFile, order:number[]): void {
        for (let i=0; i<files.length ; i++){

			const si = order[i];  // sorted i

			// 重複しており、かつ重複ファイルは非表示設定であればスキップ
			if (Object.values(status[si].duplicated).includes(true) && this.settings.hideDuplicated){
				continue;
			}

			const noteType = status[si].isFolder ? 'folder':'file';

			// ノートのタイトル部分作成 (Explorerのフォルダに相当）
			// AOTフラグオンならトップに
			const belongsAOT = Boolean(status[si].isTop == true && !Object.values(status[si].duplicated).includes(true)) && category != 'main';
			let noteEl: HTMLElement;
			if (belongsAOT){
				noteEl = aotEl.createDiv("tree-item nav-folder");
			} else {
				noteEl = parentEl.createDiv("tree-item nav-folder");
			}

			const noteTitleEl: HTMLElement = noteEl.createDiv("tree-item-self is-clickable mod-collapsible nav-folder-title");

			// アイコンの設定
			let nIcon;
			if (belongsAOT){
				nIcon = 'pin';
			} else {
				if (noteType == 'folder'){
					nIcon = 'folder';
				} else {
					nIcon = 'file';
				}
			}
			setIcon(noteTitleEl, nIcon);

			//ノートタイトルの親要素がmod-rootクラスを含まないなら、view上は2階層目に位置するので、stickyの表示位置を下げるis-subfolderクラスを付与する
			if (!noteEl.parentElement.classList.contains("mod-root") ){
				noteTitleEl.classList.add("is-subfolder");
			}



			const noteChildrenEl: HTMLElement = noteEl.createDiv("tree-item-children nav-folder-children");
		
			// id 付加
			noteChildrenEl.id = 'MNO'+this.viewType+files[si].path;

			// 折りたたみアイコン
			const noteCollapseIcon:HTMLElement = noteTitleEl.createDiv("tree-item-icon collapse-icon nav-folder-collapse-indicator");
			setIcon(noteCollapseIcon,"right-triangle");

			//  折りたたみアイコンクリック時の処理
			noteCollapseIcon.addEventListener(
				"click",
				async (event: MouseEvent) => {
					event.stopPropagation();

					// アウトラインが読み込まれていない場合
					if (!status[si].outlineReady){
						if (noteType =='folder'){
							// フォルダの場合
							await this.processFolder(files[si] as TFolder);
							status[si].outlineReady = true;

							noteEl.classList.remove('is-collapsed');
							noteCollapseIcon.classList.remove('is-collapsed');

							constructNoteDOM.call(this, this.targetFiles[files[si].path],
								this.fileStatus[files[si].path], this.fileInfo[files[si].path],this.outlineData[files[si].path],
								noteChildrenEl, 'folder', aotEl, srcFile, this.fileOrder[files[si].path]);
							noteEl.appendChild(noteChildrenEl);
						} else if (((files[si] as TFile)?.extension) =='md'){
							info[si] = await getFileInfo(this.app, files[si] as TFile, this.settings, false, this.isDataviewEnabled);
							data[si] = await getOutline(this.app, files[si] as TFile, status[si], info[si], this.settings);
							status[si].outlineReady = true;

							noteEl.classList.remove('is-collapsed');
							noteCollapseIcon.classList.remove('is-collapsed');

							// noteDOMにファイル情報を追加
							attachFileInfo(noteTitleEl, status[si], info[si], data[si], this.settings.displayFileInfo);

							constructOutlineDOM.call(this, files[si], info[si], data[si], noteChildrenEl, category);
						} else {
							//md以外のファイル
						}
					} else if (status[si].isFolded){
						// フォールドされている場合
						
						// 個別フォールドフラグを除去
						if ( (!this.collapseAll) &&
						(!status[si].duplicated.main || !this.settings.showFiles.main) &&
						(!status[si].duplicated.outgoing || !this.settings.showFiles.outgoing) &&
						(!status[si].duplicated.self)) {
							if (checkFlag(srcFile, files[si], 'fold', this.settings)){
								removeFlag(srcFile, files[si], 'fold', this.settings);
								await this.plugin.saveSettings();
							}
						}

						// オープン処理
						noteEl.classList.remove('is-collapsed');
						noteCollapseIcon.classList.remove('is-collapsed');
						status[si].isFolded = false;
						noteChildrenEl.style.display = 'block';

					} else {
						// 開いている場合	
					
						// 個別フォールドフラグを追加
						if ( (!this.collapseAll) &&
						(!status[si].duplicated.main || !this.settings.showFiles.main) &&
						(!status[si].duplicated.outgoing || !this.settings.showFiles.outgoing) &&
						(!status[si].duplicated.self)) {
							
							addFlag(srcFile,files[si],'fold',this.settings);
						}
						await this.plugin.saveSettings();
			
						// フォールド処理
						noteEl.classList.add('is-collapsed');
						noteCollapseIcon.classList.add('is-collapsed');
						status[si].isFolded = true;
						noteChildrenEl.style.display = 'none';
					}
			})

			// ファイル名
			let nameLabel = (noteType == 'folder')? files[si].name : (files[si] as TFile).basename;
			if (noteType == 'folder'){
				nameLabel = files[si].name
			} else {
				nameLabel = (files[si] as TFile).basename;
				if ((files[si] as TFile).extension !== 'md'){
					nameLabel = nameLabel +'.'+ (files[si] as TFile).extension;
				}
			}
			noteTitleEl.createDiv("tree-item-inner nav-folder-title-content").setText(nameLabel);

			//ファイル名の後の情報を表示
			attachFileInfo(noteTitleEl, status[si], info[si], data[si], this.settings.displayFileInfo);

			//ノートタイトルをクリックしたらそのファイルをopen
			if (noteType == 'file'){
				noteTitleEl.addEventListener(
					"click",
					(event: MouseEvent) => {
						if (files[si] != this.activeFile){
							this.holdUpdateOnce = true;
						}
						this.app.workspace.getLeaf().openFile(files[si]);
					},
					false
				);

				//hover preview 
				noteTitleEl.addEventListener('mouseover', (event: MouseEvent) => {
					this.app.workspace.trigger('hover-link', {
						event,
						source: MultipleNotesOutlineViewType,
						hoverParent: parentEl,   // rootEl→parentElにした
						targetEl: noteTitleEl,
						linktext: files[si].path,
					});
				});
			}

			// コンテキストメニュー
			noteTitleEl.addEventListener(
				"contextmenu",
				(event: MouseEvent) => {
					const menu = new Menu();

					menu.addSeparator();

					//Always on Top に指定/解除
					if (checkFlag(srcFile, files[si], 'top', this.settings)){
						menu.addItem((item)=>
							item
								.setTitle("MNO: Stop displaying at the top")
								.setIcon('pin-off')
								.onClick(async ()=> {
									removeFlag(srcFile, files[si], 'top', this.settings);
									await this.plugin.saveSettings();
									this.refreshView(true, true);
								}));
					} else {
						menu.addItem((item)=>
							item
								.setTitle("MNO: Always display at the top")
								.setIcon('pin')
								.onClick(async ()=> {
									addFlag(srcFile, files[si], 'top', this.settings);
									await this.plugin.saveSettings();
									this.refreshView(true, true);
								}))
					}

					// favoriteに追加/削除
					if (this.settings.favorite[noteType].includes(files[si].path)){
						menu.addItem((item)=>
							item
								.setTitle("MNO: Remove from favorites")
								.setIcon('bookmark-minus')
								.onClick(async ()=> {
									deleteFavAndRecent.call(this, files[si].path, noteType, 'favorite');
									await this.plugin.saveSettings();
								}));
					} else {
						menu.addItem((item)=>
							item
								.setTitle("MNO: Add to favorites")
								.setIcon('bookmark-plus')
								.onClick(async ()=> {
									updateFavAndRecent.call(this, files[si].path,noteType,'favorite');
									await this.plugin.saveSettings();
								}))
					}
					menu.addSeparator();

					if (noteType == 'file'){
						//新規タブ に開く
						menu.addItem((item)=>
							item
								.setTitle("Open in new tab")
								.setIcon("file-plus")
								.onClick(()=> {
									if (files[si] != this.activeFile){
										this.holdUpdateOnce = true;
									}
									event.preventDefault();
									this.app.workspace.getLeaf('tab').openFile(files[si]);
								})
						);
						//右に開く
						menu.addItem((item)=>
							item
								.setTitle("Open to the right")
								.setIcon("separator-vertical")
								.onClick(()=> {
									if (files[si] != this.activeFile){
										this.holdUpdateOnce = true;
									}
									event.preventDefault();
									this.app.workspace.getLeaf('split').openFile(files[si]);
								})
						);
						//新規ウィンドウに開く
						menu.addItem((item)=>
							item
								.setTitle("Open in new window")
								.setIcon("scan")
								.onClick(async()=> {
									if (files[si] != this.activeFile){
										this.holdUpdateOnce = true;
									}
									// await this.app.workspace.getLeaf('window').openFile(linkTarget);
									await this.app.workspace.openPopoutLeaf({size:{width:this.settings.popoutSize.width,height:this.settings.popoutSize.height}}).openFile(files[si]);
									if (this.settings.popoutAlwaysOnTop){
										setPopoutAlwaysOnTop();
									}
								})
						);
					}
					// this.app.workspace.trigger(
					// 	"file-menu",
					// 	menu,
					// 	files[si],
					// 	'link-context-menu'
					// );
					menu.showAtMouseEvent(event);
				}
			);

			// もしアウトラインが準備できていなければスキップする
			if (!status[si].outlineReady){
				noteEl.classList.add('is-collapsed');
				noteCollapseIcon.classList.add('is-collapsed');
				continue;
			}

			
			if (noteType == 'folder'){
				// サブフォルダのDOMを作成
				constructNoteDOM.call(this, this.targetFiles[files[si].path],
					this.fileStatus[files[si].path], this.fileInfo[files[si].path], this.outlineData[files[si].path],
					noteChildrenEl, 'folder', aotEl, srcFile, this.fileOrder[files[si].path]);
			} else {
				// アウトラインDOMを作成
				constructOutlineDOM.call(this, files[si], info[si], data[si], noteChildrenEl, category);
			}
			
			// 折りたたまれていれば子要素を非表示にする
			// 折りたたまれているのは以下のケース
			// collpaseAllが有効な場合、
			// ファイルビューで各カテゴリ（メイン/アウトゴーイング/自カテゴリ）に重複がある場合、
			// relatedFilesで折りたたみフラグが立っている場合
			if ((this.collapseAll) ||
				(status[si].duplicated.main && this.settings.showFiles.main) ||
				(status[si].duplicated.outgoing && this.settings.showFiles.outgoing) ||
				(status[si].duplicated.self) ||
				(this.settings.relatedFiles?.[srcFile.path]?.[files[si].path]?.fold)) {
					noteEl.classList.add('is-collapsed');
					noteCollapseIcon.classList.add('is-collapsed');
					status[si].isFolded = true;
					noteChildrenEl.style.display = 'none';
			} else {
				status[si].isFolded = false;
			}
		}
}


export function constructOutlineDOM (file:TFile, info:FileInfo, data: OutlineData[], parentEl:HTMLElement, category: Category):void{

	// include mode 用の変数を宣言 filter関連コメントアウト
	// let isIncluded = this.settings.includeBeginning;
	// let includeModeHeadingLevel: number;

	// exclude mode 用変数 filter関連コメントアウト
	// let isExcluded = false;
	// let excludeType: string;
	// let excludeModeHeadingLevel: number;
	// let primeType = this.settings.includeOnly == 'none' ? this.settings.primeElement : this.settings.includeOnly;
	
	// extract マッチする項目があったかどうか filter関連コメントアウト
	// let isExtracted = false;

	const isCanvas = Boolean(file.extension == 'canvas');

	// propertiesの処理
	if (this.settings.showPropertyLinks && info.frontmatterLinks && !(category =='outgoing' && this.settings.hideMinor2hopLink)){
		frontmatterlinksloop: for (let j = 0; j < info.frontmatterLinks.length; j++){
		
			const linkTarget = this.app.metadataCache.getFirstLinkpathDest(parseLinktext(info.frontmatterLinks[j].link).path, file.path);
			if (!(linkTarget instanceof TFile)) {
				continue;
			}
			const linkSubpath = parseLinktext(info.frontmatterLinks[j].link).subpath;
			// 抽出 extract  filter関連コメントアウト
			// if (this.extractMode == true) {
			// 	if (this.extractTask == true || !info[i].frontmatterLinks[j].displayText.toLowerCase().includes(this.settings.wordsToExtract.toLowerCase())){
			// 		continue;
			// 	} else {
			// 		isExtracted = true;
			// 	}
			// }

			// hideLinksBetweenRelatedFilesの設定に従って重複除外
			if (this.settings.hideLinksBetweenRelatedFiles == 'mainOnly'){
				if (category == 'main'){
					continue;
				}
				if (linkTarget.path == this.targetFiles.main?.[0].path){
					continue;
				}
			}
			if (this.settings.hideLinksBetweenRelatedFiles == 'toMainOnly'){
				if (linkTarget.path == this.targetFiles.main?.[0].path){
					continue;
				}
			}
			if (this.settings.hideLinksBetweenRelatedFiles == 'all'){
				for (let category in this.targetFiles){
					// info.frontmatterLinks[j].linkに一致するファイル名があるかどうかの処理。
					if (this.targetFiles[category].some( (targetfile) => targetfile.path == linkTarget.path)){
						continue frontmatterlinksloop;
					}
				}
			}


			const outlineEl: HTMLElement = parentEl.createDiv("tree-item nav-file");
			const outlineTitle: HTMLElement = outlineEl.createDiv("tree-item-self is-clickable nav-file-title");
			setIcon(outlineTitle,'link');
	
			outlineTitle.style.paddingLeft ='0.5em';
			outlineTitle.createDiv("tree-item-inner nav-file-title-content").setText(info.frontmatterLinks[j].displayText);

			//クリック時
			outlineTitle.addEventListener(
				"click",
				(event: MouseEvent) => {
					if (this.settings.openLinkByClick){
						// openLinkByClick が trueならリンク先を開く
						if (linkTarget != this.activeFile){
							this.holdUpdateOnce = true;
						}
						this.app.workspace.getLeaf().openFile(linkTarget);
					} else {
						if (file != this.activeFile){
							this.holdUpdateOnce = true;
						}
						this.app.workspace.getLeaf().openFile(file);
					}
				},
				false
			);
			//hover preview 
			outlineTitle.addEventListener('mouseover', (event: MouseEvent) => {
				if (linkTarget){
					//リンク情報にsubpath（見出しへのリンク）が含まれる場合、その位置を取得
					let posInfo = {};
					if(linkSubpath){
						const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
						if (subpathPosition?.start?.line){
							posInfo = { scroll: subpathPosition.start.line};
						}
					}
					this.app.workspace.trigger('hover-link', {
						event,
						source: MultipleNotesOutlineViewType,
						hoverParent: parentEl,   // rootEl→parentElにした
						targetEl: outlineTitle,
						linktext: linkTarget.path,
						state: posInfo
					});
				}
			});

			// contextmenu
			outlineTitle.addEventListener(
				"contextmenu",
				(event: MouseEvent) => {
					const menu = new Menu();

					//抽出 filter関連コメントアウト
					// menu.addItem((item) =>
					// 	item
					// 		.setTitle("Extract")
					// 		.setIcon("search")
					// 		.onClick(async ()=>{
					// 			this.plugin.settings.wordsToExtract = data[j].displayText;
					// 			await this.plugin.saveSettings();
					// 			this.extractMode = true;
					// 			this.extractTask = false;
					// 			this.refreshView(false,false);
					// 		})
					// );
					// menu.addSeparator();


					menu.addItem((item)=>
						item
							.setTitle("Open linked file")
							.setIcon("links-going-out")
							.onClick(async()=>{
								if (linkTarget != this.activeFile){
									this.holdUpdateOnce = true;
								}
								await this.app.workspace.getLeaf().openFile(linkTarget);

								if (linkSubpath){
									const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
									scrollToElement(subpathPosition.start?.line,0,this.app);
								}
							})
					);
					menu.addSeparator();

					//リンク先を新規タブに開く
					menu.addItem((item)=>
						item
							.setTitle("Open linked file in new tab")
							.setIcon("file-plus")
							.onClick(async()=> {
								if (linkTarget != this.activeFile){
									this.holdUpdateOnce = true;
								}
								await this.app.workspace.getLeaf('tab').openFile(linkTarget);
								if (linkSubpath){
									// linkSubpathがあるときはそこまでスクロール
									const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
									scrollToElement(subpathPosition.start?.line, 0, this.app);
								}
							})
					);
					//リンク先を右に開く
					menu.addItem((item)=>
						item
							.setTitle("Open linked file to the right")
							.setIcon("separator-vertical")
							.onClick(async()=> {
								if (linkTarget != this.activeFile){
									this.holdUpdateOnce = true;
								}
								await this.app.workspace.getLeaf('split').openFile(linkTarget);
								if (linkSubpath){
									const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
									scrollToElement(subpathPosition.start?.line, 0, this.app);
								}
							})
					);
					//リンク先を新規ウィンドウに開く
					menu.addItem((item)=>
						item
							.setTitle("Open linked file in new window")
							.setIcon("scan")
							.onClick(async()=> {
								if (linkTarget != this.activeFile){
									this.holdUpdateOnce = true;
								}
								// await this.app.workspace.getLeaf('window').openFile(linkTarget);
								await this.app.workspace.openPopoutLeaf({size:{width:this.settings.popoutSize.width,height:this.settings.popoutSize.height}}).openFile(linkTarget);
								if (linkSubpath){
									const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
									scrollToElement(subpathPosition.start?.line, 0, this.app);
								}
								if (this.settings.popoutAlwaysOnTop){
									setPopoutAlwaysOnTop();
								}
							})
					);
					menu.addSeparator();

					//新規タブに開く
					menu.addItem((item)=>
						item
							.setTitle("Open in new tab")
							.setIcon("file-plus")
							.onClick(async()=> {
								if (file != this.activeFile){
									this.holdUpdateOnce = true;
								}
								await this.app.workspace.getLeaf('tab').openFile(file);
							})
					);
					//右に開く
					menu.addItem((item)=>
						item
							.setTitle("Open to the right")
							.setIcon("separator-vertical")
							.onClick(async()=> {
								if (file != this.activeFile){
									this.holdUpdateOnce = true;
								}
								await this.app.workspace.getLeaf('split').openFile(file);
							})
					);
					//新規ウィンドウに開く
					menu.addItem((item)=>
						item
							.setTitle("Open in new window")
							.setIcon("scan")
							.onClick(async()=> {
								if (file != this.activeFile){
									this.holdUpdateOnce = true;
								}
								await this.app.workspace.getLeaf('window').openFile(file);
							})
					);

					menu.showAtMouseEvent(event);
				}
			);
		}
	}

	// 最新の見出しレベル
	let latestHeadingLevel = 0;

	//アウトライン要素の描画。data[i]が要素0ならスキップ
	//二重ループから抜けるためラベルelementloopをつけた
	if (data.length > 0){

		elementloop: for (let j=0; j<data.length; j++){

			// 現アウトライン要素の種別を取得
			const element = data[j].typeOfElement;
			let displayText = data[j].displayText;
			const linkTarget = (element !== 'link')? null : this.app.metadataCache.getFirstLinkpathDest(parseLinktext(data[j]?.link).path, file.path);
			const linkSubpath = (!linkTarget)? undefined : parseLinktext(data[j]?.link).subpath;

			//// include mode filter関連コメントアウト
			// if (this.includeMode && this.settings.includeOnly == element){
			// 	if (isIncluded == true && element == 'heading' && data[j].level > includeModeHeadingLevel  ){
			// 		//下位見出しの場合は処理をスキップ
			// 	} else {
			// 		// 組み入れるワードにマッチするか判定
			// 		isIncluded = false;
			// 		for (const value of this.settings.wordsToInclude){
			// 			if ( (value) && data[j].displayText.includes(value)){
			// 				isIncluded = true;
			// 				if (element == 'heading'){
			// 					includeModeHeadingLevel = data[j].level;
			// 				}
			// 			}
			// 		}
			// 	}
			// }
			// if (!isIncluded){
			// 	continue;
			// }
			
			//// exclude mode filter関連コメントアウト
			// if (!isExcluded || (isExcluded && (excludeType == element || primeType == element))){
			// 	if (element == 'heading' && data[j].level > excludeModeHeadingLevel){
			// 	// 下位見出しの場合は処理をスキップ	
			// 	} else {
			// 		isExcluded = false;
			// 		for (const value of this.settings.wordsToExclude[element]){
			// 			if ( (value) && data[j].displayText.includes(value)){
			// 				isExcluded = true;
			// 				excludeType = element;
			// 				if (element == 'heading'){
			// 					excludeModeHeadingLevel = data[j].level;
			// 				}
			// 			}
			// 		}

			// 	}
			// }   
			// if (isExcluded){
			// 	continue;
			// }


			
			//要素ごとの非表示判定  設定で非表示になっていればスキップ
			
			if (this.settings.showElements[element] == false){
				continue;
			}



			// simple filter 除外ワードにマッチすればスキップ filter関連コメントアウト
			// for (const value of this.settings.wordsToIgnore[element]){
			// 	if( (value) && data[j].displayText.includes(value)){
			// 		continue elementloop;
			// 	}
			// }

			//// 抽出 extract filter関連コメントアウト
			// if (this.extractMode == true) {
			// 	if (this.extractTask == false && !data[j].displayText.includes(this.settings.wordsToExtract)){
			// 		continue;
			// 	} else if (this.extractTask == true && data[j].task === void 0){
			// 		continue;
			// 	} else {
			// 		isExtracted = true;
			// 	}
			// }



			//// 要素種別ごとの処理
			
			// headings
			if (element == 'heading'){
				// 最新の見出しレベルを取得
				latestHeadingLevel = data[j].level;
				// 特定の見出しレベルが非表示の場合、該当すればスキップ
				if ( !this.settings.headingLevel[data[j].level - 1]){
					continue;
				}
			}

			// links
			if (element == 'link'){
				if (this.settings.hideLinksBetweenRelatedFiles == 'mainOnly'){
					if (category == 'main'){
						continue;
					}
					if (this.app.metadataCache.getFirstLinkpathDest(data[j].link, file.path)?.path == this.targetFiles.main?.[0].path){
						continue;
					}
				}
				if (this.settings.hideLinksBetweenRelatedFiles == 'toMainOnly'){
					if (this.app.metadataCache.getFirstLinkpathDest(data[j].link, file.path)?.path == this.targetFiles.main?.[0].path){
						continue;
					}
				}
				if (this.settings.hideLinksBetweenRelatedFiles == 'all'){
					if (linkTarget.path){
						for (let category in this.targetFiles){
							// data[j].linkに一致するファイル名があるかどうかの処理。
							if (this.targetFiles[category].some( (targetfile) => targetfile.path == linkTarget.path)){
								continue elementloop;
							}
						}
					}
				}
				if (this.settings.hideMinor2hopLink && category == 'outgoing'){
					continue;
				}
			}

			// tags
			if (element == 'tag'){
			}


			// listItems
			let calloutsIndex = undefined;
			if (element == 'listItems'){
				if (this.settings.dispListCallouts){
					calloutsIndex = checkListCallouts(displayText, this.app.plugins.plugins?.['obsidian-list-callouts']?.settings);
				}
				if (shouldDisplayListItem(data[j], this.settings, calloutsIndex) == false){
					continue;
				}
				// // 完了タスク非表示設定であれば完了タスクはスキップ
				// if (this.settings.hideCompletedTasks == true && data[j].task =='x'){
				// 	continue;
				// // 非タスク非表示設定であれば非タスクはスキップ
				// } else if (this.settings.taskOnly == true && data[j].task === void 0){
				// 	continue;
				// // 非タスクの通常リストアイテム、または タスクは全表示の設定で無ければレベルに応じてスキップ
				// } else if (this.settings.allTasks == false || data[j].task === void 0){
				// 	if ( (data[j].level == 2) || (data[j].level ==1 && this.settings.allRootItems == false)){
				// 		continue;
				// 	}
				// }
			}


			//アウトライン要素部分作成
			const outlineEl: HTMLElement = parentEl.createDiv("tree-item nav-file");
			//中身を設定
			const outlineTitle: HTMLElement = outlineEl.createDiv("tree-item-self is-clickable nav-file-title");


			//アイコン icon
			switch(this.settings.icon[element]){
				case 'none':
					break;
				case 'headingwithnumber':
					setIcon(outlineTitle, `heading-${data[j].level}`);
					break;
				case 'custom':
					setIcon(outlineTitle, this.settings.customIcon[element]);
					break;
				default:
					setIcon(outlineTitle, this.settings.icon[element]);
					break;
			}

			// タスクだった場合アイコン上書き
			if (element =='listItems' && data[j].task !== void 0){
				if (data[j].task == 'x'){
					setIcon(outlineTitle, this.settings.icon.taskDone == 'custom' ? 
						this.settings.customIcon.taskDone : this.settings.icon.taskDone);
				} else {
					setIcon(outlineTitle, this.settings.icon.task =='custom' ?
						this.settings.customIcon.task : this.settings.icon.task);
				}
			}

			// リストに対する処理タスクだった場合アイコン上書き
			if (element =='listItems'){
				//タスクだった場合アイコン上書き
				if (data[j].task !== void 0){
					if (data[j].task == 'x'){
						setIcon(outlineTitle, this.settings.icon.taskDone == 'custom' ? 
							this.settings.customIcon.taskDone : this.settings.icon.taskDone);
					} else {
						setIcon(outlineTitle, this.settings.icon.task =='custom' ?
							this.settings.customIcon.task : this.settings.icon.task);
					}
				}

				//リストコールアウトへの対応
				if (typeof calloutsIndex =='number') {
					outlineTitle.style.backgroundColor =`RGBA(${this.app.plugins.plugins['obsidian-list-callouts'].settings[calloutsIndex].color},0.15)`;
					if (this.app.plugins.plugins['obsidian-list-callouts'].settings[calloutsIndex].hasOwnProperty('icon') && data[j].task === void 0){
						setIcon(outlineTitle, this.app.plugins.plugins['obsidian-list-callouts'].settings[calloutsIndex].icon);
						displayText = displayText.replace(/^.\s/,'');
					}
				}
			}

			//prefix
			let prefix = this.settings.prefix[element];
			if ( element == 'heading'){
				switch (this.settings.repeatHeadingPrefix){
					case 'level':
						prefix = prefix.repeat(data[j].level);
						break;
					case 'levelminus1':
						prefix = prefix.repeat(data[j].level - 1 );
						break;
				}
			}

			// インデント
			let indent: number = 0.5;
			//見出しのインデント
			if (element == 'heading' && this.settings.indent.heading == true) {
				indent = indent + (data[j].level - (this.maxLevel + 1))*1.5;
			}
			// 見出し以外のインデント
			if (element !='heading' && this.settings.indentFollowHeading){
				const additionalIndent = (latestHeadingLevel - (this.maxLevel + 1) + (this.settings.indentFollowHeading == 2 ? 1: 0))*1.5;
				indent = indent + (additionalIndent > 0 ? additionalIndent : 0);
			}
			// リンクが前のエレメントと同じ行だった場合インデント付加
			if (!isCanvas && element =='link' && data[j].position.start.line == data[j-1]?.position.start.line){
				indent = indent + 1.5;
			}

			outlineTitle.style.paddingLeft = `${indent}em`;

			if (element =='listItems' && data[j].task !== void 0) {
					prefix = data[j].task == 'x' ? 
						this.settings.prefix.taskDone : this.settings.prefix.task;
					if (this.settings.addCheckboxText){
						prefix = prefix + '['+data[j].task+'] ';
					}
			}
			
			outlineTitle.createDiv("tree-item-inner nav-file-title-content").setText(prefix + displayText);


			// インラインプレビュー
			// リンクとタグは、アウトライン要素のあとに文字列が続く場合その行をプレビュー、そうでなければ次の行をプレビュー
			if (!isCanvas && this.settings.inlinePreview ) {
				let previewText: string ='';
				
				if ((element == 'link' || element == 'tag') && data[j].position.end.col < info.lines[ data[j].position.start.line ].length){
					previewText = info.lines[ data[j].position.start.line ].slice(data[j].position.end.col);
				} else {
					previewText = ( data[j].position.start.line < info.numOfLines -1 )?
						info.lines[ data[j].position.start.line + 1] : ""; 
				}
				outlineTitle.createDiv("nav-file-title-preview").setText(previewText);
			}


			// ツールチッププレビュー
			// その要素の行から次の要素の前までをプレビュー
			if (this.settings.tooltipPreview){
				if (!isCanvas){
					let previewText2:string ='';

					// まず次の表示要素の引数を特定
					let endLine:number = info.numOfLines - 1;  //初期値は文章末
					let k = j +1; // 現在のアウトライン引数+1からループ開始
					endpreviewloop: while (k< data.length) {
						//表示するエレメントタイプであれば行を取得してループを打ち切る
						if (this.settings.showElements[data[k].typeOfElement]){
							//ただし各種の実際には非表示となる条件を満たしていたら打ち切らない
							// リストの設定による非表示
							if (data[k].typeOfElement == 'listItems' &&
									( data[k].level >=2 ||
									((this.settings.allRootItems == false && data[k].level == 1) && (this.settings.allTasks == false || data[k].task === void 0)) ||
									(this.settings.taskOnly && data[k].task === void 0) ||
									(this.settings.hideCompletedTasks && data[k].task == 'x'))){
								k++;
								continue;
							// 見出しのレベルによる非表示
							} else if (data[k].typeOfElement == 'heading' &&
								this.settings.headingLevel[data[k].level - 1] == false){
								k++;
								continue;
							// simple filterによる非表示
							} else {
								for (const value of this.settings.wordsToIgnore[data[k].typeOfElement]){
									if( (value) && data[k].displayText.includes(value)){
										k++;
										continue endpreviewloop;
									} 
								}
								endLine = data[k].position.start.line -1;
								break;
							}
						}
						k++;
					}
					for (let l = data[j].position.start.line; l <= endLine; l++){
						previewText2 = previewText2 + info.lines[l] +'\n';
					}
					// 空行を除去
					previewText2 = previewText2.replace(/\n$|\n(?=\n)/g,'');
					setTooltip(outlineTitle, previewText2, {classes:['MNO-preview']});
	
					outlineTitle.dataset.tooltipPosition = this.settings.tooltipPreviewDirection;
					outlineTitle.setAttribute('data-tooltip-delay','10');
				} else {
					//canvas だった場合カードにプレビューを付加
					if (data[j].typeOfElement =='listItems'){
					setTooltip(outlineTitle, data[j].displayText, {classes:['MNO-preview']});
					outlineTitle.dataset.tooltipPosition = this.settings.tooltipPreviewDirection;
					outlineTitle.setAttribute('data-tooltip-delay','10');
					}
				}
			}

			//クリック時
			outlineTitle.addEventListener(
				"click",
				async(event: MouseEvent) => {
					if (this.settings.openLinkByClick == true && element =='link'){
						// openLinkByClick true かつエレメントがリンクならリンク先を開く
						if (linkTarget != this.activeFile){
							this.holdUpdateOnce = true;
						}
						await this.app.workspace.getLeaf().openFile(linkTarget);
						if (linkSubpath){
							const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
							scrollToElement(subpathPosition.start?.line, 0, this.app);
						}
					} else if (!isCanvas) {
						if (file != this.activeFile){
							this.holdUpdateOnce = true;
						}
						await this.app.workspace.getLeaf().openFile(file);
						scrollToElement(data[j].position.start.line,data[j].position.start.col,this.app);
					}
				},
				false
			);

			//hover preview
			outlineTitle.addEventListener('mouseover', (event: MouseEvent) => {
				// リンクエレメントでリンク先が存在するときはそちらをプレビュー
				if (element == 'link' && linkTarget){
					//リンク情報にsubpath（見出しへのリンク）が含まれる場合、その位置を取得
					
					let posInfo = {};
					if (linkSubpath){
						const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
						if (subpathPosition?.start?.line){
							posInfo = { scroll: subpathPosition.start.line};
						}
					}
					this.app.workspace.trigger('hover-link', {
						event,
						source: MultipleNotesOutlineViewType,
						hoverParent: parentEl,   // rootEl→parentElにした
						targetEl: outlineTitle,
						linktext: linkTarget.path,
						//state:{scroll: data[j].position.start.line}
						state: posInfo
					});
				} else {
					if (!isCanvas){
						this.app.workspace.trigger('hover-link', {
							event,
							source: MultipleNotesOutlineViewType,
							hoverParent: parentEl,   // rootEl→parentElにした
							targetEl: outlineTitle,
							linktext: file.path,
							state:{scroll: data[j].position.start.line}
						});
					}
				}
				
			});

			// contextmenu
			outlineTitle.addEventListener(
				"contextmenu",
				(event: MouseEvent) => {
					const menu = new Menu();

					//抽出 filter関連コメントアウト
					// menu.addItem((item) =>
					// 	item
					// 		.setTitle("Extract")
					// 		.setIcon("search")
					// 		.onClick(async ()=>{
					// 			this.plugin.settings.wordsToExtract = data[j].displayText;
					// 			await this.plugin.saveSettings();
					// 			this.extractMode = true;
					// 			this.extractTask = false;
					// 			this.refreshView(false,false);
					// 		})
					// );
					// menu.addSeparator();


					if (element =='link'){
						menu.addItem((item)=>
							item
								.setTitle("Open linked file")
								.setIcon("links-going-out")
								.onClick(async()=>{
									if (linkTarget != this.activeFile){
										this.holdUpdateOnce = true;
									}
									await this.app.workspace.getLeaf().openFile(linkTarget);
									if (linkSubpath){
										const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
										scrollToElement(subpathPosition.start?.line,0,this.app);
									}
								})
						);
						menu.addSeparator();
						//リンク先を新規タブに開く
						menu.addItem((item)=>
							item
								.setTitle("Open linked file in new tab")
								.setIcon("file-plus")
								.onClick(async()=> {
									if (linkTarget != this.activeFile){
										this.holdUpdateOnce = true;
									}
									await this.app.workspace.getLeaf('tab').openFile(linkTarget);
									if (linkSubpath){
										// linkSubpathがあるときはそこまでスクロール
										const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
										scrollToElement(subpathPosition.start?.line, 0, this.app);
									}
								})
						);
						//リンク先を右に開く
						menu.addItem((item)=>
							item
								.setTitle("Open linked file to the right")
								.setIcon("separator-vertical")
								.onClick(async()=> {
									if (linkTarget != this.activeFile){
										this.holdUpdateOnce = true;
									}
									await this.app.workspace.getLeaf('split').openFile(linkTarget);
									if (linkSubpath){
										const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
										scrollToElement(subpathPosition.start?.line, 0, this.app);
									}
								})
						);
						//リンク先を新規ウィンドウに開く
						menu.addItem((item)=>
							item
								.setTitle("Open linked file in new window")
								.setIcon("scan")
								.onClick(async()=> {
									if (linkTarget != this.activeFile){
										this.holdUpdateOnce = true;
									}
									// await this.app.workspace.getLeaf('window').openFile(linkTarget);
									await this.app.workspace.openPopoutLeaf({size:{width:this.settings.popoutSize.width,height:this.settings.popoutSize.height}}).openFile(linkTarget);
									if (linkSubpath){
										const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
										scrollToElement(subpathPosition.start?.line, 0, this.app);
									}
									if (this.settings.popoutAlwaysOnTop){
										setPopoutAlwaysOnTop();
									}
								})
						);
						menu.addSeparator();
					}
					// タグの場合
					if (element =='tag'){
						menu.addItem((item)=>
							item
								.setTitle("Search this tag")
								.setIcon("search")
								.onClick(async()=>{
									const searchString = "tag: #"+ displayText;
									this.app.internalPlugins.plugins["global-search"]?.instance.openGlobalSearch(searchString);
								})
						);
						menu.addSeparator();
					}
					// 以下はcanvasでは非表示
					if (!isCanvas){

						//新規タブに開く
						menu.addItem((item)=>
							item
								.setTitle("Open in new tab")
								.setIcon("file-plus")
								.onClick(async()=> {
									if (file != this.activeFile){
										this.holdUpdateOnce = true;
									}
									await this.app.workspace.getLeaf('tab').openFile(file);
									scrollToElement(data[j].position.start.line, data[j].position.start.col, this.app);
	
								})
						);
						//右に開く
						menu.addItem((item)=>
							item
								.setTitle("Open to the right")
								.setIcon("separator-vertical")
								.onClick(async()=> {
									if (file != this.activeFile){
										this.holdUpdateOnce = true;
									}
									await this.app.workspace.getLeaf('split').openFile(file);
									scrollToElement(data[j].position.start.line, data[j].position.start.col, this.app);
								})
						);
						//新規ウィンドウに開く
						menu.addItem((item)=>
							item
								.setTitle("Open in new window")
								.setIcon("scan")
								.onClick(async()=> {
									if (file != this.activeFile){
										this.holdUpdateOnce = true;
									}
									await this.app.workspace.openPopoutLeaf({size:{width:this.settings.popoutSize.width,height:this.settings.popoutSize.height}}).openFile(file);
									scrollToElement(data[j].position.start.line, data[j].position.start.col, this.app);
								})
						);
					}

					menu.showAtMouseEvent(event);
				}
			);

		}
	} else {
		//要素0だったときの処理
		//各行をチェックし、空行でない初めの行を表示する(抽出モードでは行わない)
		//if (this.extractMode == false){       //filter関連コメントアウト
		if (true){
			for (let j = 0; j < info.lines.length; j++){

				if (info.lines[j] == ""){
					continue;
				} else {
					const outlineEl: HTMLElement = parentEl
							.createDiv("tree-item nav-file");
					const outlineTitle: HTMLElement = outlineEl.createDiv("tree-item-self is-clickable nav-file-title");
					outlineTitle.createDiv("tree-item-inner nav-file-title-content").setText(info.lines[j]);
					outlineTitle.addEventListener(
						"click",
						async(event: MouseEvent) => {
							if (file != this.activeFile){
								this.holdUpdateOnce = true;
							}
							event.preventDefault();
							await this.app.workspace.getLeaf().openFile(file);
						},
						false
					);
					break;
				}
			}
		}


	}
	// main以外の場合、backlink filesの処理
	if (category =='main' || this.settings.showBacklinks == false || !info.backlinks || (category =='backlink' && this.settings.hideMinor2hopLink)){
		return;
	}
	backlinkfileloop: for (let i = 0; i < info.backlinks?.length; i++){

		// targetFilesに含まれていれば除外する

		for (const targetCategory in this.targetFiles){
			if (this.targetFiles[targetCategory].includes(info.backlinks[i])){
				continue backlinkfileloop;
			}
		}

		const outlineEl: HTMLElement = parentEl.createDiv("tree-item nav-file");
		const outlineTitle: HTMLElement = outlineEl.createDiv("tree-item-self is-clickable nav-file-title");
		setIcon(outlineTitle,'links-coming-in');

		outlineTitle.style.paddingLeft ='0.5em';
		outlineTitle.createDiv("tree-item-inner nav-file-title-content").setText(info.backlinks[i].basename);

	
		//クリック時
		outlineTitle.addEventListener(
			"click",
			async(event: MouseEvent) => {
				event.preventDefault();
				if (file != this.activeFile){
					this.holdUpdateOnce = true;
				}
				await this.app.workspace.getLeaf().openFile(info.backlinks[i]);
			},
			false
		);

		//hover preview 
		outlineTitle.addEventListener('mouseover', (event: MouseEvent) => {
			this.app.workspace.trigger('hover-link', {
				event,
				source: MultipleNotesOutlineViewType,
				hoverParent: parentEl,   // rootEl→parentElにした
				targetEl: outlineTitle,
				linktext: info.backlinks[i].path,
			});
		});

		// contextmenu
		outlineTitle.addEventListener(
			"contextmenu",
			(event: MouseEvent) => {
				const menu = new Menu();
				//リンク先を新規タブに開く
				menu.addItem((item)=>
					item
						.setTitle("Open backlink file in new tab")
						.setIcon("file-plus")
						.onClick(async()=> {
							if (info.backlinks[i] != this.activeFile){
								this.holdUpdateOnce = true;
							}
							await this.app.workspace.getLeaf('tab').openFile(info.backlinks[i]);
						})
				);
				//リンク先を右に開く
				menu.addItem((item)=>
					item
						.setTitle("Open linked file to the right")
						.setIcon("separator-vertical")
						.onClick(async()=> {
							if (info.backlinks[i] != this.activeFile){
								this.holdUpdateOnce = true;
							}
							await this.app.workspace.getLeaf('split').openFile(info.backlinks[i]);

						})
				);
				//リンク先を新規ウィンドウに開く
				menu.addItem((item)=>
					item
						.setTitle("Open linked file in new window")
						.setIcon("scan")
						.onClick(async()=> {
							if (info.backlinks[i] != this.activeFile){
								this.holdUpdateOnce = true;
							}
							// await this.app.workspace.getLeaf('window').openFile(info.backlinks[i]);
							await this.app.workspace.openPopoutLeaf({size:{width:this.settings.popoutSize.width,height:this.settings.popoutSize.height}}).openFile(info.backlinks[i]);

							if (this.settings.popoutAlwaysOnTop){
								setPopoutAlwaysOnTop();
							}
						})
				);
				menu.showAtMouseEvent(event);
			});	
	
	}
		
}


// スクロール
export function scrollToElement(line: number, col: number, app: App): void {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (view) {
        //view.editor.focus();
        // view.editor.setCursor (line, col);
        // view.editor.scrollIntoView( {
        //     from: {
        //         line: line,
        //         ch:0
        //     },
        //     to: {
        //         line: line,
        //         ch:0
        //     }
        // }, true);
		// view.editor.scrollTo(5);
		// view.previewMode.applyScroll(line);
		view.setEphemeralState({line});
    }
}

function setPopoutAlwaysOnTop(){
	const { remote } = require('electron');
	const activeWindow = remote.BrowserWindow.getFocusedWindow();
	activeWindow.setAlwaysOnTop(true);
}


// ファイル情報を付加表示
function attachFileInfo (targetEl: HTMLElement, status: FileStatus, info: FileInfo, data: OutlineData[],displayFileInfo: string):void {
	if(!status.isFolder){
		switch (displayFileInfo) {
			case 'lines':
				targetEl.dataset.subinfo = status.outlineReady ? info.numOfLines.toString(): '';
				break;
			case 'tag':
				if (status.outlineReady){
					let firsttagIndex = data.findIndex( (element,index) =>
						data[index].typeOfElement =='tag');
					if (firsttagIndex >= 0){
						targetEl.dataset.subinfo = data[firsttagIndex].displayText;
					}
				}
				break;
			case 'none':
				break;
			default:
				break;
		}
	}
}