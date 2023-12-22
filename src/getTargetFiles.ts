import { App, TFile, TFolder } from 'obsidian';
import { FileInfo, OutlineData } from 'src/main';

export function getOutgoingLinkFiles(app: App, file:TFile, info:FileInfo, cache:OutlineData[]):TFile[] | null {

    let files:TFile[] =[];
    for (let i=0; i< info?.frontmatterLinks?.length; i++){
        const fileobj = app.metadataCache.getFirstLinkpathDest(info.frontmatterLinks[i].link, file.path);
        if (fileobj instanceof TFile){
            files.push(fileobj);
        }
    }

    for (let i = 0; i< cache?.length; i++ ){
        if (cache[i].typeOfElement != 'link'){
            continue;
        }
        const fileobj = app.metadataCache.getFirstLinkpathDest(cache[i].link, file.path);
        if (fileobj instanceof TFile){
            files.push(fileobj);
        }
    }
    return files;
}

export function getBacklinkFiles(app: App, file:TFile):TFile[]{
    let files:TFile[]=[];
    let backlinks = app.metadataCache.getBacklinksForFile(file).data;
    for ( const key in backlinks){
        const fileobj = app.vault.getAbstractFileByPath(key);
        if (fileobj instanceof TFile){
            files.push(fileobj);
        }
    }
    return files;
}

export function getBacklinkFilesDataview(app:App, file:TFile, isDataviewEnabled:boolean):TFile[]{
    let files:TFile[]=[];

    if (!isDataviewEnabled){
        return getBacklinkFiles(app, file);
    }

    let backlinks = app.plugins.plugins.dataview?.api?.pages(`"${file.path}"`)?.values[0]?.file.inlinks.values;
    if (!backlinks) {
        return getBacklinkFiles(app,file);
    }
    for ( let i = 0; i < backlinks.length; i++){
        const fileobj = app.vault.getAbstractFileByPath(backlinks[i].path);
        if (fileobj instanceof TFile){
            files.push(fileobj);
        }
    }
    return files;
}