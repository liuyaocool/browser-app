
// [str, 光标偏移]
const SQL_QUICK = {
    '> today': () => [[nowStr(false)], NaN]
}, SQL_DIC = {
    selected: () => getSql().select
};
doHttp({
    url: "./sql-quick.json",
    method: "get",
    success: (res) => {
        let a = JSON.parse(res);
        for (const k in a) SQL_QUICK[k] = () => a[k];
    }
});
doHttp({
    url: "./sql-demo.json",
    method: "get",
    success: (res) => {
        let a = JSON.parse(res);
        for (const k in a) SQL_DIC[k] = () => {
            let b = {db: vm.formdata.db, table: vm.funcAttr.tableName};
            let sql = a[k][vm.formdata.driver];
            return (typeof sql == 'string' ? sql : sql.join(' '))
                // 占位符替换
                .replace(/\${(.*?)}/g, (match, key) => b[key.trim()] || match);
        }
    }
});

// const {createApp} = Vue;
// createApp({});
const vm = Vue.createApp({
    watch: {
        "formdata.db": {
            handler (newv) {
                document.title = `${this.formdata.host.split('.')[3]}:${newv}`;
                this.funcAttr.title = document.title;
            }
        },
        "formdata.host": {
            handler (newv) {
                let sp = newv.split('.');
                if(sp.length == 4) {
                    document.title = `${sp[3]}:${this.formdata.db}`;
                    this.funcAttr.title = document.title;
                }
            },
        },
        "funcAttr.connOpen": {
            handler (newv) {
                setTimeout(() => {
                    this.tb.style.height = getTableHeight();
                }, 1000);
            }
        }
    },
    created() {
        // 支持hash
        if(location.hash) {
            let a = location.hash.substring(1),
                b = localStorage.conn_his ? JSON.parse(localStorage.conn_his) : null;
            if (b) for (let k in b) if (k.indexOf(a) == 0) {
                this.formdata = b[k];
                this.hideConn();
                break;
            }
        }
        this.funcAttr.isPc = !isMobile();
        if (isMac()) {
            // mac 上 option+f 设置为快捷键无法触发
            this.funcAttr.funcKey = 'Control';
            this.funcAttr.funcKeyCode = 'ctrlKey';
        }
    },
    setup() {},
    data() {
        return {
            formdata: {
                driver: 'POSTGRESQL',
                host: '',
                port: '',
                db: '',
                dbuser: '',
                dbpwd: '',
                sql: '',
                ssh: false,
                sshKey: '',
                sshKeyPwd: '',
                sshHost: '',
                sshPort: '',
                sshUser: '',
                sshUserPwd: '',
            },
            panel: {
                menuDataIdx: -1,
                style: {},
                show: '',
                data: [],
                selIdx: 0,
                clickFunc: null
            },
            funcAttr: {
                title: '',
                connOpen: true,
                tableName: '',
                showSql: '',
                filterColNo: 1,
                funcKeyPress: false,
                funcKey: 'Alt',
                funcKeyCode: 'altKey',
                isPc: true,
                curPos: [0,0], // [光标所在下标, 总字数]
            },
            tb: {
                pageNo: 1,
                pageSize: 100,
                maxPage: 1,
                dataAll: [], // 所有数据
                data: [], // 过滤后的数据
                head: [],
                body: [], // 每页数据
                colStyle: [],
                style: {
                    height: '100px',
                }
            }
        }
    },
    methods: {
        clearForm() {
            let spk = ['port', 'sshPort', 'ssh'];
            for(let k in this.formdata) {
                this.formdata[k] = '';
            }
            this.formdata.ssh = false;
        },
        tableInit(columns, data) {
            data = (data && data.length > 0) ? data : [ ['empty'] ];
            if (columns.length > 1) {
                let w;
                for (let i = 0; i < columns.length; i++) {
                    w = Math.max(calcStrWidth(columns[i] + ":888"),
                        (data[0] && data[0][i]) ? calcStrWidth(data[0][i]) : 0);
                    w = Math.min(800, w) + 10;
                    this.tb.colStyle[i] = {width: w + 'px'};
                }
            } else {
                this.tb.colStyle[0] = {};
            }
            this.tb.head = columns;
            this.tb.dataAll = data;
            this.tb.data = data;
            this.changePageSize(100);
        },
        tableDataFill() {
            let start = this.tb.pageSize * (this.tb.pageNo-1);
            this.tb.body = this.tb.data.slice(start, start + this.tb.pageSize);
        },
        tableFilter(filterWord) {
            if (filterWord) {
                this.tb.data = [];
                let j, d, fidx = this.funcAttr.filterColNo - 1, dall = this.tb.dataAll;
                for (let i = 0; i < dall.length; i++) {
                    if (dall[i][fidx] && dall[i][fidx].indexOf(filterWord) >= 0) {
                        for (j = 0, d = []; j < dall[i].length; j++) {
                            d[j] = dall[i][j];
                        }
                        d[fidx] = highLightWord(d[fidx], filterWord);
                        this.tb.data.push(d);
                    }
                }
                this.changePageSize(1000);
            } else {
                this.tb.data = this.tb.dataAll;
                this.changePageSize(100);
            }
        },
        changePageSize(sz) {
            this.tb.pageNo = 1;
            let len = this.tb.data.length;
            let psz = sz > 0 ? sz : 100;
            let pages = Math.floor(len / psz);
            pages += (len % psz) > 0 ? 1 : 0;
            this.tb.pageSize = psz;
            this.tb.maxPage = pages;
            this.tableDataFill();
        },
        changePageNo(no) {
            if (no > 0) {
                no = Math.max(no, 1);
                this.tb.pageNo = Math.min(no, this.tb.maxPage);
            }
            this.tableDataFill();
        },
        panelNext(ev) {
            if (this.panel.clickFunc) {
                this.panel.selIdx = Math.max(0, Math.min(this.panel.selIdx+1, this.panel.data.length-1));
            }
            if (this.panel.show && ev) ev.preventDefault();
        },
        panelPrev(ev) {
            if (this.panel.clickFunc) {
                this.panel.selIdx = Math.max(0, this.panel.selIdx-1);
            }
            if (this.panel.show && ev) ev.preventDefault();
        },
        panelRoll() {
            this.panel.selIdx++;
            this.panel.selIdx %= this.panel.data.length;
        },
        panelReset() {
            this.panel.data = [];
            this.panel.show = '';
            this.panel.selIdx = 0;
            this.panel.clickFunc = null;
            this.panel.style = {};
        },
        panelChooseFirst(ev) {
            if (this.panel.clickFunc) {
                vm.panel.selIdx = 0;
                this.panelClick(ev);
            }
        },
        panelClick(ev) {
            if (this.panel.clickFunc) {
                this.panel.clickFunc(this.panel.data[this.panel.selIdx]);
                if (ev) ev.preventDefault();
            }
        },
        panelDataClick(idx) {
            this.panel.selIdx = idx;
            this.panelClick();
        },
        showMenu(e, idx) {
            this.panel.menuDataIdx = idx;
            this.panel.style.left = e.clientX + 'px';
            this.panel.style.top = e.clientY + 'px';
            e.preventDefault();
            return false;
        },
        hideMenu() {
            this.panel.menuDataIdx = -1;
        },
        copyToClipboard(str) {
            copyToClipboard(str);
            this.hideMenu();
        },
        getTbName() {
            return this.formdata.sql.toLowerCase().split('from')[1].trim().split(' ')[0].split('\n')[0];
        },
        copyToInsert() {
            let sq = `insert into ${this.getTbName()} (\n\t${this.tb.head[0]}`,
                valStrs = '',
                d = this.tb.body[this.panel.menuDataIdx];
            for (let i = 1; i < this.tb.head.length; i++) {
                sq += (i%3 == 0 ? ",\n\t" : ", ") + this.tb.head[i];
                valStrs += (i%3 == 0 ? "',\n\t'" : "', '") + (d[i] ? d[i] : '');
            }
            this.copyToClipboard(sq + `\n) values (\n\t'${d[0]}${valStrs}'\n)`);
        },
        copyToInsertPage() {
            let sq = `insert into ${this.getTbName()}\n\t(${this.tb.head[0]}`, d;
            for (let i = 1; i < this.tb.head.length; i++) {
                sq += ", " + this.tb.head[i];
            }
            sq += ")\n\tvalues\n\t";
            for (let i = 0; i < this.tb.body.length; i++) {
                sq += i == 0 ? "(" : "),\n\t(";
                for (let j = 0; j < this.tb.head.length; j++) {
                    sq += (j == 0 ? "" : ",") + ((d = this.tb.body[i][j]) ? `'${d}'` : "null");
                        console.log(d);
                }
            }
            this.copyToClipboard(sq + ")");
        },
        copyToUpdate() {
            let d = this.tb.body[this.panel.menuDataIdx],
                sq = `update ${this.getTbName()} set \n\t${this.tb.head[1]} = '${d[1]}'`;
            for (let i = 2; i < this.tb.head.length; i++) {
                sq += `,\n\t${this.tb.head[i]} = '${d[i]}'`;
            }
            this.copyToClipboard(sq += `\nwhere ${this.tb.head[0]} = '${d[0]}'`);
        },
        tableStruct() {
            alert("开发中");
            this.hideMenu();
        },
        tableIndex() {
            alert("开发中");
            this.hideMenu();
        },
        hideConn() {
            this.funcAttr.connOpen = false;
        },
        toggleConn() {
            this.funcAttr.connOpen = !this.funcAttr.connOpen;
        }
    },
}).mount("#app");

sqlInit();

function sshFileChoose() {
    fileGetText(content => vm.formdata.sshKey = content);
}

document.onmousedown = function (ev) {
    let target = ev.target;
    while (target) {
        if (target.classList.contains('box')) return;
        target = target.parentElement;
    }
    escPress();
}

document.addEventListener('keydown', function(ev) {
    vm.funcAttr.funcKeyPress = ev.key == vm.funcAttr.funcKey;
    if (ev[vm.funcAttr.funcKeyCode]) {
        switch (ev.code) {
            case 'KeyQ': showHistory(); break;
            case 'KeyR': execute('selected'); break;
            case 'KeyF': focusAndSelectAll('filterWordNum'); break;
            case 'KeyT': focusAndSelectAll('tableName'); break;
            case 'ArrowUp': dataTableScroll('y', 1); break;
            case 'ArrowDown': dataTableScroll('y', -1); break;
            case 'ArrowLeft': dataTableScroll('x', 1); break;
            case 'ArrowRight': dataTableScroll('x', -1); break;
            default: return true;
        }
        ev.preventDefault();
    } else {
        switch (ev.code) {
            case 'Escape': escPress(); break;
            case 'Enter': vm.panelClick(ev); break;
            case 'ArrowUp': vm.panelPrev(ev); break;
            case 'ArrowDown': vm.panelNext(ev); break;
        }
    }
})

document.onkeyup = function (ev) {
    vm.funcAttr.funcKeyPress = false;
}

document.getElementById('filterWord').onkeydown = function (ev) {
    switch (ev.code) {
        case 'ArrowUp': vm.funcAttr.filterColNo++; ev.preventDefault(); break;
        case 'ArrowDown': vm.funcAttr.filterColNo -= vm.funcAttr.filterColNo < 2 ? 0 : 1; ev.preventDefault(); break;
        case 'Enter': vm.tableFilter(ev.target.value);
    }
}

window.onresize = function (ev) {
    resizeTable();
}

document.onclick = function (e) {
    vm.hideMenu();
}
document.onmouseup = function() {
    resizeTable();
}
document.onmousemove = function (ev) {
    document.body.style.cursor = '';
}

function dataTableScroll(type, direct) {
    var a;
    switch (type) {
        case 'x':
            a = document.getElementById('data-div');
            a.scrollLeft += direct * a.clientWidth / 2;
            break;
        case 'y':
            a = document.querySelector('#data-div > .tbody-div');
            a.scrollTop += direct * a.clientHeight / 2;
            break;
    }
}

function escPress() {
    vm.panelReset();
    sqlFocus();
}

function execute(mode) {
    let sql = SQL_DIC[mode]();
    if (!sql) {
        showTbMsg('请先选中sql.');
        return;
    }
    vm.formdata.sql = sql;
    if (!vm.formdata.driver || !vm.formdata.host || !vm.formdata.port
        || !vm.formdata.db || !vm.formdata.dbuser || !vm.formdata.dbpwd) {
        showTbMsg('连接信息不完整.');
        return;
    }
    if (vm.formdata.ssh && (!vm.formdata.sshKey || !vm.formdata.sshHost
        || !vm.formdata.sshPort || !vm.formdata.sshUser)) {
        showTbMsg('密钥信息不完整.');
        return;
    }
    showTbMsg('执行中... ' + sql);
    doHttp({
        url: path + '/database/execute',
        body: JSON.stringify(vm.formdata),
        headers: {"Content-Type": 'application/json;charset=utf-8'},
        success: res => {
            res = JSON.parse(res);
            vm.tableInit(res.row, res.rows);
            showTbMsg(vm.formdata.sql);
            resizeTable();
            if (200 == res.code) {
                saveHistory();
                saveHotKey(vm.formdata.sql);
                location.hash = `${vm.formdata.host}:${vm.formdata.port}:${vm.formdata.db}`;
                vm.hideConn();
            }
            escPress();
        },
        error: res => {
            let resj = JSON.parse(res);
            showTbMsg(`${resj.status}: ${resj.error}`);
        }
    });
}

function stopExecute() {
    doHttp({
        url: path + '/database/stop',
        success: res => {
            console.log(res);
        }
    });
}

function resizeTable() {
    vm.tb.style.height = getTableHeight();
}

function getTableHeight() {
    return document.body.offsetHeight - document.getElementById("data-container").offsetTop - 45 + 'px';
}

function saveHistory() {
    let store = localStorage.getItem('conn_his'),
        k = [
            vm.formdata.host,
            vm.formdata.port,
            vm.formdata.db,
            vm.formdata.dbuser,
            vm.formdata.ssh,
        ].join(':');
    store = store ? JSON.parse(store) : {};
    store[k] = vm.formdata;
    localStorage.setItem('conn_his', JSON.stringify(store));
}

function showHistory() {
    initHistory();
    vm.panel.show = 'his-div';
    vm.panel.clickFunc = clickHistory;
    let a = document.getElementById('hisFilter');
    a.value = '';
    setTimeout(function () {
        a.focus();
    }, 10);
}
function initHistory(word) {
    let his = localStorage.getItem('conn_his');
    if (!his) return;
    his = JSON.parse(his);
    vm.panel.data = [];
    if (!word || !word.trim()) {
        for (let hisKey in his) vm.panel.data.push([hisKey, his[hisKey], hisKey]);
        return;
    }
    word = word.split(' ');
    for1:
    for (let hisKey in his) {
        let highKey;
        for (let i = 0; i < word.length; i++) {
            if (!word[i]) continue;
            if(hisKey.indexOf(word[i]) < 0) continue for1;
            highKey = highLightMultiWord(highKey || hisKey, word[i]);
        }
        vm.panel.data.push([highKey, his[hisKey], hisKey]);
    }
    vm.panel.selIdx = 0;
}

function clickHistory(data) {
    if ('his-div' != vm.panel.show || 'object' != typeof data[1]) {
        escPress();
        return;
    }
    for(let k in data[1]) vm.formdata[k] = data[1][k];
    escPress();
    location.hash = `${vm.formdata.host}:${vm.formdata.port}:${vm.formdata.db}`;
    sqlSetSelect(0, getSql().value.length);
    vm.hideConn();
    setTimeout(function () {
        resizeTable();
    }, 10);
}

function focusAndSelectAll(idOrDom) {
    if (typeof idOrDom === 'string') {
        idOrDom = document.getElementById(idOrDom);
    }
    // idOrDom.selectionStart = 0;
    // idOrDom.selectionEnd = idOrDom.value.length;
    idOrDom.focus();
    idOrDom.select();
    return idOrDom;
}

bindKeydown(e => {
    if (e[vm.funcAttr.funcKeyCode]) {
        switch (e.code) {
            case 'KeyD': sqlDuplicate(); break;
            case 'Slash': sqlNote(); break;
            case 'Enter': sqlNextLine(); break;
            case 'KeyW':
            case 'Backquote': ; sqlSelect(true); break;
            case 'KeyE': // windows alt+tab按键冲突
            case 'Tab': ; sqlSelect(); break;
            default: return;
        }
        e.preventDefault();
        return;
    }
    switch (e.code) {
        case 'Tab': vm.panelChooseFirst(e); return;
        case 'ArrowUp':
        case 'ArrowDown':
            if (vm.panel.show) {
                e.preventDefault();
                return;
            }
        case 'Enter':
            if (vm.panel.show && vm.panel.selIdx>=0) {
                e.preventDefault();
                return;
            }
        // case 'AltRight': hotKeyNextRoll(); break;
        case 'Escape':
        case 'ArrowLeft':
        case 'ArrowRight':
            break;
    }
    // 输入不隐藏panel
    if (e.key !== 'Shift' && 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.indexOf(e.key) < 0) {
        escPress();
    }
});
bindInput(e => {
    document.body.style.cursor = 'none';
    if (e.text.length > 1 || !isShowHotChar(e.text[0])) return;
    let sqlInfo = getSql();
    if (-1 == sqlInfo.hotStart) return;
    showHotKey(sqlInfo.hotKey, sqlInfo.cursotPos.left, sqlInfo.cursotPos.top + 18);
});

bindCursorActive((pos) => vm.funcAttr.curPos = pos);
vm.funcAttr.curPos = getCurPos();

function sqlDuplicate() {
    let sqlInfo = getSql(),
        sq = sqlInfo.value,
        sqs = sqlInfo.start,
        sqe = sqlInfo.end;
    if (sqs != sqe) {
        let sqls = [sq.substring(0, sqs), sq.substring(sqs, sqe), '', sq.substring(sqe)];
        sqls[2] = sqls[1];
        sqlSet(sqls.join(''));
        sqlSetSelect(sqe, sqe + sqls[1].length);
        return;
    }
    if (sq[sqs] == '\n') sqs -= 1;
    let endIdx = sq.indexOf('\n', sqs);
    endIdx = endIdx < 0 ? sq.length : endIdx;
    let cpStr = sq.substring(sq.lastIndexOf('\n', sqs)+1, endIdx);
    sqlSet((cpStr = [sq.substring(0, endIdx), '\n', cpStr, sq.substring(endIdx)]).join(''));
    // sqlDom.selectionStart = cpStr[0].length + 1;
    // sqlDom.selectionEnd = cpStr[0].length + cpStr[2].length + 2;
    sqlSetSelect(endIdx = cpStr[0].length + cpStr[2].length + 1, endIdx);
}

function sqlNote() {
    let sqlInfo = getSql(),
        sq = sqlInfo.value,
        sqlSel = [
            sq.lastIndexOf('\n', sqlInfo.start - 1) + 1,
            sq.indexOf('\n', sqlInfo.end)
        ],
        noteChanged = false,
        note = 0; // 3,加注释  -3,解注释  三个单位是注释字符串长度('-- ')
    sqlSel[1] = sqlSel[1] < 0 ? sq.length : sqlSel[1];
    let sqls = [
        sq.substring(0, sqlSel[0]),
        sq.substring(sqlSel[0], sqlSel[1]).split("\n"),
        sq.substring(sqlSel[1])
    ];
    for (let i = 0, strim, isNoted; i < sqls[1].length; i++) {
        if (!sqls[1][i]) continue;
        isNoted = (strim = sqls[1][i].trim()).startsWith('--');
        if (0 == note) note = isNoted ? -3 : 3;
        switch (note) {
            case 3:
                if (isNoted) continue;
                sqls[1][i] = '-- ' + sqls[1][i];
                noteChanged = true;
                break;
            case -3:
                if (!isNoted) continue;
                sqls[1][i] = sqls[1][i].replace(strim[2] == ' ' ? '-- ' : '--', '');
                noteChanged = true;
                break
        }
    }
    if (!noteChanged) return;
    sqls[1] = sqls[1].join("\n");
    sqlSet(sqls.join(''));
    // sqlDom.selectionStart = sqls[0].length;
    sqlSetSelect(note = sqls[0].length + sqls[1].length + 1, note);
}

function sqlNextLine() {
    let sqlInfo = getSql();
    let nIdx = sqlInfo.value.indexOf('\n', sqlInfo.start);
    nIdx = nIdx < 0 ? sqlInfo.value.length : nIdx;
    let sql = [sqlInfo.value.substring(0, nIdx), '\n', sqlInfo.value.substring(nIdx)];
    sqlSet(sql.join(''));
    sqlSetSelect(sql[0].length+1, sql[0].length+1);
}

function notSqlChar(c) {
    return ['\n', ' ', ';'].indexOf(c) >= 0;
}

function sqlSelectCurrent(idx, trimL, trimR) {
    let a = getSql(), start, end;
    idx = Math.min(a.value.length-1, Math.max(0, idx));
    // 光标定位到“;”号前(即selectionStart 是 “;”) || 后边没有sql的, 向前选中有效的sql
    if (a.value[idx] == ';' || !a.value.substring(idx).trim())
        while(idx > 0 && notSqlChar(a.value[idx]))
            idx = Math.max(idx-1, 0);
    start = a.value.lastIndexOf(';', idx) + 1;
    end = a.value.indexOf(';', idx);
    end = end < 0 ? a.value.length : (end + 1);
    // trim
    let sel = a.value.substring(start, end);
    if (trimL) {
        start = start + sel.length - sel.trimStart().length;
    }
    if (start != end && trimR) {
        end -= sel.length - sel.trimEnd().length;
    }
    sqlSetSelect(start, end);
    // 滚动条定位
    sqlSetScroll((a.value.substring(0, start).split('\n').length - 2)
        / a.value.split('\n').length * sqlGetScrollHeight());
}

function sqlSelect(prev) {
    let a = getSql(), idx;
    if (true === prev) {
        idx = a.start;
        while (idx >= 0 && notSqlChar(a.value[--idx])) {}
    } else {
        idx = a.end;
        while (idx < a.value.length && notSqlChar(a.value[++idx])) {}
        idx--;
    }
    sqlSelectCurrent(idx, true, true);
}

// [type, html, hotkey]
function showHotKey(input, left, top) {
    escPress();
    if (!input) { return; }
    vm.panel.data = [];
    hotKeyAddToData('terminal', input, function (panelHotkey) {
        for (let k in SQL_QUICK) panelHotkey(k);
    });
    let hotKey = JSON.parse(localStorage.getItem('db_hot_key'));
    hotKeyAddToData('', input, function (panelHotkey) {
        for (let i = 0; hotKey && i < hotKey.length; i++) panelHotkey(hotKey[i]);
    });
    if (vm.panel.data.length > 0) {
        vm.panel.show = 'hot-key-div';
        vm.panel.clickFunc = chooseHotkey;
        vm.panel.selIdx = -1;
        // 位置
        vm.panel.style.top = top + 'px';
        if ((document.querySelector('.hot-key-div').clientWidth + 10 + left) > document.body.offsetWidth) {
            vm.panel.style.left = '';
            vm.panel.style.right = '10px';
        } else {
            vm.panel.style.left = left + 'px';
            vm.panel.style.right = '';
        }
    }
}

function hotKeyAddToData(type, input, iteFunc) {
    let arr = [], arrFull = [], idx;
    iteFunc(function (hotKey) {
        if(!hotKey) return;
        if ((idx = hotKey.indexOf(input)) >= 0) {
            if(!arrFull[idx]) arrFull[idx] = [];
            arrFull[idx].push([type, highLightWord(hotKey, input), hotKey]);
        } else if (matchKey(hotKey, input)) {
            arr.push([type, highLightChar(hotKey, input), hotKey]);
        }
    });
    for (let i = 0; i < arrFull.length; i++) {
        for (let j = 0; arrFull[i] && j < arrFull[i].length; j++) {
            vm.panel.data.push(arrFull[i][j]);
        }
    }
    
    arr.sort((a, b) => a[2].length - b[2].length);
    for (let i = 0; i < arr.length; i++) {
        vm.panel.data.push(arr[i]);
    }
}

function chooseHotkey(data) {
    if ('hot-key-div' != vm.panel.show) return;
    let sqlInfo = getSql();
    let key, // 替换的字符串
        shifting = 0; // 光标偏移
    switch (data[0]) {
        case 'terminal':
            let rpStr = SQL_QUICK[data[2]]();
            key = rpStr[0].join('');
            shifting += rpStr[1] *1 || key.length;
            break;
        default:
            // 光标到前一个分号处的sql值
            let curSqlPrev = sqlInfo.value.slice(Math.max(0, sqlInfo.value.lastIndexOf(';', sqlInfo.start-1)), sqlInfo.start);
            // console.log('curSqlPrev: ' + curSqlPrev);
            key = data[2];
            // 单引号为单数不自动加空格
            if(strMatch(curSqlPrev, /'/g) % 2 === 0) {
                let next = sqlInfo.value[sqlInfo.start];
                switch(next) {
                    case ' ': break;
                    case '.':
                        // shifting += 1;
                        break;
                    default: key += ' '; break;
                }
            }
            shifting += key.length;
            break;
    }
    // 替换字符串
    sqlSet(`${sqlInfo.hotSplit[0]}${key}${sqlInfo.hotSplit[1]}`);
    // 移动光标
    sqlSetSelect(sqlInfo.hotStart + shifting, sqlInfo.hotStart + shifting);
    escPress();
}


function saveHotTable(sql) {
    if (!sql) return;
    if(sql.trim().startsWith('select')) {
        saveTableFromSelect(sql);
    }
}

function saveTableFromSelect(sql) {
    let sp, split = sql.replaceAll('\n', ' ').replaceAll('\t', ' ').split(' from '),
        tableList = (localStorage.getItem('db_table_list') || '').split(','),
        addTable = function(tb) {
            if (!tb) return;
            for (let i = 0; i < tb.length; i++) {
                if (!isTableChar(tb[i])) {
                    console.error(tb);
                    return;
                }
            }
            if (tableList.indexOf(tb) < 0) {
                tableList.push(tb);
                console.log(tb);
            }
        },
        tbSqlOk = function(str) {
            return str && '(' != str.trim().charAt(0);
        }

    for (let i = 1; i < split.length; i++) {
        if (!tbSqlOk(split[i])) continue;
        sp = split[i].split(' join ');
        if (1 == sp.length) {
            // from 后边没有join, 则只有两种
            //  1:一张表( t_a a )
            //  2:多张表( t_a a, t_b b, t_c c )
            sp = sp[0].split(',');
            for (let i2 = 0; i2 < sp.length; i2++) {
                addTable(sp[i2].split(' ')[0]);
            }
            continue;
        }
        for (let i2 = 0; i2 < sp.length; i2++) {
            if (!tbSqlOk(sp[i2])) continue;
            addTable(sp[i2].trim().split(' ')[0]);
        }
    }
    localStorage.setItem('db_table_list', tableList.join(','));
}

function showTableList(dom) {
    let rect = dom.getBoundingClientRect();
    vm.panel.show = 'table-list';
    vm.panel.clickFunc = chooseTable;
    vm.panel.style = {
        top: `${rect.top + rect.height}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`
    };
    let tableList = (localStorage.getItem('db_table_list') || '').split(',');
    let data = [];
    for (let i = 0; i < tableList.length; i++) {
        if(tableList[i] && matchKey(tableList[i], dom.value)) {
            data.push([tableList[i], highLightChar(tableList[i], dom.value)]);
        }
    }
    vm.panel.data = data;
}

function chooseTable(data) {
    vm.funcAttr.tableName = data[0];
    vm.panelReset();
    document.getElementById('tableName').focus();
}

/**
 * 匹配字符串 非连续存在也返回true
 *  例 matchKey('Hello World', 'eord') = true
 * @param str 原字符串
 * @param key 包含的关键字
 * @returns {boolean} true:匹配上了, false:未匹配上
 */
function matchKey(str, key) {
    let matchedCount = 0;
    for (let keyI = 0, ki = 0; keyI < key.length && ki < str.length; keyI++) {
        while (ki < str.length) {
            if (key[keyI] == str[ki++]) {
                matchedCount++;
                break;
            }
        }
    }
    return matchedCount == key.length;
}

function saveHotKey(sql) {
    if (!sql) { return; }
    let hotKeys = getStorageJson('db_hot_key', []);
    // {key: [统计， 下标]}
    let hotCount = getStorageJson('db_hot_key_count', {});
    let k = '', ki, kc, kcObjPrev;
    for (let i = 0; i < sql.length; i++) {
        if (isTableChar(sql[i])) {
            k += sql[i];
            continue;
        }
        if (!k || k.length < 3 || SQL_QUICK["> "+k]) { // 空和小于3个长度的字符不存为hotkey
            k = '';
            continue;
        }
        if (!hotCount[k]) { // 新词
            hotCount[k] = [1, hotKeys.length]; // [出现次数, 顺序下标]
            hotKeys.push(k);
        } else { // 旧词
            kc = ++hotCount[k][0]; // 当前词出现次数
            ki = hotCount[k][1]; // 当前词位置
            // 当前词统计 比 上一词多
            while((--ki) >= 0 && (kcObjPrev = hotCount[hotKeys[ki] ])[0] < kc) {
                // 交换数组
                hotKeys[ki+1] = hotKeys[ki];
                hotKeys[ki] = k;
                // console.log(`${hotKeys[ki+1]} ${hotKeys[ki]}`)
                // 修改统计中的下标
                hotCount[k][1]--;
                kcObjPrev[1]++;
            }
        }
        k = '';
    }
    localStorage.setItem('db_hot_key', JSON.stringify(hotKeys));
    localStorage.setItem('db_hot_key_count', JSON.stringify(hotCount));
    saveHotTable(sql);
}

function exportTable() {
    if (!vm.tb.dataAll || 0 == vm.tb.dataAll.length) {
        showTbMsg('数据为空.');
        return;
    }
    let data = [vm.tb.head];
    for (let i = 0; i < vm.tb.dataAll.length; i++) {
        data.push(vm.tb.dataAll[i]);
    }
    try {
        downloadXlsxFromArray(data, 'export.xlsx');
    } catch (e) {
        alert('数据量过大：' + e);
        throw e;
    }
}

function showTbMsg(str) {
    vm.funcAttr.showSql = str;
}

/**
 * 计算字符宽度
 * @param str
 * @returns {number} of px
 */
function calcStrWidth(str) {
    if (!str) {return 4;}
    let w = 0;
    for (let i = 0; i < str.length; i++) {
        w += str.charCodeAt(i) < 128 ? 1 : 2;
    }
    return w * 10;
}

/**
 * 高亮字符
 * @param str 要高亮对的词
 * @param word 高亮那些字符
 */
function highLightWord(str, word) {
    if (!str || !word) return str;
    return str.replaceAll(word, `<span class="high-light">${word}</span>`);
}

function highLightMultiWord(str, word) {
    if (!str || !word) return str;
    let div = document.createElement('div');
    div.innerHTML = str;
    let htmlArr = [];
    div.childNodes.forEach(nd => htmlArr.push(nd.tagName ? nd.outerHTML :
        nd.textContent.replaceAll(word, `<span class="high-light">${word}</span>`)))
    return htmlArr.join('');
}

function highLightChar(str, word) {
    if (!str || !word) {
        return str;
    }
    str = str.split('');
    for (let i = 0, j = 0; i < str.length; i++) {
        if (str[i] == word[j]) {
            str[i] = `<span class="high-light">${str[i]}</span>`;
            j++;
        }
    }
    return str.join('');
}

// 导出缓存
function cacheExport() {
    const a = {};
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            a[key] = localStorage[key];
        }
    }
    let b = JSON.stringify(a);
    downText(b, `cache-${new Date().getTime()}.json`);
}

function cacheImport() {
    fileGetText(content => {
        try {
            let a = JSON.parse(content);
            for (const key in a) {
                localStorage[key] = a[key];
            }
            alert("导入完成");
        } catch (e) {
            alert(e);
        }
    });
}

function test() {
    let kkk = [];
    // [统计， 下标]
    let hotCount = JSON.parse(localStorage.db_hot_key_count);
    for( let k in hotCount) kkk[hotCount[k][1]] = k;


    localStorage.setItem('db_hot_key', JSON.stringify(kkk));
}