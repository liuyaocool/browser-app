
// 指定长度
function uuid(len) {
    let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    let radix = chars.length, uuid = '', i;
    len = len > 0 ? len : 36;
    for (i = 0; i < len; i++) uuid += chars[0 | Math.random() * radix];
    return uuid;
}

/**
 * send http
 * @param option
 *  {
 *      method: 'post',
 *      url: '',
 *      headers: {
 *          'Content-Type', 'application/json'
 *      },
 *      body: '',
 *      async: true,
 *      progress: function(ev) { // 上传进度
 *      },
 *      success: function(res) {
 *      },
 *      error: function(res) {
 *      },
 *  }
 */
function doHttp(option) {
    option = option ? option : {};
    let http = new XMLHttpRequest();
    http.open(option.method ? option.method : "post", option.url,
        false === option.async ? false : true);
    if (option.headers && (typeof option.headers == "object")) {
        for (let headerName in option.headers) {
            http.setRequestHeader(headerName, option.headers[headerName]);
        }
    }
    if (http.upload) {
        http.upload.addEventListener('progress' , function (ev) {
            if (option.progress) {
                option.progress(ev);
            }
        }, false);
    }
    http.send(option.body ? option.body : null);
    http.onreadystatechange = function (res) {
        if (4 != res.target.readyState) {
            return;
        }
        if (200 == res.target.status && isFunc(option.success)) {
            option.success(res.target.response);
        } else if (isFunc(option.error)) {
            option.error(res.target.response);
        }
    }
}

function fileChooser(accept, getFileFunc) {
    if (!isFunc(getFileFunc)) return;
    let fileInput = document.createElement('input');
    fileInput.type = 'file';
    if (accept) {
        fileInput.accept = accept;
    }
    fileInput.onchange = function (ev) {
        let file = ev.target.files[0];
        if (isFunc(getFileFunc)) getFileFunc(file);
    }
    fileInput.click();
}

function getFilePath(file, getPathFunc) {
    if (!isFunc(getPathFunc)) return;
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (e) {
        getPathFunc(this.result);
    }
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
    let userAgent = navigator.userAgent;
    return userAgent.indexOf("Android") > -1 || userAgent.indexOf("iPhone") > -1;
}

function isMac() {
    return navigator.userAgent.indexOf("Mac") >= 0;
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

function copyToClipboard(str) {
    let dom = document.getElementById("copyContainer");
    if (!dom) {
        let textDom = document.createElement('textarea');
        textDom.id = "copyContainer";
        textDom.style.position = 'absolute';
        textDom.style.top = '-100%';
        document.body.append(textDom);
        dom = document.getElementById("copyContainer");
    }
    dom.value = str;
    dom.setSelectionRange(0, str.length);
    dom.select();
    document.execCommand('copy');
}

function fileGetText(getFunc) {
    fileChooser(null, function (file) {
        let rd = new FileReader();
        rd.readAsText(file, "UTF-8");
        rd.onload = function (e) {
            getFunc(e.target.result);
        }
    });
}