import { App, TFile, TAbstractFile} from 'obsidian';
import { FILE_TITLE_BACKGROUND_COLOR, FILE_TITLE_BACKGROUND_COLOR_HOVER, FileInfo, FileStatus, MultipleNotesOutlineSettings, OutlineData} from 'src/main';

// data.jsonのrelatedFilesを掃除：値が空配列のプロパティを削除
export function cleanRelatedFiles(srcFile:TAbstractFile, dstFile:TAbstractFile, settings:MultipleNotesOutlineSettings): void {
    if (Object.keys(settings.relatedFiles[srcFile.path][dstFile.path]).length == 0){
        delete settings.relatedFiles[srcFile.path][dstFile.path];
    }
    if (Object.keys(settings.relatedFiles[srcFile.path]).length === 0){
        delete settings.relatedFiles[srcFile.path];
    }
}

// data.jsonのrelatedFilesについて、srcFileとdstFileの組み合わせで、flagで指定したフラグが存在するかチェック
export function checkFlag(srcFile:TAbstractFile, dstFile:TAbstractFile, flag: 'fold'|'top', settings: MultipleNotesOutlineSettings): boolean {
    return settings.relatedFiles[srcFile.path]?.[dstFile.path]?.[flag];
}

// relatedFilesに指定したフラグを追加
export function addFlag(srcFile:TAbstractFile, dstFile:TAbstractFile, flag: 'fold'|'top', settings: MultipleNotesOutlineSettings): void {
    if(!settings.relatedFiles.hasOwnProperty(srcFile.path)){
        settings.relatedFiles[srcFile.path] = {};
    }
    if(!settings.relatedFiles[srcFile.path].hasOwnProperty(dstFile.path)){
        settings.relatedFiles[srcFile.path][dstFile.path]={};
    }
    settings.relatedFiles[srcFile.path][dstFile.path][flag] = true;
}

//relatedFilesから指定したフラグを除去
export function removeFlag(srcFile:TAbstractFile, dstFile:TAbstractFile, flag: 'fold'|'top', settings: MultipleNotesOutlineSettings): void {
    delete settings.relatedFiles[srcFile.path][dstFile.path][flag];
    cleanRelatedFiles(srcFile,dstFile,settings);
}

//relatedFilesの指定したフラグをトグル
export function toggleFlag(srcFile:TAbstractFile, dstFile:TAbstractFile, flag: 'fold'|'top', settings: MultipleNotesOutlineSettings): void {
    if (checkFlag(srcFile, dstFile, flag, settings) == true){
        removeFlag(srcFile, dstFile, flag, settings);
    } else {
        addFlag(srcFile, dstFile, flag, settings);
    }
}


// ファイルタイトルの背景色を指定（css変数を設定値に基づいて変更）  ※ファイルエクスプローラのフォルダの背景色に相当
export function changeNoteTitleBackgroundColor(settings: MultipleNotesOutlineSettings){
    const theme = document.getElementsByTagName('body')[0].classList.contains('theme-light') ? 'light' : 'dark';
    switch(settings.noteTitleBackgroundColor){
        case 'none':
            break;
        case 'custom':
            document.getElementsByTagName('body')[0].style.setProperty("--MNO-filetitle-background", settings.customNoteTitleBackgroundColor[theme]);
			document.getElementsByTagName('body')[0].style.setProperty("--MNO-filetitle-background-hover", settings.customNoteTitleBackgroundColorHover[theme]);
            break;
        default:
            document.getElementsByTagName('body')[0].style.setProperty("--MNO-filetitle-background", FILE_TITLE_BACKGROUND_COLOR[settings.noteTitleBackgroundColor][theme]);
			document.getElementsByTagName('body')[0].style.setProperty("--MNO-filetitle-background-hover", FILE_TITLE_BACKGROUND_COLOR_HOVER[settings.noteTitleBackgroundColor][theme]);
            break;
        }
}


// ファイル順ソート
export function sortFileOrder( order: number[], files: TAbstractFile[], status: FileStatus[], info: FileInfo[], settings: MultipleNotesOutlineSettings):void {
    switch (settings.sortType){
        case 'alphabetAscending':
            order.sort( (val1,val2)=> {
                if (status[val1].isFolder != status[val2].isFolder){
                    return (status[val1].isFolder) == true ? 1 : -1;
                }
                return files[val1].name.localeCompare(files[val2].name);                
            });
            break;
        case 'alphabetDescending':
            order.sort( (val1,val2)=> {
                if (status[val1].isFolder != status[val2].isFolder){
                    return (status[val1].isFolder) == true ? 1 : -1;
                }
                return files[val2].name.localeCompare(files[val1].name);                
            });
            break;
        case 'ctimeDescending':
            order.sort( (val1,val2)=> {
                if (status[val1].isFolder != status[val2].isFolder){
                    return (status[val1].isFolder) == true ? 1 : -1;
                }
                return (files[val2] as TFile).stat.ctime - (files[val1] as TFile).stat.ctime;                
            });
            break;

        case 'ctimeAscending':
            order.sort( (val1,val2)=> {
                if (status[val1].isFolder != status[val2].isFolder){
                    return (status[val1].isFolder) == true ? 1 : -1;
                }
                return (files[val1] as TFile).stat.ctime - (files[val2] as TFile).stat.ctime;                
            });
            break;

        case 'mtimeDescending':
            order.sort( (val1,val2)=> {
                if (status[val1].isFolder != status[val2].isFolder){
                    return (status[val1].isFolder) == true ? 1 : -1;
                }
                return (files[val2] as TFile).stat.mtime - (files[val1] as TFile).stat.mtime;                
            });
            break;

        case 'mtimeAscending':
            order.sort( (val1,val2)=> {
                if (status[val1].isFolder != status[val2].isFolder){
                    return (status[val1].isFolder) == true ? 1 : -1;
                }
                return (files[val1] as TFile).stat.mtime - (files[val2] as TFile).stat.mtime;                
            });
            break;

        default:
            break;
    }
}
