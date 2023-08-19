import { MultipleNotesOutlineView } from "./fileView";
import { MultipleNotesOutlineFolderView } from "./folderView";
import MultipleNotesOutlinePlugin from "./main";

import { setIcon, TFile, Menu } from 'obsidian';

import { ModalExtract } from 'src/modalExtract'

// 操作アイコン部分を描画
export function drawUI(): void {

    const navHeader: HTMLElement = createDiv("nav-header");
    const navButtonContainer: HTMLElement = navHeader.createDiv("nav-buttons-container");

    // アイコン描画
    uiUpdate.call(this, navButtonContainer);
    uiSetting.call(this, navButtonContainer);
    uiToggleHeading.call(this, navButtonContainer);
    uiToggleLink.call(this, navButtonContainer);
    uiToggleListItems.call(this, navButtonContainer);
    uiToggleBacklinks.call(this, navButtonContainer);
    //uiExtract.call(this, navButtonContainer);
    uiCollapse.call(this, navButtonContainer);


    // 描画実行
    this.contentEl.empty();
    this.contentEl.appendChild(navHeader);
}


export function drawUIFolderView(): void {

    const navHeader: HTMLElement = createDiv("nav-header");
    const navButtonContainer: HTMLElement = navHeader.createDiv("nav-buttons-container");

    // アイコン描画
    uiUpdateFolderView.call(this, navButtonContainer);
    uiSettingFolderView.call(this, navButtonContainer);
    uiToggleHeading.call(this, navButtonContainer);
    uiToggleLink.call(this, navButtonContainer);
    uiToggleListItems.call(this, navButtonContainer);
    uiToggleBacklinks.call(this, navButtonContainer);
    //uiExtract.call(this, navButtonContainer);
    uiCollapse.call(this, navButtonContainer);


    // 描画実行
    this.contentEl.empty();
    this.contentEl.appendChild(navHeader);
}

// 更新ボタン
function uiUpdate (parentEl:HTMLElement):void{
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    navActionButton.ariaLabel = "update view";
    setIcon(navActionButton,"refresh-cw");
    navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            const file = this.app.workspace.getActiveFile();
            if (file instanceof TFile){
                this.activeFile = file;
                this.targetFiles.main[0] = this.activeFile;
                this.refreshView(true, true);
            }
        }
    );
}
// 更新ボタン folder view
function uiUpdateFolderView (parentEl:HTMLElement):void{
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    navActionButton.ariaLabel = "update view";
    setIcon(navActionButton,"refresh-cw");
    navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            const file = this.app.workspace.getActiveFile();
            if (file instanceof TFile){
                this.targetFolder = file.parent;
                this.hasMainChanged = true;
                
                // 保留
                // this.app.workspace.requestSaveLayout();

                this.refreshView(true, true);

            }
        }
    );
}



// 設定ボタン
function uiSetting (parentEl:HTMLElement):void{
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    navActionButton.ariaLabel = "open settings";
    setIcon(navActionButton,"settings");
    navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.app.setting.open();
            this.app.setting.openTabById(this.plugin.manifest.id);
        }
    );

    navActionButton.addEventListener(
        "contextmenu",
        (event: MouseEvent) => {
            const menu = new Menu();
            //各カテゴリの表示/非表示
            for (const category in this.settings.showFiles){
                const icon = ( this.settings.showFiles[category] == true)? "check":"";
                menu.addItem((item)=>
                    item
                        .setTitle(`show ${category} section`)
                        .setIcon(icon)
                        .onClick(async()=>{
                            this.settings.showFiles[category] = !this.settings.showFiles[category];
                            await this.plugin.saveSettings();
                            this.refreshView(false,false);
                        })
                );
            }

            menu.addSeparator();
            // 各要素の表示非表示
            for (const element in this.settings.showElements){
                const icon = ( this.settings.showElements[element] == true)? "check":"";
                menu.addItem((item)=>
                    item
                        .setTitle(`show ${element}`)
                        .setIcon(icon)
                        .onClick(async()=>{
                            this.settings.showElements[element] = !this.settings.showElements[element];
                            await this.plugin.saveSettings();
                            this.refreshView(false,false);
                        })
                );
            }
            if (this.settings.showElements.listItems){
                const icon = (this.settings.taskOnly)? "check": "";
                menu.addItem((item)=>
                    item
                        .setTitle("tasks only")
                        .setIcon(icon)
                        .onClick(async()=>{
                            this.settings.taskOnly = !this.settings.taskOnly;
                            await this.plugin.saveSettings();
                            this.refreshView(false,false);
                        })
                );
            }

            let icon = (this.settings.showBacklinks)? "check": "";
            menu.addItem((item)=>
                    item
                        .setTitle("show 2-hop backlinks")
                        .setIcon(icon)
                        .onClick(async()=>{
                            this.settings.showBacklinks = !this.settings.showBacklinks;
                            await this.plugin.saveSettings();
                            this.refreshView(false,false);
                        })
                );

            menu.addSeparator();

            icon = (this.settings.tooltipPreview)? "check":"";
            menu.addItem((item)=>
                item
                    .setTitle("show tooltip preview")
                    .setIcon(icon)
                    .onClick(async()=>{
                        this.settings.tooltipPreview = !this.settings.tooltipPreview;
                        await this.plugin.saveSettings();
                        this.refreshView(false,false);
                    })
            );
            menu.showAtMouseEvent(event);
        }
    )
}

// 設定ボタン Folder view
function uiSettingFolderView (parentEl:HTMLElement, instance: MultipleNotesOutlineFolderView):void{
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    navActionButton.ariaLabel = "open settings";
    setIcon(navActionButton,"settings");
    navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.app.setting.open();
            this.app.setting.openTabById(this.plugin.manifest.id);
        }
    );

    navActionButton.addEventListener(
        "contextmenu",
        (event: MouseEvent) => {
            const menu = new Menu();

            // 各要素の表示非表示
            for (const element in this.settings.showElements){
                const icon = ( this.settings.showElements[element] == true)? "check":"";
                menu.addItem((item)=>
                    item
                        .setTitle(`show ${element}`)
                        .setIcon(icon)
                        .onClick(async()=>{
                            this.settings.showElements[element] = !this.settings.showElements[element];
                            await this.plugin.saveSettings();
                            this.refreshView(false,false);
                        })
                );
            }
            if (this.settings.showElements.listItems){
                const icon = (this.settings.taskOnly)? "check": "";
                menu.addItem((item)=>
                    item
                        .setTitle("tasks only")
                        .setIcon(icon)
                        .onClick(async()=>{
                            this.settings.taskOnly = !this.settings.taskOnly;
                            await this.plugin.saveSettings();
                            this.refreshView(false,false);
                        })
                );
            }

            let icon = (this.settings.showBacklinks)? "check": "";
            menu.addItem((item)=>
                    item
                        .setTitle("show 2-hop backlinks")
                        .setIcon(icon)
                        .onClick(async()=>{
                            this.settings.showBacklinks = !this.settings.showBacklinks;
                            await this.plugin.saveSettings();
                            this.refreshView(false,false);
                        })
                );

            menu.addSeparator();

            icon = (this.settings.tooltipPreview)? "check":"";
            menu.addItem((item)=>
                item
                    .setTitle("show tooltip preview")
                    .setIcon(icon)
                    .onClick(async()=>{
                        this.settings.tooltipPreview = !this.settings.tooltipPreview;
                        await this.plugin.saveSettings();
                        this.refreshView(false,false);
                    })
            );

            menu.addSeparator();

            icon = (this.settings.collapseFolder)? "check":"";
            menu.addItem((item)=>
                item
                    .setTitle("collapse subfolder")
                    .setIcon(icon)
                    .onClick(async()=>{
                        this.settings.collapseFolder = !this.settings.collapseFolder;
                        await this.plugin.saveSettings();
                        this.refreshView(true, true);
                    })
            );
            menu.showAtMouseEvent(event);
        }
    )
}

function uiToggleHeading (parentEl:HTMLElement):void{
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    navActionButton.ariaLabel = "toggle headings";
    setIcon(navActionButton,"heading");
    if (this.settings.showElements.heading){
        navActionButton.classList.add('is-active');
    }
    navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.settings.showElements.heading = !this.settings.showElements.heading;
            await this.plugin.saveSettings();
            this.refreshView(false,false);
        }
    );
}

function uiToggleLink (parentEl:HTMLElement):void{
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    navActionButton.ariaLabel = "toggle links";
    setIcon(navActionButton,"link");
    if (this.settings.showElements.link){
        navActionButton.classList.add('is-active');
    }
    navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.settings.showElements.link = !this.settings.showElements.link;
            await this.plugin.saveSettings();
            this.refreshView(false,false);
        }
    );
}

function uiToggleListItems (parentEl:HTMLElement):void{
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    navActionButton.ariaLabel = "toggle list items";
    setIcon(navActionButton,"list");
    if (this.settings.showElements.listItems){
        navActionButton.classList.add('is-active');
    }
    navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.settings.showElements.listItems = !this.settings.showElements.listItems;
            await this.plugin.saveSettings();
            this.refreshView(false,false);
        }
    );
}

// バックリンクオンオフ
function uiToggleBacklinks (parentEl:HTMLElement):void{
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    navActionButton.ariaLabel = "toggle backlinks";
    setIcon(navActionButton,"links-coming-in");
    if (this.settings.showBacklinks){
        navActionButton.classList.add('is-active');
    }
    navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.settings.showBacklinks = !this.settings.showBacklinks;
            await this.plugin.saveSettings();
            this.refreshView(false,false);
        }
    );
}

//抽出
// function uiExtract (parentEl:HTMLElement):void{
//     let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
//     if (!this.extractMode){
//         //抽出をオンに
//         navActionButton.ariaLabel = "extract";
//         setIcon(navActionButton,"search");
//         navActionButton.addEventListener(
//             "click",
//             async (event:MouseEvent) =>{
//                 //入力モーダルを開く
//                 event.preventDefault;
//                 const onSubmit = (enableExtract: boolean) => {
//                     if (enableExtract){
//                         this.extractMode = true;
//                         this.refreshView(false,false);
//                     }
//                 }

//                 new ModalExtract(this.app, this.plugin, onSubmit).open();
//             });
//     } else {
//         //抽出をオフに
//         navActionButton.ariaLabel = "unextract";
//         setIcon(navActionButton,"x-circle");
//         navActionButton.classList.add('is-active');
//         navActionButton.addEventListener(
//         "click",
//             async (event:MouseEvent) =>{
//                 this.extractMode = false;
//                 this.extractTask = false;
//                 this.refreshView(false,false);

//             });
//     }
//     navActionButton.addEventListener(
//         "contextmenu",
//         (event: MouseEvent) => {
//             const menu = new Menu();
//             menu.addItem((item) =>
//                 item
//                     .setTitle("extract tasks")
//                     .setIcon("check-square")
//                     .onClick(async ()=> {
//                         this.extractMode = true;
//                         this.extractTask = true;
//                         this.refreshView(false,false); 
//                     })
//             );
//             menu.showAtMouseEvent(event);
//         }
//     );
// }

//全体フォールド

function uiCollapse (parentEl:HTMLElement):void{
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    if (this.collapseAll){
        navActionButton.classList.add('is-active');
    }
    if (!this.collapseAll){
        //全体フォールドをオンに
        navActionButton.ariaLabel = "collapse all";
        setIcon(navActionButton,"chevrons-down-up");
        navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.collapseAll = true;
            this.refreshView(false,false);
        });
    } else {
        //全体フォールドをオフに
        navActionButton.ariaLabel = "expand";
        setIcon(navActionButton,"chevrons-down-up");
        navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.collapseAll = false;
            this.refreshView(false,false);

        });
    }
}