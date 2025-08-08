package prv.liuyao.bsutils.config.resolver;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.RemovalListener;
import com.google.common.cache.RemovalNotification;
import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.FileUpload;
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.ProgressListener;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.commons.CommonsMultipartResolver;

import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * @CommonsMultipartResolver: 文件上传解析器
 * @ProgressListener 文件上传监听器
 * @author: liuyao
 * @date: 2021/10/17
 *
 * 可由前端实现
 *  $.ajax({
 *             xhr : function () {
 *                 //取得xmlhttp异步监听
 *                 var xhr = $.ajaxSettings.xhr();
 *                 if(xhr.upload) {
 *                     xhr.upload.addEventListener('progress' , function (evt) {
 *                         console.log(evt);
 *                     }, false);
 *                     return xhr;
 *                 }
 *             },
 *  })
 */
// @Component
public class FileUploadResolver extends CommonsMultipartResolver implements ProgressListener {

    /**
     *      使用`CacheBuilder`构建的缓存不会“自动”执行清理和逐出值，也不会在值到期后立即执行或逐出任何类型。
     *  相反，它在写入操作期间执行少量维护，或者在写入很少的情况下偶尔执行读取操作。
     *      它并没有通过在后台起一个线程，不停去轮询。在get时判断是否过期。如果一直不访问，可能存在内存泄漏问题。
     */
    private static final Cache<String, FileUploadResolver> CACHE = CacheBuilder.newBuilder()
            .expireAfterAccess(5, TimeUnit.MINUTES)
            .removalListener(new RemovalListener<String, FileUploadResolver>() {
                @Override
                public void onRemoval(RemovalNotification<String, FileUploadResolver> notification) {
                    System.out.println("FileUploadResolver.CACHE.delete: " + notification.getKey());
                    CACHE.cleanUp();
                }
            }).build();

    // nginx 会先接收全量文件 再推送给服务, 可能造成 此方法调用 早于 添加缓存 操作
    public static FileUploadResolver getCache(String key) {
        FileUploadResolver ifPresent = CACHE.getIfPresent(key);
        long t = System.currentTimeMillis();
        while (null == ifPresent && System.currentTimeMillis() - t < 5000) {
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                break;
            }
            System.out.println("重新拿CACHE: " + key);
            ifPresent = CACHE.getIfPresent(key);
        }
        return ifPresent;
    }

    public static void invalidateCache(String key) {
        CACHE.invalidate(key);
    }

    public FileUploadResolver() {
        super();
    }

    public FileUploadResolver(ServletContext servletContext) {
        super(servletContext);
    }

    @Override
    protected MultipartParsingResult parseRequest(HttpServletRequest request) throws MultipartException {
        String encoding = this.determineEncoding(request);
        FileUpload fileUpload = this.prepareFileUpload(encoding);
        String uuid = request.getParameter("id");
        if (null == uuid || uuid.isEmpty()) {
            uuid = UUID.randomUUID().toString();
        }
        FileUploadResolver resolver = new FileUploadResolver(uuid);
        fileUpload.setProgressListener(resolver); // 此行需要早于 parseRequest 才可实现监听
        CACHE.put(uuid, resolver);
        System.out.println("FileUploadResolver.CACHE.add: " + uuid);
        try {
            List<FileItem> fileItems = ((ServletFileUpload) fileUpload).parseRequest(request);
            return this.parseFileItems(fileItems, encoding);
        } catch (FileUploadException e) {
            throw new MultipartException("Failed to parse multipart servlet request", e);
        }
    }

    // ------------------ ProgressListener ------------------

    /**
     * 计算上传文件进度
     *
     * @param pBytesRead     到目前为止读取文件的比特数
     * @param pContentLength 文件总大小
     * @param pItems         目前正在读取第几个文件
     */
    @Override
    public void update(long pBytesRead, long pContentLength, int pItems) {
        // 上传的文件长度、文件个数不能为0
        if (pContentLength == 0 || pItems == 0) {
            return;
        }
        // 百分比率
        this.progress = (int) (pBytesRead * 100.0 / pContentLength) + "%";
    }

    private String id;
    private String filename;
    private byte[] content;
    private boolean finished = false;
    private String progress;

    public FileUploadResolver(String id) {
        this.id = id;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public byte[] getContent() {
        return content;
    }

    public void setContent(byte[] content) {
        this.content = content;
    }

    public boolean isFinished() {
        return finished;
    }

    public void setFinished(boolean finished) {
        this.finished = finished;
    }

    public String getProgress() {
        return progress;
    }

    public void setProgress(String progress) {
        this.progress = progress;
    }

}