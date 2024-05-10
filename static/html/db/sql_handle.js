let editor;

function sqlInit() {
    editor = CodeMirror.fromTextArea(document.getElementById('sql'), {
        mode: 'text/x-sql',
        indentWithTabs: true,
        smartIndent: true,
        lineNumbers: true,
        lineWrapping: true, // 启用自动换行
        matchBrackets: true,
        autofocus: true
    });
    sqlSet(sessionStorage.sql || '');
    window.onbeforeunload = ev => {
        sessionStorage.sql = getSql().value || '';
    }
    sqlFocus();
}

function bindInput(cb) {
    editor.on('inputRead', (cm, e) => {
        cb(e);
    })
}
function bindKeydown(cb) {
    editor.on('keydown', (cm, e) => {
        cb(e);
    });
}

function bindCursorActive(cb) {
    editor.on("cursorActivity", function() {
        cb(getCurPos());
    });
}

function getCurPos() {
    // 获得光标所在字数
    var position = editor.indexFromPos(editor.getCursor());
    // 总计字数
    var total = editor.getValue().length;
    return [position, total];
}

/**
 *
 * @returns {*[selectStart, selectEnd, full_sql_value]}
 */
function getSql() {
    let res =  {
        start: sqlGetCursorIdx('start'),
        end: sqlGetCursorIdx('end'),
        value: editor.getValue(),
        select: editor.getSelection(),
        cursotPos: editor.cursorCoords(),
        hotStart: '',// 光标向前 最后一个词的首个字符下标
        hotKey: '',
        hotSplit: []
    };
    let sql1 = res.value.slice(0, res.start);
    let idx = sql1.length;
    while ((--idx) >= 0 && isShowHotChar(sql1[idx])) {}
    if (!isShowHotChar(sql1[++idx])) idx = -1; // 数字开头
    res.hotStart = idx; // 光标向前 最后一个词的首个字符下标
    res.hotKey = sql1.slice(idx);
    res.hotSplit.push(res.value.slice(0, idx));
    res.hotSplit.push(res.value.slice(res.start));
    return res;
}

function sqlSet(sql) {
    editor.setValue(sql);
}

function sqlSetSelect(start, end) {
    editor.setSelection(editor.posFromIndex(start), editor.posFromIndex(end));
}

function sqlFocus() {
    editor.focus();
}

/**
 * 获得光标下标
 * @param type start or end
 */
function sqlGetCursorIdx(type) {
    return editor.indexFromPos(editor.getCursor(type));
}

function sqlGetScrollHeight() {
    return editor.getScrollInfo().height;
}

function sqlSetScroll(y) {
    return editor.scrollTo(0, y);
}

function isShowHotChar(c) {
    return  ['>', '='].indexOf(c) >= 0 || isEnglishNum(c);
}

function isEnglishNum(c) {
    if (!c) return false;
    let c0 = c.charCodeAt(0);
    return '_' == c
        || (c0 >= 65 && c0 <= 90) // A~Z
        || (c0 >= 97 && c0 <= 122) // a~z
        || (c0 >= 48 && c <= 57) // 0~9
        ;
}




/*
手册： https://codemirror.net/5/doc/manual.html#events
 */

/**
 * 插入sql
 * @param str 要替换为的字符
 * @param start 开始下标: 不传 || 错传 == 当前下标
 * @param end 结束下标: 不传 || 错传 || <start == 当前下标
 */
function sqlReplace(str, start, end) {
    let sql = editor.getValue();
    start = (start && start >= 0 && start < sql.length) ? start : sqlGetCursorIdx('start');
    end = (end && end >=0 && end < sql.length & end >= start) ? end : sqlGetCursorIdx('start');
    editor.setValue(sql.substring(0, start) + str + sql.substring(end));
}
function tgest() {
    editor.getCursor('end');
}
