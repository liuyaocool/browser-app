
// 将字符串转ArrayBuffer
function strToArrayBuf(s) {
    var buf = new ArrayBuffer(s.length);
    var view = new Uint8Array(buf);
    for (var i = 0; i != s.length; ++i) {
        view[i] = s.charCodeAt(i) & 0xff
    }
    return buf
}

// 下载 文件
function download(blob, filename)  {
    let adom = document.createElement('a');
    adom.href = URL.createObjectURL(blob); // 创建blob地址
    adom.download = filename;
    adom.click();
}

/**
 * https://zhuanlan.zhihu.com/p/95984128
 * https://github.com/SheetJS/sheetjs
 * @param tableDom
 * @param filename
 */
function downloadXlsxFromTable(tableDom, filename) {
    downXlsx(XLSX.utils.table_to_sheet(tableDom), filename);
}

function downloadXlsxFromArray(arr, filename) {
    downXlsx(XLSX.utils.aoa_to_sheet(arr), filename);
}

function downXlsx(sheet, filename) {
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,  sheet,  "main");
    // 生成excel的配置项
    var wopts = {
        // 要生成的文件类型
        bookType: 'xlsx',
        // 是否生成Shared String Table，官方解释是，如果开启生成速度会下降，但在低版本IOS设备上有更好的兼容性
        bookSST: false,
        // 二进制类型
        type: 'binary'
    };
    var wbout = XLSX.write(wb, wopts);
    var blob = new Blob([strToArrayBuf(wbout)], {
        type: 'application/octet-stream'
    });
    download(blob, filename);
}

function strMatch(str, p1) {
    let m = str.match(p1);
    return m ? m.length : 0;
}

function downText(text, filename) {
    let blob = new Blob([text], {
        type: 'text/plain;charset=utf-8'
    });
    download(blob, filename);
}