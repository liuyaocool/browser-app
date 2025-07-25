
const apiPath = Global.apiPath;
const {createApp} = Vue;
const vm = createApp({
    data() {
        return {
            uploadProgress: '',
            pagePath: [], // every ends with '/'
            files: [
                /**
                {
                    "name": "",
                    "size": "",
                    "time": "",
                    "suffix": "", // zip, tar.gz, tar.zst
                    "type": "", // FS_TYPE
                    "path": "",
                }
                */
            ],
        }
    },
    created() {
        if (location.hash) {
            this.pagePath = decodeURIComponent(location.hash).slice(1).match(/[^\/]+\/?|\//g);
        }
        this.getFiles();
    },
    methods: {
        async getFiles() {
            let pp = location.hash = this.getPagePath(), files = [], tmp;
            let res = await (await fetch(apiPath + "/fs/getFolderChilds", {
                method: 'POST',
                body: pp && !pp.endsWith('/') ? (pp + '/') : pp
            })).json();
            for (let i = 0; i < res.length; i+=4) {
                files.push(tmp = {});
                tmp.name = res[i+1];
                tmp.size = res[i+2];
                tmp.time = res[i+3];
                tmp.suffix = res[i] == 'd' ? '-' : getFileSuffix(tmp.name);
                tmp.type = res[i] == 'd' ? FS_TYPE.FOLDER : fsMimeType(tmp.suffix);
                tmp.path = this.getFileFullPath(tmp.name);
                tmp.preview = this.getFilePreview(tmp.suffix, tmp.path);
            }
            // sort
            files.sort((f1, f2) => {
                if (f1.type != f2.type) {
                    if (f1.type == FS_TYPE.FOLDER) return -1;
                    if (f2.type == FS_TYPE.FOLDER) return 1;
                }
                let f1Name = f1.name.toLowerCase(),
                    f2Name = f2.name.toLowerCase(),
                    min = Math.min(f1Name.length, f2Name.length);
                for (let i = 0; i < min; i++)
                    if (f1Name[i] != f2Name[i])
                        return f1Name.charCodeAt(i) - f2Name.charCodeAt(i);
                return f1Name.length - f2Name.length;
            });
            this.files = files;
            // 回到页头
            document.body.scrollTop = document.documentElement.scrollTop = 0;
        },
        toTop() {
            // document.getElementById('tbody-div').scrollTop = 0;
        },
        folderEnter(folderName) {
            // 第一层路径
            this.pagePath.push(folderName.endsWith('/') ? folderName : (folderName + '/'));
            this.getFiles();
            this.toTop();
        },
        folderLeave() {
            this.pagePath.pop();
            this.getFiles();
            this.toTop();
        },
        gotoPagePath(idx) {
            idx = Math.max(0, idx);
            while (this.pagePath.length > (idx+1)) {
                this.pagePath.pop();
            }
            this.getFiles();
            this.toTop();
        },
        getPagePath() {
            return this.pagePath.join('').replace("//", "/");
        },
        clickName(row) {
            if (row.type == FS_TYPE.FOLDER) {
                this.folderEnter(row.name);
                return;
            }
            // row[5]:filePath   row[4]:fileSuffix
            let a;
            if (a = row.type) {
                window.open(`openfile.html?${a}#${row.path}`);
                return;
            }
            alert("暂不支持当前格式.");
        },
        downloadFile(fileName) {
            location.href = `${apiPath}/fs/download?path=` + encodeURIComponent(this.getPagePath() + fileName);
        },
        uploadFile() {
            if (this.pagePath.length < 1) {
                this.uploadProgress = '请先进入一个目录';
                return;
            }
            let that = this;
            fileChooser().then(file => {
                let formData = new FormData();
                formData.append("file", file);
                formData.append("dir", that.getPagePath());
                fileUpload(apiPath + "/fs/uploadFile", formData, {
                    progress: e => {
                        that.uploadProgress = (e.loaded / e.total * 100 | 0) + '%';
                    }
                }).then(res => {
                    that.uploadProgress = res;
                });
            });
        },
        uploadBigFile() {
            if (this.pagePath.length < 1) {
                this.uploadProgress = '请先进入一个目录';
                return;
            }
            let that = this;
            fileChooser().then(file => {
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
            fileUpload(apiPath + "/fs/uploadBigFile", formData, {
                progress: e => {
                    that.uploadProgress = `${partIdx + 1}/${partCount} : ${(e.loaded / e.total * 100 | 0)}%`;
                }
            }).then(res => {
                if (isLast) {
                    that.uploadProgress = res
                } else {
                    that.uploadPart(file, formData, partSize, partCount, partIdx+1);
                };
            });
        },
        getFileFullPath(filename) {
            return `${this.getPagePath()}/${filename}`;
        },
        getFilePreview(suffix, filepath) {
            switch(fsMimeType(suffix)) {
                case FS_TYPE.IMAGE:
                    return `<img class="preview" 
                    src="${apiPath}/fs/mediaPlay?path=${encodeURIComponent(filepath)}">`;
                case FS_TYPE.VIDEO:
                    return `<video class="preview" 
                    src="${apiPath}/fs/mediaPlay?path=${encodeURIComponent(filepath)}"></video>`;
                default: return "-";
            }
        },
    },
}).mount("#app");