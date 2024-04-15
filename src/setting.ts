import MultipleNotesOutlinePlugin, { DEFAULT_SETTINGS } from "src/main";
import { App, PluginSettingTab, Setting } from "obsidian";

export class MultipleNotesOutlineSettingTab extends PluginSettingTab {
	plugin: MultipleNotesOutlinePlugin;

	constructor(app: App, plugin: MultipleNotesOutlinePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setName("Show headings").addToggle((toggle) => {
			toggle.setValue(this.plugin.settings.showElements.heading).onChange(async (value) => {
				this.plugin.settings.showElements.heading = value;
				this.display();
				await this.plugin.saveSettings();
				this.callRefreshView(false);
			});
		});

		new Setting(containerEl).setName("Show links").addToggle((toggle) => {
			toggle.setValue(this.plugin.settings.showElements.link).onChange(async (value) => {
				this.plugin.settings.showElements.link = value;
				this.display();
				await this.plugin.saveSettings();
				this.callRefreshView(false);
			});
		});

		new Setting(containerEl).setName("Show tags").addToggle((toggle) => {
			toggle.setValue(this.plugin.settings.showElements.tag).onChange(async (value) => {
				this.plugin.settings.showElements.tag = value;
				this.display();
				await this.plugin.saveSettings();
				this.callRefreshView(false);
			});
		});

		new Setting(containerEl).setName("Show list items & tasks").addToggle((toggle) => {
			toggle.setValue(this.plugin.settings.showElements.listItems).onChange(async (value) => {
				this.plugin.settings.showElements.listItems = value;
				this.display();
				await this.plugin.saveSettings();
				this.callRefreshView(false);
			});
		});

		if (this.plugin.settings.showElements.listItems) {
			new Setting(containerEl)
				.setName("Show all root list items")
				.setDesc("if disabled, only top item of the list is displayed")
				.setClass("setting-indent")
				.addToggle((toggle) => {
					toggle.setValue(this.plugin.settings.allRootItems).onChange(async (value) => {
						this.plugin.settings.allRootItems = value;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					});
				});

			new Setting(containerEl)
				.setName("Show all tasks")
				.setDesc("show all task items regardless of their level")
				.setClass("setting-indent")
				.addToggle((toggle) => {
					toggle.setValue(this.plugin.settings.allTasks).onChange(async (value) => {
						this.plugin.settings.allTasks = value;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					});
				});

			new Setting(containerEl)
				.setName("Task only")
				.setDesc("if enabled, normal list items are hidden")
				.setClass("setting-indent")
				.addToggle((toggle) => {
					toggle.setValue(this.plugin.settings.taskOnly).onChange(async (value) => {
						this.plugin.settings.taskOnly = value;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					});
				});

			new Setting(containerEl)
				.setName("Hide completed tasks")
				.setClass("setting-indent")
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.hideCompletedTasks)
						.onChange(async (value) => {
							this.plugin.settings.hideCompletedTasks = value;
							this.display();
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						});
				});

			new Setting(containerEl)
				.setName("Show list callouts")
				.setDesc("shows list items marked with List Callouts plugin")
				.setClass("setting-indent")
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.dispListCallouts)
						.onChange(async (value) => {
							this.plugin.settings.dispListCallouts = value;
							this.display();
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						});
				});
		}

		new Setting(containerEl).setName("Show backlink files").addToggle((toggle) => {
			toggle.setValue(this.plugin.settings.showBacklinks).onChange(async (value) => {
				this.plugin.settings.showBacklinks = value;
				this.display();
				await this.plugin.saveSettings();
				this.callRefreshView(false);
			});
		});

		new Setting(containerEl).setName("Collapse all at startup").addToggle((toggle) => {
			toggle.setValue(this.plugin.settings.collapseAllAtStartup).onChange(async (value) => {
				this.plugin.settings.collapseAllAtStartup = value;
				this.display();
				await this.plugin.saveSettings();
				this.callRefreshView(false);
			});
		});

		// 表示する情報
		new Setting(containerEl)
			.setName("Display file information")
			.setDesc("display the number of lines of the file / the first tag with the file name")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", "none")
					.addOption("lines", "lines of the note")
					.addOption("tag", "first tag")
					.setValue(this.plugin.settings.displayFileInfo)
					.onChange(async (value) => {
						this.plugin.settings.displayFileInfo = value;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					});
			});

		// viewを表示する位置 （右サイドバー、左サイドバー、メインペイン）
		new Setting(containerEl)
			.setName("Position of the plugin view")
			.setDesc("Specify default position where this plugin's view appears")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("right", "right side pane")
					.addOption("left", "left side pane")
					.addOption("tab", "new tab in main pane")
					.addOption("split", "splitted pane")
					.addOption("popout", "popout window")
					.setValue(this.plugin.settings.viewPosition)
					.onChange(async (value) => {
						this.plugin.settings.viewPosition = value;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					});
			});

		// sort type
		new Setting(containerEl)
			.setName("Sort type")
			.setDesc("Specify sort order")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("alphabetAscending", "File name (A to Z)")
					.addOption("alphabetDescending", "File name (Z to A)")
					.addOption("mtimeDescending", "Modified time (new to old) ")
					.addOption("mtimeAscending", "Modified time (old to new) ")
					.addOption("ctimeDescending", "Created time (new to old) ")
					.addOption("ctimeAscending", "Created time (old to new) ")
					.setValue(this.plugin.settings.sortType)
					.onChange(
						async (
							value:
								| "alphabetAscending"
								| "alphabetDescending"
								| "ctimeDescending"
								| "ctimeAscending"
								| "mtimeDescending"
								| "mtimeAscending",
						) => {
							this.plugin.settings.sortType = value;
							this.display();
							await this.plugin.saveSettings();
							this.callRefreshView(true);
						},
					);
			});

		this.containerEl.createEl("h4", {
			text: "File View",
			cls: "setting-category",
		});

		new Setting(containerEl).setName("Open File View at startup").addToggle((toggle) => {
			toggle.setValue(this.plugin.settings.openAtStartup.file).onChange(async (value) => {
				this.plugin.settings.openAtStartup.file = value;
				this.display();
				await this.plugin.saveSettings();
				this.callRefreshView(false);
			});
		});

		new Setting(containerEl)
			.setName("Open last view at startup")
			.setDesc(
				"If enabled, the most recently opened view is opened when File View is launched.",
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.openRecentAtStartup.file)
					.onChange(async (value) => {
						this.plugin.settings.openRecentAtStartup.file = value;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					});
			});

		// 各カテゴリの表示/非表示
		new Setting(containerEl)
			.setName("Show the main target file section")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showFiles.main).onChange(async (value) => {
					this.plugin.settings.showFiles.main = value;
					this.display();
					await this.plugin.saveSettings();
					this.callRefreshView(false);
				});
			});

		new Setting(containerEl)
			.setName("Show the the outgoing files section")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showFiles.outgoing).onChange(async (value) => {
					this.plugin.settings.showFiles.outgoing = value;
					this.display();
					await this.plugin.saveSettings();
					this.callRefreshView(false);
				});
			});

		new Setting(containerEl)
			.setName("Show the the backlink files section")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showFiles.backlink).onChange(async (value) => {
					this.plugin.settings.showFiles.backlink = value;
					this.display();
					await this.plugin.saveSettings();
					this.callRefreshView(false);
				});
			});

		new Setting(containerEl)
			.setName("Update File View when another file becomes active")
			.setDesc(
				"Automatically update the view when another file becomes active(default = on). The view is not updated if the transition is made via clicking on the MNO view items.",
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.autoupdateFileView).onChange(async (value) => {
					this.plugin.settings.autoupdateFileView = value;
					this.display();
					await this.plugin.saveSettings();
				});
			});

		// MNO view経由で遷移した場合viewの更新を保留
		if (this.plugin.settings.autoupdateFileView) {
			new Setting(containerEl)
				.setName("Suspend update by clicking on view item")
				.setClass("setting-indent")
				.setDesc(
					"suspend updating the view when the active file is changed by clicking on items in the File View(default = on)",
				)
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.suspendUpdateByClickingView)
						.onChange(async (value) => {
							this.plugin.settings.suspendUpdateByClickingView = value;
							this.display();
							await this.plugin.saveSettings();
						});
				});
		}

		new Setting(containerEl)
			.setName("Hide duplicate notes")
			.setDesc("hides notes that appear multiple times in the outline.(default = on)")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.hideDuplicated).onChange(async (value) => {
					this.plugin.settings.hideDuplicated = value;
					this.display();
					await this.plugin.saveSettings();
					this.callRefreshView(false);
				});
			});

		new Setting(containerEl)
			.setName("Hide link elements between displayed files")
			.setDesc(
				"main file only: hide links between the main file and other displayed. other files to main file only: hide links from other displayed files to the main file. all: hide links between all displayed files.",
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", "none")
					.addOption("mainOnly", "main file only")
					.addOption("toMainOnly", "other files to main file only")
					.addOption("all", "all")
					.setValue(this.plugin.settings.hideLinksBetweenRelatedFiles)
					.onChange(async (value: "none" | "mainOnly" | "all") => {
						this.plugin.settings.hideLinksBetweenRelatedFiles = value;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					});
			});

		new Setting(containerEl)
			.setName("Hide minor 2 hop links")
			.setDesc(
				"hides outgoing links in outgoing files section and backlinks in backlink files section.(default = off)",
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.hideMinor2hopLink).onChange(async (value) => {
					this.plugin.settings.hideMinor2hopLink = value;
					this.display();
					await this.plugin.saveSettings();
					this.callRefreshView(false);
				});
			});

		this.containerEl.createEl("h4", {
			text: "Folder View",
			cls: "setting-category",
		});

		new Setting(containerEl).setName("Open Folder View at startup").addToggle((toggle) => {
			toggle.setValue(this.plugin.settings.openAtStartup.folder).onChange(async (value) => {
				this.plugin.settings.openAtStartup.folder = value;
				this.display();
				await this.plugin.saveSettings();
				this.callRefreshView(false);
			});
		});

		new Setting(containerEl)
			.setName("Open last view at startup")
			.setDesc(
				"If enabled, the most recently opened view is opened when Folder View is launched.",
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.openRecentAtStartup.folder)
					.onChange(async (value) => {
						this.plugin.settings.openRecentAtStartup.folder = value;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					});
			});

		// 各カテゴリの表示/非表示
		new Setting(containerEl)
			.setName("Collapse subfolder")
			.setDesc("display subfolders in collapsed state")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.collapseFolder).onChange(async (value) => {
					this.plugin.settings.collapseFolder = value;
					this.display();
					await this.plugin.saveSettings();
					this.callRefreshView(false);
				});
			});

		//表示する見出しレベル
		this.containerEl.createEl("h4", {
			text: "Headings",
			cls: "setting-category",
		});
		if (this.plugin.settings.showElements.heading) {
			this.containerEl.createEl("p", {
				text: "Heading level to display",
				cls: "setting-item-description",
			});
			this.plugin.settings.headingLevel.forEach((value, index, arry) => {
				new Setting(containerEl)
					.setName(`Level${index + 1}`)
					.setClass("setting-indent")
					.addToggle((toggle) => {
						toggle
							.setValue(this.plugin.settings.headingLevel[index])
							.onChange(async (value) => {
								this.plugin.settings.headingLevel[index] = value;
								this.display();
								await this.plugin.saveSettings();
								this.callRefreshView(false);
							});
					});
			});
		} else {
			this.containerEl.createEl("p", {
				text: "To display this section, activate 'Show headings' in Basics section.",
				cls: "setting-item-description",
			});
		}
		//リンク
		this.containerEl.createEl("h4", {
			text: "Links",
			cls: "setting-category",
		});
		new Setting(containerEl)
			.setName("Open link by clicking link element")
			.setDesc(
				"If enabled, clicking on a link element opens the linked file instead of opening the element's position.",
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openLinkByClick).onChange(async (value) => {
					this.plugin.settings.openLinkByClick = value;
					this.display();
					await this.plugin.saveSettings();
				});
			});

		// プレビュー
		this.containerEl.createEl("h4", {
			text: "Preview",
		});

		new Setting(containerEl)
			.setName("Inline preview")
			.setDesc("Show a few subsequent words next to the outline element name")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.inlinePreview).onChange(async (value) => {
					this.plugin.settings.inlinePreview = value;
					this.display();
					await this.plugin.saveSettings();
					this.callRefreshView(false);
				});
			});

		new Setting(containerEl)
			.setName("Tooltip preview")
			.setDesc("Show subsequent sentences as a tooltip when hover")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.tooltipPreview).onChange(async (value) => {
					this.plugin.settings.tooltipPreview = value;
					this.display();
					await this.plugin.saveSettings();
					this.callRefreshView(false);
				});
			});

		if (this.plugin.settings.tooltipPreview) {
			new Setting(containerEl)
				.setName("Tooltip preview direction")
				.setClass("setting-indent")
				.setDesc("specify the direction to display tooltip preview")
				.addDropdown((dropdown) => {
					dropdown
						.addOption("left", "left")
						.addOption("right", "right")
						.addOption("bottom", "bottom")
						.addOption("top", "top")
						.setValue(this.plugin.settings.tooltipPreviewDirection)
						.onChange(async (value) => {
							this.plugin.settings.tooltipPreviewDirection = value;
							this.display();
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						});
				});
		}
		// Popout Window
		this.containerEl.createEl("h4", {
			text: "Popout window",
			cls: "setting-category",
		});
		this.containerEl.createEl("p", {
			text: "Popout window size",
			cls: "setting-category",
		});
		new Setting(containerEl)
			.setName("Width")
			.setDesc("default & min = 600")
			.addText((text) => {
				text.inputEl.setAttr("type", "number");
				text.setPlaceholder(String(DEFAULT_SETTINGS.popoutSize.width)).setValue(
					String(this.plugin.settings.popoutSize.width),
				);

				text.inputEl.onblur = async (e: FocusEvent) => {
					let parsed = parseInt((e.target as HTMLInputElement).value, 10);
					if (parsed <= 600) {
						parsed = DEFAULT_SETTINGS.popoutSize.width;
					}
					this.plugin.settings.popoutSize.width = parsed;
					await this.plugin.saveSettings();
				};
			});

		new Setting(containerEl)
			.setName("Height")
			.setDesc("default = 800 min = 600")
			.addText((text) => {
				text.inputEl.setAttr("type", "number");
				text.setPlaceholder(String(DEFAULT_SETTINGS.popoutSize.height)).setValue(
					String(this.plugin.settings.popoutSize.height),
				);

				text.inputEl.onblur = async (e: FocusEvent) => {
					let parsed = parseInt((e.target as HTMLInputElement).value, 10);
					if (parsed <= 600) {
						parsed = DEFAULT_SETTINGS.popoutSize.height;
					}
					this.plugin.settings.popoutSize.height = parsed;
					await this.plugin.saveSettings();
				};
			});

		new Setting(containerEl).setName("Set popout window always on top").addToggle((toggle) => {
			toggle.setValue(this.plugin.settings.popoutAlwaysOnTop).onChange(async (value) => {
				this.plugin.settings.popoutAlwaysOnTop = value;
				this.display();
				await this.plugin.saveSettings();
			});
		});

		// Always on Top
		this.containerEl.createEl("h4", {
			text: "Always on top",
			cls: "setting-category",
		});
		new Setting(containerEl)
			.setName("Tags")
			.setDesc(
				"Notes with tags which match listed words are displayed on the top of the list. Separate with a new line.",
			)
			.addTextArea((textArea) => {
				textArea.setValue(this.plugin.settings.tagsAOT.join("\n"));
				textArea.inputEl.onblur = async (e: FocusEvent) => {
					const inputedValue = (e.target as HTMLInputElement).value;
					this.plugin.settings.tagsAOT = inputedValue.split("\n");
					await this.plugin.saveSettings();
					this.callRefreshView(false);
				};
			});

		// Recent/favorite
		this.containerEl.createEl("h4", {
			text: "Recent/favorites",
			cls: "setting-category",
		});

		new Setting(containerEl)
			.setName("Number of recent files/folders to be stored")
			.addText((text) => {
				text.inputEl.setAttr("type", "number");
				text.setPlaceholder(String(DEFAULT_SETTINGS.numOfRecentFiles)).setValue(
					String(this.plugin.settings.numOfRecentFiles),
				);

				text.inputEl.onblur = async (e: FocusEvent) => {
					let parsed = parseInt((e.target as HTMLInputElement).value, 10);
					if (parsed <= 0) {
						parsed = DEFAULT_SETTINGS.numOfRecentFiles;
					}
					this.plugin.settings.numOfRecentFiles = parsed;
					await this.plugin.saveSettings();
				};
			});

		new Setting(containerEl)
			.setName("Auto pin")
			.setDesc(
				"When File View is updated from recent/favorite files, automatically pin the view.",
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.pinAfterJump).onChange(async (value) => {
					this.plugin.settings.pinAfterJump = value;
					this.display();
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Save recent view")
			.setDesc(
				"If disabled, the history of views displayed will not be saved sequentially. History is sometimes lost, but the frequency of data.json rewriting and subsequent synchronization is reduced.",
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.saveRecentView).onChange(async (value) => {
					this.plugin.settings.saveRecentView = value;
					this.display();
					await this.plugin.saveSettings();
				});
			});

		// フィルター
		/*  filter関連コメントアウト
        this.containerEl.createEl("h4", {
            text: "Simple filter",
            cls: 'setting-category'
        });
        if (this.plugin.settings.showElements.heading){
            new Setting(containerEl)
            .setName("Headings to ignore")
            .setDesc("Headings which include listed words will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToIgnore.heading.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToIgnore.heading = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.callRefreshView(false);
                }
            });
        }

        if (this.plugin.settings.showElements.link){
            new Setting(containerEl)
            .setName("Links to ignore")
            .setDesc("Links which include listed words will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToIgnore.link.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToIgnore.link = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.callRefreshView(false);
                }
            });
        }

        if (this.plugin.settings.showElements.tag){
            new Setting(containerEl)
            .setName("Tags to ignore")
            .setDesc("tags which include listed words will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToIgnore.tag.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToIgnore.tag = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.callRefreshView(false);
                }
            });
        }

        if (this.plugin.settings.showElements.listItems){
            new Setting(containerEl)
            .setName("List items to ignore")
            .setDesc("List items which include listed words will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToIgnore.listItems.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToIgnore.listItems = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.callRefreshView(false);
                }
            });
        }

        // Include / Exclude
        this.containerEl.createEl("h4", {
            text: "Include",
            cls: 'setting-category'
        });
        this.containerEl.createEl("p", {
            text: "If you specify one outline element type and words to include, only elements which belong to the included elements are displayed.",
            cls:"setting-item-description",
        });
        new Setting(containerEl)
        .setName("Element type for include")
        .addDropdown((dropdown) => {
            dropdown
                .addOption("none", "none")
                .addOption("heading","heading")
                .addOption("link","link")
                .addOption("tag","tag")
                .addOption("listItems","listItems")
                .setValue(this.plugin.settings.includeOnly)
                .onChange(async (value) => {
                  this.plugin.settings.includeOnly = value;
                  this.display();
                  await this.plugin.saveSettings();
                  this.callRefreshView(false);
                })
        });

        if (this.plugin.settings.includeOnly != 'none'){
            new Setting(containerEl)
            .setName("Words to include")
            .setClass('setting-indent')
            .setDesc("Only elements specified in 'Element type for include' which include listed words will be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToInclude.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToInclude = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.callRefreshView(false);
                }
            });

            new Setting(containerEl)
            .setName("Include the beginning part")
            .setClass('setting-indent')
            .setDesc("Specify whether to include the beginning parts of each daily note with no element to include ")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.includeBeginning)
                    .onChange(async (value) => {
                        this.plugin.settings.includeBeginning = value;
                        this.display();
                        await this.plugin.saveSettings();
                        this.callRefreshView(false);
                    })

            });
        }

        this.containerEl.createEl("h4", {
            text: "Exclude",
            cls: 'setting-category'
        });
        this.containerEl.createEl("p", {
            text: "Specified outline elements and elements belonging to that element will not be displayed.",
            cls:"setting-item-description",
        });
        new Setting(containerEl)
        .setName("Exclusion ends at")
        .setDesc("Excluding elements specified below ends at the selected type of elements. If you specified 'Element type for include' above, this value is ignored and excludeing elements ends at that type of elements.")
        .addDropdown((dropdown) => {
            dropdown
                .addOption("none", "none")
                .addOption("heading","heading")
                .addOption("link","link")
                .addOption("tag","tag")
                .addOption("listItems","listItems")
                .setValue(this.plugin.settings.primeElement)
                .onChange(async (value) => {
                  this.plugin.settings.primeElement = value;
                  this.display();
                  await this.plugin.saveSettings();
                  this.callRefreshView(false);
                })
        });

        if (this.plugin.settings.showElements.heading){
            new Setting(containerEl)
            .setName("Headings to exclude")
            .setDesc("Headings which include listed words and elements which belong to them will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToExclude.heading.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToExclude.heading = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.callRefreshView(false);
                }
            });
        }

        if (this.plugin.settings.showElements.link){
            new Setting(containerEl)
            .setName("Links to exclude")
            .setDesc("Links which include listed words and elements which belong to them will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToExclude.link.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToExclude.link = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.callRefreshView(false);
                }
            });
        }


        if (this.plugin.settings.showElements.tag){
            new Setting(containerEl)
            .setName("Tags to exclude")
            .setDesc("tags which include listed words and elements which belong to them will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToExclude.tag.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToExclude.tag = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.callRefreshView(false);
                }
            });
        }

        if (this.plugin.settings.showElements.listItems){
            new Setting(containerEl)
            .setName("List items to exclude")
            .setDesc("List items which include listed words and elements which belong to them will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToExclude.listItems.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToExclude.listItems = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.callRefreshView(false);
                }
            });
        }
        */

		// 外観
		this.containerEl.createEl("h4", {
			text: "Appearnce",
			cls: "setting-category",
		});

		// 要素名の折り返し
		new Setting(containerEl)
			.setName("Wrap outline element text")
			.setDesc("If enabled, long element names are displayed wrapped on multiple lines")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.wrapLine).onChange(async (value) => {
					this.plugin.settings.wrapLine = value;
					this.display();
					await this.plugin.saveSettings();
					this.callRefreshView(false);
				});
			});

		// headingのインデントレベルにあわせて他の要素をインデントするか
		new Setting(containerEl)
			.setName("Indent other than headings")
			.setDesc(
				"Whether other elements should be indented to preceding headings (default = preceding heading +1)",
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption("0", "none")
					.addOption("1", "follow preceding heading")
					.addOption("2", "preceding heading + 1")
					.setValue(String(this.plugin.settings.indentFollowHeading))
					.onChange(async (value) => {
						this.plugin.settings.indentFollowHeading = Number(value);
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					});
			});

		// ノートタイトルの背景色
		new Setting(containerEl)
			.setName("Note title background color")
			.setDesc(
				"No change: use the current CSS theme setting values(Texts may be overlapped). Same as outlines: default theme explorer color. Accent: highlight file names. Custom: Specify any color code. Please update the view when you toggled Obsidian's base theme(light/dark). (default = accent)",
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", "no change")
					.addOption("default", "same as outlines")
					.addOption("accent", "accent")
					.addOption("custom", "custom")
					.setValue(this.plugin.settings.noteTitleBackgroundColor)
					.onChange(async (value) => {
						this.plugin.settings.noteTitleBackgroundColor = value;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					});
			});

		if (this.plugin.settings.noteTitleBackgroundColor == "custom") {
			new Setting(containerEl)
				.setName("Custom note title background color (light)")
				.setClass("setting-indent")
				.setDesc("Specify background color (ex. #FFFFFF or rgb(255,255,255))")
				.addText((text) => {
					text.inputEl.setAttr("type", "string");
					text.setValue(this.plugin.settings.customNoteTitleBackgroundColor.light);
					text.inputEl.onblur = async (e: FocusEvent) => {
						const inputedValue = (e.target as HTMLInputElement).value;
						this.plugin.settings.customNoteTitleBackgroundColor.light = inputedValue;
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					};
				});

			new Setting(containerEl)
				.setName("Custom note title background color (light, on hover)")
				.setClass("setting-indent")
				.setDesc("Specify background color on hover (ex. #FFFFFF or rgb(255,255,255))")
				.addText((text) => {
					text.inputEl.setAttr("type", "string");
					text.setValue(this.plugin.settings.customNoteTitleBackgroundColorHover.light);
					text.inputEl.onblur = async (e: FocusEvent) => {
						const inputedValue = (e.target as HTMLInputElement).value;
						this.plugin.settings.customNoteTitleBackgroundColorHover.light =
							inputedValue;
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					};
				});
			new Setting(containerEl)
				.setName("Custom note title background color (dark)")
				.setClass("setting-indent")
				.setDesc("Specify background color (ex. #FFFFFF or rgb(255,255,255))")
				.addText((text) => {
					text.inputEl.setAttr("type", "string");
					text.setValue(this.plugin.settings.customNoteTitleBackgroundColor.dark);
					text.inputEl.onblur = async (e: FocusEvent) => {
						const inputedValue = (e.target as HTMLInputElement).value;
						this.plugin.settings.customNoteTitleBackgroundColor.dark = inputedValue;
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					};
				});

			new Setting(containerEl)
				.setName("Custom note title background color (dark, on hover)")
				.setClass("setting-indent")
				.setDesc("Specify background color on hover (ex. #FFFFFF or rgb(255,255,255))")
				.addText((text) => {
					text.inputEl.setAttr("type", "string");
					text.setValue(this.plugin.settings.customNoteTitleBackgroundColorHover.dark);
					text.inputEl.onblur = async (e: FocusEvent) => {
						const inputedValue = (e.target as HTMLInputElement).value;
						this.plugin.settings.customNoteTitleBackgroundColorHover.dark =
							inputedValue;
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					};
				});
		}

		// 見出し
		if (this.plugin.settings.showElements.heading) {
			this.containerEl.createEl("p", {
				text: "Headings",
				cls: "setting-category",
			});
			new Setting(containerEl)
				.setName("Icon")
				.setClass("setting-indent")
				.addDropdown((dropdown) => {
					dropdown
						.addOption("none", "none")
						//.addOption("heading","heading")
						.addOption("hash", "hash")
						.addOption("chevron-right", "chevron-right")
						//.addOption("headingwithnumber","heading with number")
						.addOption("custom", "custom")
						.setValue(this.plugin.settings.icon.heading)
						.onChange(async (value) => {
							this.plugin.settings.icon.heading = value;
							this.display();
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						});
				});

			if (this.plugin.settings.icon.heading == "custom") {
				new Setting(containerEl)
					.setName("Custom icon")
					.setClass("setting-indent-2")
					.setDesc("enter Lucide Icon name")
					.addText((text) => {
						text.inputEl.setAttr("type", "string");
						text.setPlaceholder(DEFAULT_SETTINGS.customIcon.heading).setValue(
							this.plugin.settings.customIcon.heading,
						);
						text.inputEl.onblur = async (e: FocusEvent) => {
							const inputedValue = (e.target as HTMLInputElement).value;
							this.plugin.settings.customIcon.heading = inputedValue;
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						};
					});
			}

			new Setting(containerEl)
				.setName("Prefix")
				.setClass("setting-indent")
				.addText((text) => {
					text.inputEl.setAttr("type", "string");
					text.setPlaceholder(DEFAULT_SETTINGS.prefix.heading).setValue(
						this.plugin.settings.prefix.heading,
					);
					text.inputEl.onblur = async (e: FocusEvent) => {
						const inputedValue = (e.target as HTMLInputElement).value;
						this.plugin.settings.prefix.heading = inputedValue;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					};
				});

			if (this.plugin.settings.prefix.heading != "") {
				new Setting(containerEl)
					.setName("Repeat heading prefix")
					.setClass("setting-indent-2")
					.addDropdown((dropdown) => {
						dropdown
							.addOption("none", "none")
							.addOption("level", "as many times as its level")
							.addOption("levelminus1", "level - 1")
							.setValue(this.plugin.settings.repeatHeadingPrefix)
							.onChange(async (value) => {
								this.plugin.settings.repeatHeadingPrefix = value;
								this.display();
								await this.plugin.saveSettings();
								this.callRefreshView(false);
							});
					});
			}
			new Setting(containerEl)
				.setName("Add indent")
				.setClass("setting-indent")
				.addToggle((toggle) => {
					toggle.setValue(this.plugin.settings.indent.heading).onChange(async (value) => {
						this.plugin.settings.indent.heading = value;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					});
				});
		}

		// リンク
		if (this.plugin.settings.showElements.link) {
			this.containerEl.createEl("p", {
				text: "Links",
				cls: "setting-category",
			});
			new Setting(containerEl)
				.setName("Icon")
				.setClass("setting-indent")
				.addDropdown((dropdown) => {
					dropdown
						.addOption("none", "none")
						.addOption("link", "link")
						.addOption("link-2", "link-2")
						.addOption("custom", "custom")
						.setValue(this.plugin.settings.icon.link)
						.onChange(async (value) => {
							this.plugin.settings.icon.link = value;
							this.display();
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						});
				});

			if (this.plugin.settings.icon.link == "custom") {
				new Setting(containerEl)
					.setName("Custom icon")
					.setClass("setting-indent-2")
					.setDesc("enter Lucide Icon name")
					.addText((text) => {
						text.inputEl.setAttr("type", "string");
						text.setPlaceholder(DEFAULT_SETTINGS.customIcon.link).setValue(
							this.plugin.settings.customIcon.link,
						);
						text.inputEl.onblur = async (e: FocusEvent) => {
							const inputedValue = (e.target as HTMLInputElement).value;
							this.plugin.settings.customIcon.link = inputedValue;
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						};
					});
			}

			new Setting(containerEl)
				.setName("Prefix")
				.setClass("setting-indent")
				.addText((text) => {
					text.inputEl.setAttr("type", "string");
					text.setPlaceholder(DEFAULT_SETTINGS.prefix.link).setValue(
						this.plugin.settings.prefix.link,
					);
					text.inputEl.onblur = async (e: FocusEvent) => {
						const inputedValue = (e.target as HTMLInputElement).value;
						this.plugin.settings.prefix.link = inputedValue;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					};
				});
		}

		// タグ

		if (this.plugin.settings.showElements.tag) {
			this.containerEl.createEl("p", {
				text: "Tags",
				cls: "setting-category",
			});
			new Setting(containerEl)
				.setName("Icon")
				.setClass("setting-indent")
				.addDropdown((dropdown) => {
					dropdown
						.addOption("none", "none")
						.addOption("tag", "tag")
						.addOption("hash", "hash")
						.addOption("custom", "custom")
						.setValue(this.plugin.settings.icon.tag)
						.onChange(async (value) => {
							this.plugin.settings.icon.tag = value;
							this.display();
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						});
				});

			if (this.plugin.settings.icon.tag == "custom") {
				new Setting(containerEl)
					.setName("Custom icon")
					.setClass("setting-indent-2")
					.setDesc("enter Lucide Icon name")
					.addText((text) => {
						text.inputEl.setAttr("type", "string");
						text.setPlaceholder(DEFAULT_SETTINGS.customIcon.tag).setValue(
							this.plugin.settings.customIcon.tag,
						);
						text.inputEl.onblur = async (e: FocusEvent) => {
							const inputedValue = (e.target as HTMLInputElement).value;
							this.plugin.settings.customIcon.tag = inputedValue;
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						};
					});
			}

			new Setting(containerEl)
				.setName("Prefix")
				.setClass("setting-indent")
				.addText((text) => {
					text.inputEl.setAttr("type", "string");
					text.setPlaceholder(DEFAULT_SETTINGS.prefix.tag).setValue(
						this.plugin.settings.prefix.tag,
					);
					text.inputEl.onblur = async (e: FocusEvent) => {
						const inputedValue = (e.target as HTMLInputElement).value;
						this.plugin.settings.prefix.tag = inputedValue;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					};
				});
		}

		// リスト

		if (this.plugin.settings.showElements.link) {
			this.containerEl.createEl("p", {
				text: "List items",
				cls: "setting-category",
			});
			new Setting(containerEl)
				.setName("Icon")
				.setClass("setting-indent")
				.addDropdown((dropdown) => {
					dropdown
						.addOption("none", "none")
						.addOption("list", "list")
						.addOption("chevron-right", "chevron-right")
						.addOption("minus", "minus")
						.addOption("circle-dot", "circle-dot")
						.addOption("asterisk", "asterisk")
						.addOption("custom", "custom")
						.setValue(this.plugin.settings.icon.listItems)
						.onChange(async (value) => {
							this.plugin.settings.icon.listItems = value;
							this.display();
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						});
				});

			if (this.plugin.settings.icon.listItems == "custom") {
				new Setting(containerEl)
					.setName("Custom icon")
					.setClass("setting-indent-2")
					.setDesc("enter Lucide Icon name")
					.addText((text) => {
						text.inputEl.setAttr("type", "string");
						text.setPlaceholder(DEFAULT_SETTINGS.customIcon.listItems).setValue(
							this.plugin.settings.customIcon.listItems,
						);
						text.inputEl.onblur = async (e: FocusEvent) => {
							const inputedValue = (e.target as HTMLInputElement).value;
							this.plugin.settings.customIcon.listItems = inputedValue;
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						};
					});
			}

			new Setting(containerEl)
				.setName("Prefix")
				.setClass("setting-indent")
				.addText((text) => {
					text.inputEl.setAttr("type", "string");
					text.setPlaceholder(DEFAULT_SETTINGS.prefix.listItems).setValue(
						this.plugin.settings.prefix.listItems,
					);
					text.inputEl.onblur = async (e: FocusEvent) => {
						const inputedValue = (e.target as HTMLInputElement).value;
						this.plugin.settings.prefix.listItems = inputedValue;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					};
				});

			//未完了タスク
			this.containerEl.createEl("p", {
				text: "Tasks",
				cls: "setting-category",
			});
			new Setting(containerEl)
				.setName("Icon")
				.setClass("setting-indent")
				.addDropdown((dropdown) => {
					dropdown
						.addOption("none", "none")
						.addOption("square", "square")
						.addOption("circle", "circle")
						.addOption("list-checks", "list-checks")
						.addOption("custom", "custom")
						.setValue(this.plugin.settings.icon.task)
						.onChange(async (value) => {
							this.plugin.settings.icon.task = value;
							this.display();
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						});
				});

			if (this.plugin.settings.icon.task == "custom") {
				new Setting(containerEl)
					.setName("Custom icon")
					.setClass("setting-indent-2")
					.setDesc("enter Lucide Icon name")
					.addText((text) => {
						text.inputEl.setAttr("type", "string");
						text.setPlaceholder(DEFAULT_SETTINGS.customIcon.task).setValue(
							this.plugin.settings.customIcon.task,
						);
						text.inputEl.onblur = async (e: FocusEvent) => {
							const inputedValue = (e.target as HTMLInputElement).value;
							this.plugin.settings.customIcon.task = inputedValue;
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						};
					});
			}

			new Setting(containerEl)
				.setName("Prefix")
				.setClass("setting-indent")
				.addText((text) => {
					text.inputEl.setAttr("type", "string");
					text.setPlaceholder(DEFAULT_SETTINGS.prefix.task).setValue(
						this.plugin.settings.prefix.task,
					);
					text.inputEl.onblur = async (e: FocusEvent) => {
						const inputedValue = (e.target as HTMLInputElement).value;
						this.plugin.settings.prefix.task = inputedValue;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					};
				});
			new Setting(containerEl)
				.setName("Add checkbox text to prefix")
				.setDesc("add [ ] or [x]")
				.setClass("setting-indent")
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.addCheckboxText)
						.onChange(async (value) => {
							this.plugin.settings.addCheckboxText = value;
							this.display();
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						});
				});
			//完了済みタスク
			this.containerEl.createEl("p", {
				text: "Completed tasks",
				cls: "setting-category",
			});
			new Setting(containerEl)
				.setName("Icon")
				.setClass("setting-indent")
				.addDropdown((dropdown) => {
					dropdown
						.addOption("none", "none")
						.addOption("check-square", "check-square")
						.addOption("check-circle", "check-circle")
						.addOption("check", "check")
						.addOption("custom", "custom")
						.setValue(this.plugin.settings.icon.taskDone)
						.onChange(async (value) => {
							this.plugin.settings.icon.taskDone = value;
							this.display();
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						});
				});

			if (this.plugin.settings.icon.taskDone == "custom") {
				new Setting(containerEl)
					.setName("Custom icon")
					.setClass("setting-indent-2")
					.setDesc("enter Lucide Icon name")
					.addText((text) => {
						text.inputEl.setAttr("type", "string");
						text.setPlaceholder(DEFAULT_SETTINGS.customIcon.taskDone).setValue(
							this.plugin.settings.customIcon.taskDone,
						);
						text.inputEl.onblur = async (e: FocusEvent) => {
							const inputedValue = (e.target as HTMLInputElement).value;
							this.plugin.settings.customIcon.taskDone = inputedValue;
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						};
					});
			}

			new Setting(containerEl)
				.setName("Prefix")
				.setClass("setting-indent")
				.addText((text) => {
					text.inputEl.setAttr("type", "string");
					text.setPlaceholder(DEFAULT_SETTINGS.prefix.taskDone).setValue(
						this.plugin.settings.prefix.taskDone,
					);
					text.inputEl.onblur = async (e: FocusEvent) => {
						const inputedValue = (e.target as HTMLInputElement).value;
						this.plugin.settings.prefix.taskDone = inputedValue;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					};
				});
		}

		//バックリンク
		if (this.plugin.settings.showBacklinks) {
			this.containerEl.createEl("p", {
				text: "Backlinks",
				cls: "setting-category",
			});
			new Setting(containerEl)
				.setName("Icon")
				.setClass("setting-indent")
				.addDropdown((dropdown) => {
					dropdown
						.addOption("none", "none")
						.addOption("links-coming-in", "links-coming-in")
						.addOption("file", "file")
						.addOption("corner-up-left", "corner-up-left")
						.addOption("custom", "custom")
						.setValue(this.plugin.settings.icon.backlink)
						.onChange(async (value) => {
							this.plugin.settings.icon.backlink = value;
							this.display();
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						});
				});

			if (this.plugin.settings.icon.backlink == "custom") {
				new Setting(containerEl)
					.setName("Custom icon")
					.setClass("setting-indent-2")
					.setDesc("enter Lucide Icon name")
					.addText((text) => {
						text.inputEl.setAttr("type", "string");
						text.setPlaceholder(DEFAULT_SETTINGS.customIcon.backlink).setValue(
							this.plugin.settings.customIcon.backlink,
						);
						text.inputEl.onblur = async (e: FocusEvent) => {
							const inputedValue = (e.target as HTMLInputElement).value;
							this.plugin.settings.customIcon.backlink = inputedValue;
							await this.plugin.saveSettings();
							this.callRefreshView(false);
						};
					});
			}

			new Setting(containerEl)
				.setName("Prefix")
				.setClass("setting-indent")
				.addText((text) => {
					text.inputEl.setAttr("type", "string");
					text.setPlaceholder(DEFAULT_SETTINGS.prefix.backlink).setValue(
						this.plugin.settings.prefix.backlink,
					);
					text.inputEl.onblur = async (e: FocusEvent) => {
						const inputedValue = (e.target as HTMLInputElement).value;
						this.plugin.settings.prefix.backlink = inputedValue;
						this.display();
						await this.plugin.saveSettings();
						this.callRefreshView(false);
					};
				});
		}

		this.containerEl.createEl("h4", {
			text: "Others",
			cls: "setting-category",
		});
		// 読み込み上限
		new Setting(containerEl)
			.setName("Maximum number of files to read")
			.setDesc(
				"To avoid overloading, files that exceed this number will be initially collapsed. (default = 50)",
			)
			.addText((text) => {
				text.inputEl.setAttr("type", "number");
				text.setPlaceholder(String(DEFAULT_SETTINGS.readLimit)).setValue(
					String(this.plugin.settings.readLimit),
				);

				text.inputEl.onblur = async (e: FocusEvent) => {
					let parsed = parseInt((e.target as HTMLInputElement).value, 10);
					if (parsed <= 0) {
						parsed = DEFAULT_SETTINGS.readLimit;
					}
					this.plugin.settings.readLimit = parsed;
					await this.plugin.saveSettings();
					this.callRefreshView(true);
				};
			});

		// 処理上限
		new Setting(containerEl)
			.setName("Maximum number of files to process")
			.setDesc(
				"To avoid overloading, if the number of files to be displayed exceeds this number, all files will be initially collapsed. (default = 100)",
			)
			.addText((text) => {
				text.inputEl.setAttr("type", "number");
				text.setPlaceholder(String(DEFAULT_SETTINGS.processLimit)).setValue(
					String(this.plugin.settings.processLimit),
				);

				text.inputEl.onblur = async (e: FocusEvent) => {
					let parsed = parseInt((e.target as HTMLInputElement).value, 10);
					if (parsed <= 0) {
						parsed = DEFAULT_SETTINGS.processLimit;
					}
					this.plugin.settings.processLimit = parsed;
					await this.plugin.saveSettings();
					this.callRefreshView(true);
				};
			});

		new Setting(containerEl)
			.setName("Startup delay time(ms)")
			.setDesc("Wait for the specified time at startup. (default = 300)")
			.addText((text) => {
				text.inputEl.setAttr("type", "number");
				text.setPlaceholder(String(DEFAULT_SETTINGS.bootDelayTime)).setValue(
					String(this.plugin.settings.bootDelayTime),
				);

				text.inputEl.onblur = async (e: FocusEvent) => {
					let parsed = parseInt((e.target as HTMLInputElement).value, 10);
					if (parsed <= 0 || parsed >= 200000) {
						parsed = DEFAULT_SETTINGS.bootDelayTime;
					}
					this.plugin.settings.bootDelayTime = parsed;
					await this.plugin.saveSettings();
				};
			});

		new Setting(containerEl)
			.setName("show debug information")
			.setDesc("display debug information in the console")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showDebugInfo).onChange(async (value) => {
					this.plugin.settings.showDebugInfo = value;
					this.display();
					await this.plugin.saveSettings();
				});
			});
	}

	callRefreshView(reload: boolean): void {
		if (this.plugin.view) {
			this.plugin.view.refreshView(reload, reload);
		}
		if (this.plugin.folderview) {
			this.plugin.folderview.refreshView(reload, reload);
		}
	}
}
