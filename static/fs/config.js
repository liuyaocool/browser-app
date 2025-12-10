const apiPath = "/bs";
const GLOBAL = {
};

function isMobile() {
    return /Mobi/.test(navigator.userAgent);
}

function includeCss(pcLink, h5Link) {
    let dom = document.createElement('link');
    dom.rel = 'stylesheet';
    dom.href = isMobile() ? h5Link : pcLink;
    document.head.appendChild(dom);
};

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
function uuid(len) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let radix = chars.length, uuid = '', i;
    len = len > 0 ? len : 32;
    for (i = 0; i < len; i++) uuid += chars.charAt(0 | Math.random() * radix);
    return uuid;
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
function isFunc(f) {
    return f && typeof f === 'function';
}