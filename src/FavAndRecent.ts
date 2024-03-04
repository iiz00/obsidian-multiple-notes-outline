import { App, SuggestModal, TAbstractFile, TFile } from "obsidian";
import { MultipleNotesOutlineView } from "./fileView";
import { MultipleNotesOutlineFolderView } from "./folderView";
import MultipleNotesOutlinePlugin, { MultipleNotesOutlineSettings } from "./main";

export async function updateFavAndRecent(targetPath: string, category: 'file'|'folder', suggestType: 'recent'|'favorite'):Promise<void> {
    this.settings[suggestType][category] = this.settings[suggestType][category].filter(
        (value: string) => targetPath !== value
    );

    this.settings[suggestType][category].unshift(targetPath);

    if (this.settings.recent[category].length > this.settings.numOfRecentFiles){
        const numToDelete = this.settings.recent[category].length - this.settings.numOfRecentFiles;
        for (let i=0; i< numToDelete; i++){
            this.settings.recent[category].pop();
        }
    }
    if (this.settings.saveRecentView || this.suggestType =='favorite'){
        await this.plugin.saveSettings();
    }
}

export async function deleteFavAndRecent(targetPath: string, category: 'file'|'folder', suggestType: 'recent'|'favorite'):Promise<void> {
    this.settings[suggestType][category] = this.settings[suggestType][category].filter(
        (value: string) => targetPath !== value
    );
    if (this.settings.saveRecentView || this.suggestType =='favorite'){
        await this.plugin.saveSettings();
    }
}

export class ModalJump extends SuggestModal<string>{

    //plugin: MultipleNotesOutlinePlugin;
    view: MultipleNotesOutlineView | MultipleNotesOutlineFolderView;
    category: 'file'|'folder';
    suggestType: 'recent'|'favorite';
    onSubmit: (item: string) => void;
   
    constructor(
        app: App,
        view: MultipleNotesOutlineView | MultipleNotesOutlineFolderView,
        category: 'file'|'folder',
        suggestType: 'recent'|'favorite',
        onSubmit: (item: string) => void,
    ){
        super(app);
        this.view = view;
        this.category = category;
        this.suggestType = suggestType;
        this.onSubmit = onSubmit;
    }

    onOpen(): void{
        this.setPlaceholder("Jump to "+this.suggestType+" "+this.category+"s");
        this.setInstructions([
            { command: "Enter", purpose: "Jump to item"},
            { command: "Ctrl + Enter", purpose: "Add to Favorites"},
            { command: "Delete", purpose: "Remove from the list"},
            { command: "ESC", purpose: "Dismiss"}
        ]);

        this.scope.register(['Ctrl'], 'Enter', 
			(evt: KeyboardEvent)=>{
                // @ts-ignore
                const item = this.chooser.values?.[this.chooser.selectedItem];
                updateFavAndRecent.call(this.view, item, this.category, 'favorite');
                this.close();
			}
        );
        this.scope.register([], 'Delete', 
			(evt: KeyboardEvent)=>{
                // @ts-ignore
                const item = this.chooser.values?.[this.chooser.selectedItem];
                deleteFavAndRecent.call(this.view, item, this.category, this.suggestType);
                this.close();
			}
        );
        
        super.onOpen();
    }
    
    getSuggestions(query:string): string[] {
        return this.view.plugin.settings[this.suggestType][this.category].filter((target)=>
            target.toLowerCase().includes(query.toLowerCase())
        );
    }
    renderSuggestion(value: string, el: HTMLElement) {
        el.createEl("div", { text: value});
    }

    async onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        updateFavAndRecent.call(this.view, item, this.category, this.suggestType);
        if (this.view.settings.saveRecentView || this.suggestType == 'favorite'){
            await this.view.plugin.saveSettings();
        }
		this.onSubmit(item);

    }
}



// favoriteやrecentのrenameに対応

export function handleRenameFavAndRecentFiles(renamedFile: TAbstractFile, oldPath: string, settings: MultipleNotesOutlineSettings):boolean{
    let renameType:'file'|'folder' = (renamedFile instanceof TFile)? 'file': 'folder';
    let renamed = false;
    for (let i=0; i< settings.recent[renameType].length; i++ ){
        if (settings.recent[renameType][i] == oldPath){
            settings.recent[renameType][i] = renamedFile.path;
            renamed = true;
        }
    }
    for (let i=0; i< settings.favorite[renameType].length; i++ ){
        if (settings.favorite[renameType][i] == oldPath){
            settings.favorite[renameType][i] = renamedFile.path;
            renamed = true;
        }
    }
    return renamed;
}

// favoriteやrecentのdeleteに対応

export function handleDeleteFavAndRecentFiles(deletedFile: TAbstractFile, settings: MultipleNotesOutlineSettings):boolean{
    let deleteType:'file'|'folder' = (deletedFile instanceof TFile)? 'file': 'folder';
    let deleted = false;
    for (let i=0; i< settings.recent[deleteType].length; i++ ){
        if (settings.recent[deleteType][i] == deletedFile.path){
            settings.recent[deleteType].splice(i,1);
            deleted = true;
        }
    }
    for (let i=0; i< settings.favorite[deleteType].length; i++ ){
        if (settings.favorite[deleteType][i] == deletedFile.path){
            settings.favorite[deleteType].splice(i,1);
            deleted = true;
        }
    }
    return deleted;
}


export function checkFavAndRecentFiles(app:App, settings: MultipleNotesOutlineSettings, checkType: 'file'|'folder'):void{
    for (let i=0; i< settings.favorite[checkType].length; i++){
        if(!app.vault.getAbstractFileByPath(settings.favorite[checkType][i])){
            settings.favorite[checkType].splice(i,1);
        } 
    }
    for (let i=0; i< settings.recent[checkType].length; i++){
        if(!app.vault.getAbstractFileByPath(settings.recent[checkType][i])){
            settings.recent[checkType].splice(i,1);
        } 
    }
}