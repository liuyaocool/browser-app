
const FS_TYPE = {
    FOLDER: 'folder',
    IMAGE: 'image',
    VIDEO: 'video',
    TEXT: 'text',
    PDF: 'pdf',
    ZIP: 'zip',
    DOC: 'doc',
    EXCEL: 'doc',
    PPT: 'doc',
}

function fsMimeType(suffix) {
    switch (suffix || '') {
        case 'webp':
        case 'png':
        case 'jpeg':
        case 'jpg':
        case 'svg':
        case 'gif': return FS_TYPE.IMAGE;
        case 'mp4': return FS_TYPE.VIDEO;
        case 'txt':
        case 'md':
        case 'properties':
        case 'conf':
        case 'xml':
        case 'desktop':
        case 'log': return FS_TYPE.TEXT;
        default: return '';
    }
}

function getFileSuffix(nameOrPath) {
    // 从后往前数第几个
    let backNoTypeMap = {2: ['tar']};
    let split = nameOrPath.split('.');
    if (split.length < 2) {
        return '-';
    }
    for (const len in backNoTypeMap) {
        for (let i = 0; i < backNoTypeMap[len].length; i++) {
            if (split[split.length - len] == backNoTypeMap[len][i]) {
                return split.slice(split.length-len).join('.');
            }
        }
    }
    return split[split.length-1];
}