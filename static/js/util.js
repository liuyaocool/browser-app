
// 指定长度
function uuid(len) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let radix = chars.length, uuid = '', i;
    len = len > 0 ? len : 32;
    for (i = 0; i < len; i++) uuid += chars.charAt(0 | Math.random() * radix);
    return uuid;
}
function uuid2() {
    return crypto.randomUUID().replaceAll('-', '');
}

/**
 * send http
 * @param option
 * @demo: fileUpload(url, formData, {
 *      method: 'post',
 *      headers: {
 *          "Content-Type", 'application/json'
 *      },
 *      async: true,
 *      progress: function(ev) { // 上传进度
 *      },
 *  }).then(function(res) {
 *  
 *  }).catch(function(res) {
 *  })
 */
function fileUpload(url, formData, option = {}) {
    return new Promise((resolve, reject) => {
        let http = new XMLHttpRequest();
        http.open(
            option.method || "post", 
            url,
            false === option.async ? false : true
        );
        if (option.headers && (typeof option.headers == "object")) {
            for (let headerName in option.headers) {
                http.setRequestHeader(headerName, option.headers[headerName]);
            }
        }
        if (isFunc(option.progress) && http.upload) {
            http.upload.addEventListener('progress' , option.progress, false);
        }
        http.send(formData);
        http.onreadystatechange = function (res) {
            if (4 != res.target.readyState) {
                return;
            }
            if (200 == res.target.status) {
                resolve(res.target.response);
            } else {
                reject(res.target.response);
            }
        }
    });
}

async function fetchTextFile(path) {
    let resp = await fetch(path);
    return await resp.text();
}

function fileChooser(accept = null, multiple = false) {
    return new Promise((resolve, reject) => {
        let fileInput = document.createElement('input');
        if (multiple === true) {
            fileInput.multiple = true;
        }
        fileInput.type = 'file';
        if (accept) {
            fileInput.accept = accept;
        }
        fileInput.onchange = function (ev) {
            resolve(multiple === true ? ev.target.files : ev.target.files[0]);
        }
        fileInput.click();
    })
}

function fileGetPath(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function (e) {
            resolve(e.target.result);
        }
    })
}

// a little slow than getFilePath when loading
function getObjectUrl(file) {
    return (
        window.createObjectURL 
        || (window.URL && window.URL.createObjectURL) 
        || (window.webkitURL && window.webkitURL.createObjectURL)
        )(file);
}

function isFunc(f) {
    return f && typeof f === 'function';
}

function isMobile() {
    return /Mobi/.test(navigator.userAgent);
}

function isMac() {
    return navigator.userAgent.indexOf("Mac") >= 0;
}

function isMobileOld() {
    let userAgent = navigator.userAgent;
    return userAgent.indexOf("Android") > -1 || userAgent.indexOf("iPhone") > -1;
}

/**
 * 获得真实样式
 */
function getRealStyle(dom, name) {
    return window.getComputedStyle(dom)[name];
}


function getStorageJson(key, def) {
    let store = localStorage.getItem(key);
    return store ? JSON.parse(store) : def;
}

function nowStr(hasTime) {
    let now = new Date();
    let a = now.getMonth() + 1;
    let m = a < 10 ? ('0' + a) : a;
    a = now.getDate();
    let d = a < 10 ? ('0' + a) : a;
    a = now.getHours();
    let h = a < 10 ? ('0' + a) : a;
    a = now.getMinutes();
    let mi = a < 10 ? ('0' + a) : a;
    a = now.getSeconds();
    let s = a < 10 ? ('0' + a) : a;
    return `${now.getFullYear()}-${m}-${d}${hasTime ? ` ${h}:${mi}:${s}` : ' 00:00:00'}`;
}

function copyToClipboard(text) {
    // 现代浏览器
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {
            copyToClipboardOld(text);
        });        
    } else {
        copyToClipboardOld(text);
    }
    // navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob(["mingzi哈哈哈哈"], { type: "text/plain" }) })]);
}

function copyToClipboardOld(str) {
    let dom = document.getElementById("lyCopyContainer");
    if (!dom) {
        let textDom = document.createElement('textarea');
        textDom.id = "lyCopyContainer";
        textDom.style.position = 'absolute';
        textDom.style.top = '-100%';
        document.body.append(textDom);
        dom = document.getElementById("lyCopyContainer");
    }
    dom.value = str;
    dom.setSelectionRange(0, str.length);
    dom.select();
    document.execCommand('copy');
}

function fileGetText() {
    return new Promise((resolve, reject) => {
        fileChooser().then(file => {
            getTextFromFile(file).then(text => resolve(text)).catch(err => reject(err));
        });
    })
}

function getTextFromFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve("");
            return;
        }
        let rd = new FileReader();
        rd.onload = e => {
            resolve(e.target.result);
        }
        rd.onerror = err => reject(err);
        rd.readAsText(file, "UTF-8");
    });
}

function urlBase64Encode(str) {
    return btoa(str)
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '@');
}

function urlBase64Decode(str) {
    return atob(str
        .replaceAll('-', '+')
        .replaceAll('_', '/')
        .replaceAll('@', '='));
}

function includeCss(pcLink, h5Link) {
    let dom = document.createElement('link');
    dom.rel = 'stylesheet';
    dom.href = isMobile() ? h5Link : pcLink;
    document.head.appendChild(dom);
};