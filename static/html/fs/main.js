
const path = Global.apiPath;
const {createApp} = Vue;
const vm = createApp({
    data() {
        return {
            tableWidth: '100%',
            uploadProgress: '',
            pagePath: [], // every ends with '/'
            files: [
                //    0          1             2             3           4           5             6
                // ['- / d', 'file name', 'file size', 'modify time', 'suffix', 'full path', 'preview html']
            ],
        }
    },
    created() {
        if (location.hash) {
            this.pagePath = location.hash.slice(1).match(/[^\/]+\/?|\//g);
        }
        this.getFiles();
        this.resizeTable();
    },
    methods: {
        getFiles() {
            let pp = location.hash = this.getPagePath();
            let that = this;
            doHttp({
                url: path + "/fs/getFolderChilds",
                body: pp && !pp.endsWith('/') ? (pp + '/') : pp,
                success: function (res) {
                    res = JSON.parse(res);
                    let files = [];
                    let tmp;
                    for (let i = 0; i < res.length; i+=4) {
                        tmp = [];
                        for (let j = 0; j < 4; j++) tmp.push(res[i+j]);
                        tmp.push(that.getFileSuffix(tmp));
                        tmp.push(that.getFileFullPath(tmp));
                        tmp.push(that.getFilePreview(tmp));
                        files.push(tmp);
                    }
                    // sort
                    files.sort((f1, f2) => {
                        if (f1[0][0] != f2[0][0]) return f2[0].charCodeAt(0) - f1[0].charCodeAt(0);
                        let f1Name = f1[1].toLowerCase(),
                            f2Name = f2[1].toLowerCase(),
                            min = Math.min(f1Name.length, f2Name.length);
                        for (let i = 0; i < min; i++)
                            if (f1Name[i] != f2Name[i])
                                return f1Name.charCodeAt(i) - f2Name.charCodeAt(i);
                        return f1Name.length - f2Name.length;
                    });
                    that.files = files;
                    // 回到页头
                    document.body.scrollTop = document.documentElement.scrollTop = 0;
                }
            });
        },
        folderEnter(folderName) {
            // 第一层路径
            this.pagePath.push(folderName.endsWith('/') ? folderName : (folderName + '/'));
            this.getFiles();
        },
        folderLeave() {
            this.pagePath.pop();
            this.getFiles();
        },
        gotoPagePath(idx) {
            idx = Math.max(0, idx);
            while (this.pagePath.length > (idx+1)) {
                this.pagePath.pop();
            }
            this.getFiles();
        },
        getPagePath() {
            return this.pagePath.join('').replace("//", "/");
        },
        openPath(row) {
            if (row[0] == 'd') {
                this.folderEnter(row[1]);
                return;
            }
            // row[5]:filePath   row[4]:fileSuffix
            let a;
            if (a = fsMimeType(row[4])) {
                window.open(`openfile.html?${a}#${row[5]}`);
                return;
            }
            alert("暂不支持当前格式.");
        },
        downloadFile(fileName) {
            location.href = `${path}/fs/download?path=${this.getPagePath()}/${fileName}`;
        },
        uploadFile() {
            if (vm.pagePath.length < 1) {
                vm.uploadProgress = '请先进入一个目录';
                return;
            }
            let that = this;
            fileChooser(null, function (file) {
                let formData = new FormData();
                formData.append("file", file);
                formData.append("dir", that.getPagePath());
                doHttp({
                    url: path + "/fs/uploadFile",
                    body: formData,
                    progress: e => {
                        vm.uploadProgress = (e.loaded / e.total * 100 | 0) + '%';
                    },
                    success: res => {
                        vm.uploadProgress = res;
                    }
                });
            });
        },
        uploadBigFile() {
            if (vm.pagePath.length < 1) {
                vm.uploadProgress = '请先进入一个目录';
                return;
            }
            let that = this;
            fileChooser(null, function (file) {
                let formData = new FormData(),
                    size = file.size,
                    partSize = 5*1024*1024,
                    partCount = (size/partSize).toFixed(0)*1+(size%partSize > 0 ? 1 : 0),
                    partIdx = 0
                ;
                formData.append("id", uuid());
                formData.append("dir", that.getPagePath());
                formData.append("filename", file.name);
                that.uploadPart(file, formData, partSize, partCount, partIdx);
            });
        },
        uploadPart(file, formData, partSize, partCount, partIdx) {
            let startIdx = partIdx * partSize,
                endIdx = (partIdx+1) * partSize,
                isLast = endIdx >= file.size;
            endIdx = Math.min(file.size, endIdx);
            console.log(startIdx, endIdx);
            formData.set("file", file.slice(startIdx, endIdx));
            formData.set("isLastPart", isLast);
            let that = this;
            doHttp({
                url: path + "/fs/uploadBigFile",
                body: formData,
                progress: e => {
                    vm.uploadProgress = `${partIdx + 1}/${partCount} : ${(e.loaded / e.total * 100 | 0)}%`;
                },
                success: res => {
                    if (isLast) {
                        vm.uploadProgress = res
                    } else {
                        that.uploadPart(file, formData, partSize, partCount, partIdx+1);
                    };
                }
            });
        },
        getFileFullPath(row) {
            return `${this.getPagePath()}/${row[1]}`;
        },
        getFilePreview(row) {
            switch(fsMimeType(row[4])) {
                case FS_TYPE.IMAGE:
                    return `<img class="preview" src="${path}/fs/mediaPlay?path=${encodeURIComponent(row[5])}">`;
                case FS_TYPE.VIDEO:
                    return `<video class="preview" src="${path}/fs/mediaPlay?path=${encodeURIComponent(row[5])}"></video>`;
                default: return "-";
            }
        },
        getFileSuffix(row) {
            // 从后往前数第几个
            let backNoTypeMap = {2: ['tar']};
            let split = row[1].split('.');
            if ('d' == row[0] || split.length < 2) {
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
        },
        resizeTable() {
            this.tableWidth = document.getElementById('app').clientWidth - 18 + 'px'
        }
    },
}).mount("#app");

window.onresize = function (e) {
    vm.resizeTable();
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
        case 'log': return FS_TYPE.TEXT;
        default: return '';
    }
}