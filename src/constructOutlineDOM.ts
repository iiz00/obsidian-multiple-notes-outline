import { TFile, setIcon, Menu, MarkdownView, App, setTooltip, parseLinktext, stripHeadingForLink, Pos } from "obsidian";

import { OutlineData, FileInfo, MultipleNotesOutlineSettings } from "src/main";
import { MultipleNotesOutlineViewType, Category } from "./fileView";
import { checkListCallouts, getSubpathPosition, shouldDisplayListItem } from "src/util";

import { remote } from "electron";

export function constructOutlineDOM(
	file: TFile,
	info: FileInfo,
	data: OutlineData[],
	parentEl: HTMLElement,
	category: Category,
): void {
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

	const isCanvas = Boolean(file.extension == "canvas");

	// propertiesの処理
	if (
		this.settings.showPropertyLinks &&
		info.frontmatterLinks &&
		!(category == "outgoing" && this.settings.hideMinor2hopLink)
	) {
		for (let j = 0; j < info.frontmatterLinks.length; j++) {
			const linkTarget = this.app.metadataCache.getFirstLinkpathDest(
				parseLinktext(info.frontmatterLinks[j].link).path,
				file.path,
			);
			if (!(linkTarget instanceof TFile)) {
				continue;
			}
			const linkSubpath = parseLinktext(info.frontmatterLinks[j].link).subpath;
			const subPathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
			// 抽出 extract  filter関連コメントアウト
			// if (this.extractMode == true) {
			// 	if (this.extractTask == true || !info[i].frontmatterLinks[j].displayText.toLowerCase().includes(this.settings.wordsToExtract.toLowerCase())){
			// 		continue;
			// 	} else {
			// 		isExtracted = true;
			// 	}
			// }

			// hideLinksBetweenRelatedFilesの設定に従って重複除外
			if (!checkLinksBetweenRelatedFiles(linkTarget, category, this.settings, this.targetFiles)) {
				continue;
			}
			// if (this.settings.hideLinksBetweenRelatedFiles == "mainOnly") {
			// 	if (category == "main") {
			// 		continue;
			// 	}
			// 	if (linkTarget.path == this.targetFiles.main?.[0].path) {
			// 		continue;
			// 	}
			// }
			// if (this.settings.hideLinksBetweenRelatedFiles == "toMainOnly") {
			// 	if (linkTarget.path == this.targetFiles.main?.[0].path) {
			// 		continue;
			// 	}
			// }
			// if (this.settings.hideLinksBetweenRelatedFiles == "all") {
			// 	for (const category in this.targetFiles) {
			// 		// info.frontmatterLinks[j].linkに一致するファイル名があるかどうかの処理。
			// 		if (this.targetFiles[category].some((targetfile) => targetfile.path == linkTarget.path)) {
			// 			continue frontmatterlinksloop;
			// 		}
			// 	}
			// }

			const outlineEl: HTMLElement = parentEl.createDiv("tree-item nav-file");
			const outlineTitle: HTMLElement = outlineEl.createDiv("tree-item-self is-clickable nav-file-title");
			setIcon(outlineTitle, "link");

			outlineTitle.style.paddingLeft = "0.5em";
			outlineTitle
				.createDiv("tree-item-inner nav-file-title-content")
				.setText(info.frontmatterLinks[j].displayText);

			//クリック時
			outlineTitle.addEventListener(
				"click",
				async (event: MouseEvent) => {
					if (this.settings.openLinkByClick) {
						await openElementPosition(linkTarget, subPathPosition, undefined, this.app);
						this.holdUpdateOnce = Boolean(linkTarget != this.activeFile);
					} else {
						await openElementPosition(file, null, undefined, this.app);
						this.holdUpdateOnce = Boolean(file != this.activeFile);
					}
				},
				false,
			);
			//hover preview
			outlineTitle.addEventListener("mouseover", (event: MouseEvent) => {
				if (linkTarget) {
					this.app.workspace.trigger("hover-link", {
						event,
						source: MultipleNotesOutlineViewType,
						hoverParent: parentEl, // rootEl→parentElにした
						targetEl: outlineTitle,
						linktext: linkTarget.path,
						state: { scroll: subPathPosition?.start?.line },
					});
				}
			});

			// contextmenu
			outlineTitle.addEventListener("contextmenu", (event: MouseEvent) => {
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

				menu.addItem((item) =>
					item
						.setTitle("Open linked file")
						.setIcon("links-going-out")
						.onClick(async () => {
							await openElementPosition(linkTarget, subPathPosition, undefined, this.app);
							this.holdUpdateOnce = Boolean(linkTarget != this.activeFile);
						}),
				);
				menu.addSeparator();

				//リンク先を新規タブに開く
				menu.addItem((item) =>
					item
						.setTitle("Open linked file in new tab")
						.setIcon("file-plus")
						.onClick(async () => {
							await openElementPosition(linkTarget, subPathPosition, "tab", this.app);
							this.holdUpdateOnce = Boolean(linkTarget != this.activeFile);
						}),
				);
				//リンク先を右に開く
				menu.addItem((item) =>
					item
						.setTitle("Open linked file to the right")
						.setIcon("separator-vertical")
						.onClick(async () => {
							await openElementPosition(linkTarget, subPathPosition, "split", this.app);
							this.holdUpdateOnce = Boolean(linkTarget != this.activeFile);
						}),
				);
				//リンク先を新規ウィンドウに開く
				menu.addItem((item) =>
					item
						.setTitle("Open linked file in new window")
						.setIcon("scan")
						.onClick(async () => {
							await openElementPositionInPopoutWindow(
								linkTarget,
								subPathPosition,
								this.settings,
								this.app,
							);
							this.holdUpdateOnce = Boolean(linkTarget != this.activeFile);
						}),
				);
				menu.addSeparator();

				//新規タブに開く
				menu.addItem((item) =>
					item
						.setTitle("Open in new tab")
						.setIcon("file-plus")
						.onClick(async () => {
							await openElementPosition(file, null, "tab", this.app);
							this.holdUpdateOnce = Boolean(file != this.activeFile);
						}),
				);
				//右に開く
				menu.addItem((item) =>
					item
						.setTitle("Open to the right")
						.setIcon("separator-vertical")
						.onClick(async () => {
							await openElementPosition(file, null, "split", this.app);
							this.holdUpdateOnce = Boolean(file != this.activeFile);
						}),
				);
				//新規ウィンドウに開く
				menu.addItem((item) =>
					item
						.setTitle("Open in new window")
						.setIcon("scan")
						.onClick(async () => {
							await openElementPositionInPopoutWindow(file, null, this.settings, this.app);
							this.holdUpdateOnce = Boolean(file != this.activeFile);
						}),
				);

				menu.showAtMouseEvent(event);
			});
		}
	}

	// 最新の見出しレベル
	let latestHeadingLevel = 0;

	//アウトライン要素の描画。data[i]が要素0ならスキップ
	//二重ループから抜けるためラベルelementloopをつけた
	if (data.length > 0) {
		for (let j = 0; j < data.length; j++) {
			// 現アウトライン要素の種別を取得
			const element = data[j].typeOfElement;
			let displayText = data[j].displayText;
			const linkTarget =
				element !== "link"
					? null
					: this.app.metadataCache.getFirstLinkpathDest(parseLinktext(data[j]?.link).path, file.path);
			const linkSubpath = !linkTarget ? null : parseLinktext(data[j]?.link).subpath;
			const subPathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);

			//要素ごとの非表示判定  設定で非表示になっていればスキップ

			if (this.settings.showElements[element] == false) {
				continue;
			}

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
			if (element == "heading") {
				// 最新の見出しレベルを取得
				latestHeadingLevel = data[j].level;
				// 特定の見出しレベルが非表示の場合、該当すればスキップ
				if (data[j].level > this.settings.maxHeadingLevel) {
					continue;
				}
			}

			// links
			if (element == "link") {
				if (!checkLinksBetweenRelatedFiles(linkTarget, category, this.settings, this.targetFiles) == false) {
					continue;
				}
				if (this.settings.hideMinor2hopLink && category == "outgoing") {
					continue;
				}
			}

			// tags
			// if (element == 'tag'){
			// }

			// listItems
			let calloutsIndex = undefined;
			if (element == "listItems") {
				if (this.settings.dispListCallouts) {
					calloutsIndex = checkListCallouts(
						displayText,
						this.app.plugins.plugins?.["obsidian-list-callouts"]?.settings,
					);
				}
				if (shouldDisplayListItem(data[j], this.settings, calloutsIndex) == false) {
					continue;
				}
			}

			//アウトライン要素部分作成
			const outlineEl: HTMLElement = parentEl.createDiv("tree-item nav-file");
			//中身を設定
			const outlineTitle: HTMLElement = outlineEl.createDiv("tree-item-self is-clickable nav-file-title");

			//アイコン icon
			switch (this.settings.icon[element]) {
				case "none":
					break;
				case "headingwithnumber":
					setIcon(outlineTitle, `heading-${data[j].level}`);
					break;
				case "custom":
					setIcon(outlineTitle, this.settings.customIcon[element]);
					break;
				default:
					setIcon(outlineTitle, this.settings.icon[element]);
					break;
			}

			// タスクだった場合アイコン上書き
			if (element == "listItems" && data[j].task !== void 0) {
				if (data[j].task == "x") {
					setIcon(
						outlineTitle,
						this.settings.icon.taskDone == "custom"
							? this.settings.customIcon.taskDone
							: this.settings.icon.taskDone,
					);
				} else {
					setIcon(
						outlineTitle,
						this.settings.icon.task == "custom" ? this.settings.customIcon.task : this.settings.icon.task,
					);
				}
			}

			// リストに対する処理タスクだった場合アイコン上書き
			if (element == "listItems") {
				//タスクだった場合アイコン上書き
				if (data[j].task !== void 0) {
					if (data[j].task == "x") {
						setIcon(
							outlineTitle,
							this.settings.icon.taskDone == "custom"
								? this.settings.customIcon.taskDone
								: this.settings.icon.taskDone,
						);
					} else {
						setIcon(
							outlineTitle,
							this.settings.icon.task == "custom"
								? this.settings.customIcon.task
								: this.settings.icon.task,
						);
					}
				}

				//リストコールアウトへの対応
				if (typeof calloutsIndex == "number") {
					outlineTitle.style.backgroundColor = `RGBA(${this.app.plugins.plugins["obsidian-list-callouts"].settings[calloutsIndex].color},0.15)`;
					if (
						this.app.plugins.plugins["obsidian-list-callouts"].settings[calloutsIndex].hasOwnProperty(
							"icon",
						) &&
						data[j].task === void 0
					) {
						setIcon(
							outlineTitle,
							this.app.plugins.plugins["obsidian-list-callouts"].settings[calloutsIndex].icon,
						);
						displayText = displayText.replace(/^.\s/, "");
					}
				}
			}

			//prefix
			let prefix = this.settings.prefix[element];
			if (element == "heading") {
				switch (this.settings.repeatHeadingPrefix) {
					case "level":
						prefix = prefix.repeat(data[j].level);
						break;
					case "levelminus1":
						prefix = prefix.repeat(data[j].level - 1);
						break;
				}
			}

			// インデント
			let indent = 0.5;
			//見出しのインデント
			if (element == "heading" && this.settings.indent.heading == true) {
				indent = indent + (data[j].level - 1) * 1.5;
			}
			// 見出し以外のインデント
			if (element != "heading" && this.settings.indentFollowHeading) {
				const additionalIndent =
					(latestHeadingLevel - 1 + (this.settings.indentFollowHeading == 2 ? 1 : 0)) * 1.5;
				indent = indent + (additionalIndent > 0 ? additionalIndent : 0);
			}
			// リンクが前のエレメントと同じ行だった場合インデント付加
			if (!isCanvas && element == "link" && data[j].position.start.line == data[j - 1]?.position.start.line) {
				indent = indent + 1.5;
			}

			outlineTitle.style.paddingLeft = `${indent}em`;

			if (element == "listItems" && data[j].task !== void 0) {
				prefix = data[j].task == "x" ? this.settings.prefix.taskDone : this.settings.prefix.task;
				if (this.settings.addCheckboxText) {
					prefix = prefix + "[" + data[j].task + "] ";
				}
			}

			const outlineTitleContent = outlineTitle.createDiv("tree-item-inner nav-file-title-content");
			outlineTitleContent.setText(prefix + displayText);
			// wrapLine trueなら折り返し設定
			if (this.settings.wrapLine) {
				outlineTitleContent.classList.add("wrap-line");
			}

			// インラインプレビュー
			// リンクとタグは、アウトライン要素のあとに文字列が続く場合その行をプレビュー、そうでなければ次の行をプレビュー
			if (!isCanvas && this.settings.inlinePreview) {
				let previewText = "";

				if (
					(element == "link" || element == "tag") &&
					data[j].position.end.col < info.lines[data[j].position.start.line].length
				) {
					previewText = info.lines[data[j].position.start.line].slice(data[j].position.end.col);
				} else {
					previewText =
						data[j].position.start.line < info.numOfLines - 1
							? info.lines[data[j].position.start.line + 1]
							: "";
				}
				outlineTitle.createDiv("nav-file-title-preview").setText(previewText);
			}

			// ツールチッププレビュー
			// その要素の行から次の要素の前までをプレビュー
			if (this.settings.tooltipPreview) {
				if (!isCanvas) {
					const previewText2 = makeTooltipPreviewText(j, info, data, this.settings);

					setTooltip(outlineTitle, previewText2, { classes: ["MNO-preview"] });
					outlineTitle.dataset.tooltipPosition = this.settings.tooltipPreviewDirection;
					outlineTitle.setAttribute("data-tooltip-delay", "10");
				} else {
					//canvas だった場合、カードに相当するlistItemsにプレビューを付加
					if (data[j].typeOfElement == "listItems") {
						setTooltip(outlineTitle, data[j].displayText, { classes: ["MNO-preview"] });
						outlineTitle.dataset.tooltipPosition = this.settings.tooltipPreviewDirection;
						outlineTitle.setAttribute("data-tooltip-delay", "10");
					}
				}
			}

			// drag&drop
			if (element == "link") {
				outlineTitle.setAttr("draggable", "true");
				outlineTitle.addEventListener("dragstart", (event: DragEvent) => {
					const linkText = data[j].link;
					const dragManager = (this.app as any).dragManager;
					const dragData = dragManager.dragLink(event, linkText, "タイトル", linkText);
					dragManager.onDragStart(event, dragData);
				});
			} else if (element == "heading") {
				outlineTitle.setAttr("draggable", "true");
				outlineTitle.addEventListener("dragstart", (event: DragEvent) => {
					const linkText = file.path + "#" + stripHeadingForLink(data[j].displayText); //.replace(/[#|\^\\%\:]|\[\[|\]\]/g, " ");
					const dragManager = (this.app as any).dragManager;
					const dragData = dragManager.dragLink(event, linkText, "タイトル", linkText);
					dragManager.onDragStart(event, dragData);
				});
			}

			//クリック時
			outlineTitle.addEventListener(
				"click",
				async (event: MouseEvent) => {
					if (this.settings.openLinkByClick == true && element == "link") {
						// openLinkByClick true かつエレメントがリンクならリンク先を開く
						await openElementPosition(linkTarget, subPathPosition, undefined, this.app);
						this.holdUpdateOnce = Boolean(linkTarget != this.activeFile);
					} else if (!isCanvas) {
						await openElementPosition(file, data[j].position, undefined, this.app);
						this.holdUpdateOnce = Boolean(file != this.activeFile);
					}
				},
				false,
			);

			//hover preview
			outlineTitle.addEventListener("mouseover", (event: MouseEvent) => {
				// リンクエレメントでリンク先が存在するときはそちらをプレビュー
				if (element == "link" && linkTarget) {
					this.app.workspace.trigger("hover-link", {
						event,
						source: MultipleNotesOutlineViewType,
						hoverParent: parentEl,
						targetEl: outlineTitle,
						linktext: linkTarget.path,
						state: { scroll: subPathPosition?.start?.line },
						//state: posInfo,
					});
				} else {
					if (!isCanvas) {
						this.app.workspace.trigger("hover-link", {
							event,
							source: MultipleNotesOutlineViewType,
							hoverParent: parentEl,
							targetEl: outlineTitle,
							linktext: file.path,
							state: { scroll: data[j].position.start.line },
						});
					}
				}
			});

			// contextmenu
			outlineTitle.addEventListener("contextmenu", (event: MouseEvent) => {
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

				if (element == "link") {
					menu.addItem((item) =>
						item
							.setTitle("Open linked file")
							.setIcon("links-going-out")
							.onClick(async () => {
								await openElementPosition(linkTarget, subPathPosition, undefined, this.app);
								this.holdUpdateOnce = Boolean(linkTarget != this.activeFile);
							}),
					);
					menu.addSeparator();
					//リンク先を新規タブに開く
					menu.addItem((item) =>
						item
							.setTitle("Open linked file in new tab")
							.setIcon("file-plus")
							.onClick(async () => {
								await openElementPosition(linkTarget, subPathPosition, "tab", this.app);
								this.holdUpdateOnce = Boolean(linkTarget != this.activeFile);
							}),
					);
					//リンク先を右に開く
					menu.addItem((item) =>
						item
							.setTitle("Open linked file to the right")
							.setIcon("separator-vertical")
							.onClick(async () => {
								await openElementPosition(linkTarget, subPathPosition, "split", this.app);
								this.holdUpdateOnce = Boolean(linkTarget != this.activeFile);
							}),
					);
					//リンク先を新規ウィンドウに開く
					menu.addItem((item) =>
						item
							.setTitle("Open linked file in new window")
							.setIcon("scan")
							.onClick(async () => {
								await openElementPositionInPopoutWindow(
									linkTarget,
									subPathPosition,
									this.settings,
									this.app,
								);
								this.holdUpdateOnce = Boolean(linkTarget != this.activeFile);
							}),
					);
					menu.addSeparator();
				}
				// タグの場合
				if (element == "tag") {
					menu.addItem((item) =>
						item
							.setTitle("Search this tag")
							.setIcon("search")
							.onClick(async () => {
								const searchString = "tag: #" + displayText;
								this.app.internalPlugins.plugins["global-search"]?.instance.openGlobalSearch(
									searchString,
								);
							}),
					);
					menu.addSeparator();
				}
				// 以下はcanvasでは非表示
				if (!isCanvas) {
					//新規タブに開く
					menu.addItem((item) =>
						item
							.setTitle("Open in new tab")
							.setIcon("file-plus")
							.onClick(async () => {
								await openElementPosition(file, data[j].position, "tab", this.app);
								this.holdUpdateOnce = Boolean(file != this.activeFile);
							}),
					);
					//右に開く
					menu.addItem((item) =>
						item
							.setTitle("Open to the right")
							.setIcon("separator-vertical")
							.onClick(async () => {
								await openElementPosition(file, data[j].position, "split", this.app);
								this.holdUpdateOnce = Boolean(file != this.activeFile);
							}),
					);
					//新規ウィンドウに開く
					menu.addItem((item) =>
						item
							.setTitle("Open in new window")
							.setIcon("scan")
							.onClick(async () => {
								await openElementPositionInPopoutWindow(
									file,
									data[j].position,
									this.settings,
									this.app,
								);
								this.holdUpdateOnce = Boolean(file != this.activeFile);
							}),
					);
					if (element == "heading" || element == "link") {
						menu.addSeparator();
						// リンクとしてコピー
						menu.addItem((item) =>
							item
								.setTitle("Copy link")
								.setIcon("copy")
								.onClick(async () => {
									if (this.app.vault.config.useMarkdownLinks) {
										const linkText =
											element == "link"
												? this.app.fileManager.generateMarkdownLink(
														linkTarget,
														"",
														linkSubpath,
														linkTarget.basename + linkSubpath,
													)
												: this.app.fileManager.generateMarkdownLink(
														file,
														"",
														"#" + stripHeadingForLink(data[j].displayText), //.replace(/[#|\^\\%\:]|\[\[|\]\]/g," ",)
														file.basename + "#" + stripHeadingForLink(data[j].displayText), //.replace(/[#|\^\\%\:]|\[\[|\]\]/g," ",),
													);
										await navigator.clipboard.writeText(linkText);
									} else {
										const linkText =
											element == "link"
												? `[[${data[j].link}]]`
												: `[[${file.basename}#${stripHeadingForLink(data[j].displayText)}]]`;
										await navigator.clipboard.writeText(linkText);
									}
								}),
						);
					}
				}

				menu.showAtMouseEvent(event);
			});
		}
	} else {
		//要素0だったときの 処理
		//各行をチェックし、空行でない初めの行を表示する(抽出モードでは行わない)
		//if (this.extractMode == false){       //filter関連コメントアウト
		if (true) {
			for (let j = 0; j < info.lines.length; j++) {
				if (info.lines[j] == "") {
					continue;
				} else {
					const outlineEl: HTMLElement = parentEl.createDiv("tree-item nav-file");
					const outlineTitle: HTMLElement = outlineEl.createDiv("tree-item-self is-clickable nav-file-title");
					outlineTitle.createDiv("tree-item-inner nav-file-title-content").setText(info.lines[j]);
					outlineTitle.addEventListener(
						"click",
						async (event: MouseEvent) => {
							if (file != this.activeFile) {
								this.holdUpdateOnce = true;
							}
							event.preventDefault();
							await this.app.workspace.getLeaf().openFile(file);
						},
						false,
					);
					// ツールチッププレビュー
					const previewText2: string = info.lines.join("\n");
					setTooltip(outlineTitle, previewText2, { classes: ["MNO-preview"] });
					outlineTitle.dataset.tooltipPosition = this.settings.tooltipPreviewDirection;
					outlineTitle.setAttribute("data-tooltip-delay", "10");
					break;
				}
			}
		}
	}
	// main以外の場合、backlink filesの処理
	if (
		category == "main" ||
		this.settings.showBacklinks == false ||
		!info.backlinks ||
		(category == "backlink" && this.settings.hideMinor2hopLink)
	) {
		return;
	}
	backlinkfileloop: for (let i = 0; i < info.backlinks?.length; i++) {
		// targetFilesに含まれていれば除外する

		for (const targetCategory in this.targetFiles) {
			if (this.targetFiles[targetCategory].includes(info.backlinks[i])) {
				continue backlinkfileloop;
			}
		}

		const outlineEl: HTMLElement = parentEl.createDiv("tree-item nav-file");
		const outlineTitle: HTMLElement = outlineEl.createDiv("tree-item-self is-clickable nav-file-title");

		//アイコン icon
		switch (this.settings.icon.backlink) {
			case "none":
				break;
			case "custom":
				setIcon(outlineTitle, this.settings.customIcon.backlink);
				break;
			default:
				setIcon(outlineTitle, this.settings.icon.backlink);
				break;
		}

		outlineTitle.style.paddingLeft = "0.5em";
		outlineTitle.createDiv("tree-item-inner nav-file-title-content").setText(info.backlinks[i].basename);

		//クリック時
		outlineTitle.addEventListener(
			"click",
			async (event: MouseEvent) => {
				await openElementPosition(info.backlinks[i], null, undefined, this.app);
				this.holdUpdateOnce = Boolean(info.backlinks[i] != this.activeFile);
			},
			false,
		);

		//hover preview
		outlineTitle.addEventListener("mouseover", (event: MouseEvent) => {
			this.app.workspace.trigger("hover-link", {
				event,
				source: MultipleNotesOutlineViewType,
				hoverParent: parentEl, // rootEl→parentElにした
				targetEl: outlineTitle,
				linktext: info.backlinks[i].path,
			});
		});

		// contextmenu
		outlineTitle.addEventListener("contextmenu", (event: MouseEvent) => {
			const menu = new Menu();
			//リンク先を新規タブに開く
			menu.addItem((item) =>
				item
					.setTitle("Open backlink file in new tab")
					.setIcon("file-plus")
					.onClick(async () => {
						await openElementPosition(info.backlinks[i], null, "tab", this.app);
						this.holdUpdateOnce = Boolean(info.backlinks[i] != this.activeFile);
					}),
			);
			//リンク先を右に開く
			menu.addItem((item) =>
				item
					.setTitle("Open backlink file to the right")
					.setIcon("separator-vertical")
					.onClick(async () => {
						await openElementPosition(info.backlinks[i], null, "split", this.app);
						this.holdUpdateOnce = Boolean(info.backlinks[i] != this.activeFile);
					}),
			);
			//リンク先を新規ウィンドウに開く
			menu.addItem((item) =>
				item
					.setTitle("Open backlink file in new window")
					.setIcon("scan")
					.onClick(async () => {
						await openElementPositionInPopoutWindow(info.backlinks[i], null, this.settings, this.app);
						this.holdUpdateOnce = Boolean(info.backlinks[i] != this.activeFile);
					}),
			);
			menu.showAtMouseEvent(event);
		});
	}
}

// エレメントの位置を開く
async function openElementPosition(file: TFile, position: null | Pos, method: undefined | "tab" | "split", app: App) {
	await app.workspace.getLeaf(method).openFile(file);
	if (position) {
		scrollToElement(position.start?.line, 0, app);
	}
}
// エレメントの位置を新規ウィンドウで開く
async function openElementPositionInPopoutWindow(
	file: TFile,
	position: null | Pos,
	settings: MultipleNotesOutlineSettings,
	app: App,
) {
	await this.app.workspace
		.openPopoutLeaf({
			size: {
				width: settings.popoutSize.width,
				height: settings.popoutSize.height,
			},
		})
		.openFile(file);
	if (position) {
		scrollToElement(position.start?.line, 0, this.app);
	}
	if (settings.popoutAlwaysOnTop) {
		setPopoutAlwaysOnTop();
	}
}

//  エレメントの位置までスクロール
export function scrollToElement(line: number, col: number, app: App): void {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (view) {
		view.setEphemeralState({ line });
	}
}

function setPopoutAlwaysOnTop() {
	const activeWindow = remote.BrowserWindow.getFocusedWindow();
	activeWindow.setAlwaysOnTop(true);
}

// targetFiles間のリンクを表示すべきか判定
function checkLinksBetweenRelatedFiles(
	linkTarget: TFile,
	category: string,
	settings: MultipleNotesOutlineSettings,
	targetFiles: { [category: string]: TFile[] },
): boolean {
	if (settings.hideLinksBetweenRelatedFiles == "mainOnly") {
		if (category == "main") {
			return false;
		}
		if (linkTarget.path == targetFiles.main?.[0].path) {
			return false;
		}
	}
	if (settings.hideLinksBetweenRelatedFiles == "toMainOnly") {
		if (linkTarget.path == targetFiles.main?.[0].path) {
			return false;
		}
	}
	if (settings.hideLinksBetweenRelatedFiles == "all") {
		for (const category in targetFiles) {
			if (targetFiles[category].some((targetfile) => targetfile.path == linkTarget.path)) {
				return false;
			}
		}
	}
	return true;
}

// ツールチッププレビューのテキストを生成
function makeTooltipPreviewText(
	j: number,
	info: FileInfo,
	data: OutlineData[],
	settings: MultipleNotesOutlineSettings,
): string {
	let previewText = "";

	// まず次の表示する要素の引数を特定
	let endLine: number = info.numOfLines - 1; //初期値は文章末
	let k = j + 1; // 現在のアウトライン引数+1からループ開始
	while (k < data.length) {
		//表示するエレメントタイプであれば行を取得してループを打ち切る
		if (settings.showElements[data[k].typeOfElement]) {
			//ただし各種の実際には非表示となる条件を満たしていたら打ち切らない
			// リストの設定による非表示
			if (
				data[k].typeOfElement == "listItems" &&
				(data[k].level >= 2 ||
					(settings.allRootItems == false &&
						data[k].level == 1 &&
						(settings.allTasks == false || data[k].task === void 0)) ||
					(settings.taskOnly && data[k].task === void 0) ||
					(settings.hideCompletedTasks && data[k].task == "x"))
			) {
				k++;
				continue;
				// 見出しのレベルによる非表示
			} else if (data[k].typeOfElement == "heading" && data[k].level > settings.maxHeadingLevel) {
				k++;
				continue;
			} else {
				endLine = data[k].position.start.line - 1;
				break;
			}
		}
		k++;
	}
	for (let l = data[j].position.start.line; l <= endLine; l++) {
		previewText = previewText + info.lines[l] + "\n";
	}
	// 空行を除去
	previewText = previewText.replace(/\n$|\n(?=\n)/g, "");
	return previewText;
}
