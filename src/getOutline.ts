import { App, TAbstractFile, TFile, TFolder} from 'obsidian';
import MultipleNotesOutlinePlugin, { FileInfo, FileStatus, MultipleNotesOutlineSettings, OutlineData} from 'src/main';
import { getBacklinkFiles, getBacklinkFilesDataview } from 'src/getTargetFiles';

// ファイルステータスの初期化
export function initFileStatus(files: TAbstractFile[]): FileStatus[] {
    let status:FileStatus[] = [];
    console.log('initStatus',files);
    for (let i=0; i< files.length; i++) {
        const flagFolder = Boolean(files[i] instanceof TFolder);
        status.push({
            isFolded: false,
            isTop: false,
            duplicated: {
                main:false,
                outgoing:false,
                backlink:false,
                self:false
            },
            outlineReady: false,
            isFolder: flagFolder
        })
    }
    return status;
}


// 単一ファイルの情報取得
export async function getFileInfo(app: App, file: TFile, settings:MultipleNotesOutlineSettings, forceGetBacklinks?: boolean = false): Promise<FileInfo> {


    const content = await this.app.vault.cachedRead(file);

    const lines = content.split("\n");

    const backlinkFiles = (settings.showBacklinks || forceGetBacklinks) ? getBacklinkFilesDataview( app, file): undefined;

    const info:FileInfo = {
        lines: lines,
        numOfLines: lines.length,
        backlinks: backlinkFiles
    }


    return info;
}

// 単一ファイルのアウトライン取得
export async function getOutline (app: App, file: TFile, status:FileStatus, info: FileInfo, settings:MultipleNotesOutlineSettings): Promise<OutlineData[]>{

    let data: OutlineData[] = [];
    const cache = app.metadataCache.getFileCache(file);

    // cacheはnullの場合がある
    if (!cache){
        return null;
    }
    
    // headings,links,tags を抽出

    // console.log('check headings',cache.hasOwnProperty("headings") );
    if (cache.hasOwnProperty("headings")){
        for (let j=0; j< cache.headings.length ; j++){
            const element:OutlineData = {
                typeOfElement : "heading",
                position : cache.headings[j].position,
                displayText : cache.headings[j].heading,
                level: cache.headings[j].level
            };
            data.push(element);
        }
    }

    // console.log('check links',cache.hasOwnProperty("links") );
    if (cache.hasOwnProperty("links")){
        for (let j=0; j< cache.links.length ; j++){
            const element:OutlineData = {
                typeOfElement : "link",
                position : cache.links[j].position,
                //マークダウンリンク に対応
                displayText : 
                    (cache.links[j].displayText =="") 
                    ? cache.links[j].original.substring(1,cache.links[j].original.indexOf("]")) 
                    : cache.links[j].displayText,
                link: cache.links[j].link
            };
            data.push(element);
        }				
    }
    
    // console.log('check lists');
    if (cache.hasOwnProperty("listItems")){

        for (let j=0; j< cache.listItems.length ; j++){
            //以下でリストアイテムの階層の判定を行う。
            //リストの先頭の項目:0、先頭ではないがルートレベル:1、第2階層以下：2としている。
            //parentが正の数なら第2階層以下
            //負の数で、絶対値がposition.start.lineと一致していればトップアイテム(0)、非一致ならルート（1）
            //ただし視覚的に離れたトップレベルのアイテムでも、間にheadingがないとルートアイテムとして判定されてしまうので、
            //前のリストアイテムとの行の差が1の時のみルートアイテムとして判定するよう修正する。
            let listLevel: number = 0; // 0:top item of a list 1:root leve 2:other
            if (cache.listItems[j].parent >0){
                listLevel = 2;
            } else if (j>0){
                if (!(Math.abs(cache.listItems[j].parent) == cache.listItems[j].position.start.line) &&
                    (cache.listItems[j].position.start.line - cache.listItems[j-1].position.start.line == 1)){
                            listLevel = 1;
                }
            }
            const element:OutlineData = {
                typeOfElement : "listItems",
                position : cache.listItems[j].position,
                displayText : info?.lines[cache.listItems[j].position.start.line].replace(/^(\s|\t)*-\s(\[.+\]\s)*/,''),
                level : listLevel,
                task : cache.listItems[j].task
            };
            data.push(element);
        }
    }
    
    // console.log('check tags',cache.hasOwnProperty("tags") );
    if (cache.hasOwnProperty("tags")){
        for (let j=0; j< cache.tags.length ; j++){
            const element:OutlineData = {
                typeOfElement : "tag",
                position : cache.tags[j].position,
                displayText : cache.tags[j].tag.substring(1),
            };
            data.push(element);

            //AOTタグの判定
            for (const value of settings.tagsAOT){
                if( (value) && cache.tags[j].tag == value){
                    status.isTop = true;
                }
            }
        }
    }
    // 要素の登場順にソート
    data.sort((a,b)=> {
        return (a.position.start.offset - b.position.start.offset);
    });
    return data;
}
