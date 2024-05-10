const path = Global.apiPath;
const filePath = location.hash.substring(1);
let readPos = 0, reading = false, readPre = '', readLineNo = 1;

document.addEventListener("wheel", function(event) {
    // 滚轮事件处理代码
    if (event.deltaY > 0) {
        console.log('up');
        // 向下滚动
    } else {
        console.log('down');
        // 向上滚动
    }
});

/**
 * 获得文本
 * @param autoNextLen 自动获得次数
 *      <0: 自动获得, 直到超出屏幕底部停止
 *      >0: 自动获得次数, 跟超出屏幕无关
 */
function nextText(autoNextLen) {
    if (readPos == -1) return;
    reading = true;
    doHttp({
        method: 'get',
        url: `${path}/fs/textGet?position=${readPos}&size=2048&path=${encodeURIComponent(filePath)}`,
        success(res) {
            res = JSON.parse(res);
            let ele = '', lines = (readPre + res.data).split('\n');
            readPre = res.data.endsWith('\n') ? '' : lines.pop();
            if (true === res.last) {
                readPos = -1;
                lines.push('', '', '到底了...');
            } else {
                readPos = res.position;
            }
            lines.forEach(line => {
                let dom = document.createElement('tr');
                // dom.innerHTML = ;
                ele += `<tr>
                    <td class="text_no">${res.code != 200 ? `-${res.code}` : readLineNo++}</td>
                    <td class="text_auto_wrap">${line}</td>
                    </tr>`;
            });
            document.getElementById('text').innerHTML += ele;
            reading = false;
            console.log(autoNextLen)
            if ((canGetText() && autoNextLen < 0) || autoNextLen > 0) nextText(--autoNextLen);
        }
    })
}

function canGetText() {
    // 当滚动到底部时，加载更多内容： 获取滚动条的位置+获取窗口的高度>=获取文档的总高度
    return readPos !== -1 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight;
}


switch (location.search.substring(1)) {
    case FS_TYPE.IMAGE:
        document.body.innerHTML = `<img src="${path}/fs/mediaPlay?path=${encodeURIComponent(filePath)}">`;
        break;
    case FS_TYPE.VIDEO:
        document.body.innerHTML = `<video width="100%" height="100%" controls>
            <source type="video/mp4" src="${path}/fs/mediaPlay?path=${encodeURIComponent(filePath)}">
            </video>`;
        break;
    case FS_TYPE.TEXT:
        document.body.innerHTML = `<table><tbody id="text"></tbody></table>`;
        nextText(-1);
        window.addEventListener("scroll", e => {if (canGetText()) nextText(2);});
        break;
    default:;
}
